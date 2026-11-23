use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::webview::{NewWindowResponse, WebviewBuilder};
use tauri::{AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, WebviewUrl};
use url::Url;

const DEFAULT_SIDEBAR_WIDTH: f64 = 248.0;
const TITLEBAR_HEIGHT: f64 = 38.0;
const SPLIT_DIVIDER_WIDTH: f64 = 6.0;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UnreadChangedPayload {
    pub service_id: String,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkSafetyPayload {
    pub url: String,
    pub host: String,
    pub service_id: String,
    pub reasons: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadItemPayload {
    pub id: String,
    pub service_id: String,
    pub file_name: String,
    pub file_path: String,
    pub received_bytes: i64,
    pub total_bytes: i64,
    pub state: String, // "inProgress" | "completed" | "interrupted"
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionDiskUsage {
    pub service_id: String,
    pub total_bytes: u64,
    pub cache_bytes: u64,
}

#[derive(Debug)]
struct ActiveWebviewEntry {
    label: String,
    last_active: Instant,
    muted: bool,
}

#[derive(Debug)]
struct ManagerInner {
    active_webviews: HashMap<String, ActiveWebviewEntry>,
    current_service_id: Option<String>,
    secondary_service_id: Option<String>,
    never_sleep_ids: HashSet<String>,
    sidebar_width: f64,
    right_drawer_width: f64,
    split_ratio: f64,
    content_hidden: bool,
    hibernation_timeout_minutes: u64,
    auto_lock_minutes: u64,
    has_pin: bool,
    focus_mode: bool,
    link_safety_guard: bool,
    ask_before_external_link: bool,
    global_hotkey_enabled: bool,
    call_mode_service_id: Option<String>,
}

pub struct WebviewManagerState {
    inner: Mutex<ManagerInner>,
}

impl WebviewManagerState {
    pub fn new(
        sidebar_width: f64,
        split_ratio: f64,
        hibernation_timeout_minutes: u64,
        auto_lock_minutes: u64,
        has_pin: bool,
        focus_mode: bool,
        link_safety_guard: bool,
        ask_before_external_link: bool,
        global_hotkey_enabled: bool,
        never_sleep_ids: HashSet<String>,
    ) -> Self {
        Self {
            inner: Mutex::new(ManagerInner {
                active_webviews: HashMap::new(),
                current_service_id: None,
                secondary_service_id: None,
                never_sleep_ids,
                sidebar_width,
                right_drawer_width: 0.0,
                split_ratio: split_ratio.clamp(0.2, 0.8),
                content_hidden: false,
                hibernation_timeout_minutes,
                auto_lock_minutes,
                has_pin,
                focus_mode,
                link_safety_guard,
                ask_before_external_link,
                global_hotkey_enabled,
                call_mode_service_id: None,
            }),
        }
    }
}

impl Default for WebviewManagerState {
    fn default() -> Self {
        Self::new(
            DEFAULT_SIDEBAR_WIDTH,
            0.5,
            10,
            0,
            false,
            false,
            true,
            true,
            true,
            HashSet::new(),
        )
    }
}

/// Sanitize a service ID so it is safe for both Webview labels and filesystem paths.
fn sanitize_id(service_id: &str) -> Result<String, String> {
    let clean: String = service_id
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
        .collect();
    if clean.is_empty() || clean != service_id {
        return Err("Invalid service ID: must be non-empty alphanumeric, '-' or '_'".to_string());
    }
    Ok(clean)
}

fn webview_label(service_id: &str) -> String {
    format!("service-{service_id}")
}

fn session_directory(app: &AppHandle, service_id: &str) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to resolve app_local_data_dir: {e}"))?;
    let dir = base.join("sessions").join(service_id);
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create session directory: {e}"))?;
    Ok(dir)
}

/// Extract registrable base domain (e.g., "web.whatsapp.com" -> "whatsapp.com").
fn base_domain(host: &str) -> String {
    let parts: Vec<&str> = host.split('.').collect();
    if parts.len() >= 2 {
        format!("{}.{}", parts[parts.len() - 2], parts[parts.len() - 1])
    } else {
        host.to_string()
    }
}

fn is_oauth_url(url: &Url) -> bool {
    let Some(host) = url.host_str() else {
        return false;
    };
    let host_lower = host.to_ascii_lowercase();
    let oauth_hosts = [
        "accounts.google.com",
        "accounts.youtube.com",
        "login.microsoftonline.com",
        "login.live.com",
        "appleid.apple.com",
        "auth.openai.com",
        "github.com",
        "oauth.telegram.org",
        "discord.com",
        "slack.com",
        "facebook.com",
    ];
    if oauth_hosts
        .iter()
        .any(|h| host_lower == *h || host_lower.ends_with(&format!(".{h}")))
    {
        // For multi-purpose domains, only treat as OAuth/login if path looks like auth/login/oauth
        if host_lower == "github.com"
            || host_lower == "discord.com"
            || host_lower == "slack.com"
            || host_lower == "facebook.com"
            || host_lower.ends_with(".facebook.com")
        {
            let path = url.path().to_ascii_lowercase();
            return path.contains("login")
                || path.contains("oauth")
                || path.contains("authorize")
                || path.contains("checkpoint")
                || path.contains("two_factor")
                || path.contains("dialog");
        }
        return true;
    }

    host_lower.contains("auth0.com")
        || host_lower.contains("okta.com")
        || host_lower.starts_with("accounts.")
        || host_lower.starts_with("login.")
        || host_lower.starts_with("oauth.")
        || host_lower.starts_with("sso.")
        || host_lower.starts_with("auth.")
}

fn is_companion_domain(service_base: &str, target_base: &str) -> bool {
    match service_base {
        "messenger.com" | "instagram.com" | "facebook.com" => {
            matches!(
                target_base,
                "facebook.com" | "fb.com" | "meta.com" | "fbcdn.net" | "fbsbx.com" | "messenger.com"
            )
        }
        "microsoft.com" | "live.com" => {
            matches!(
                target_base,
                "live.com"
                    | "microsoft.com"
                    | "microsoftonline.com"
                    | "office.com"
                    | "skype.com"
                    | "sharepoint.com"
            )
        }
        "slack.com" => matches!(target_base, "slack-edge.com" | "slack-files.com"),
        "google.com" => matches!(target_base, "googleusercontent.com" | "gstatic.com"),
        "proton.me" => matches!(target_base, "protonmail.com"),
        "yahoo.com" => matches!(target_base, "yahoo.net" | "oath.com" | "yimg.com"),
        "tuta.com" => matches!(target_base, "tutanota.com"),
        "x.com" => matches!(target_base, "twitter.com" | "twimg.com"),
        "reddit.com" => matches!(target_base, "redditmedia.com" | "redd.it"),
        "webex.com" => matches!(target_base, "wbx2.com" | "cisco.com"),
        "element.io" => matches!(target_base, "matrix.org"),
        "qq.com" => matches!(target_base, "wechat.com"),
        "zoom.us" => matches!(target_base, "zoom.com"),
        "chatgpt.com" => matches!(target_base, "openai.com" | "oaiusercontent.com"),
        "discord.com" => matches!(target_base, "discordapp.com" | "discordapp.net"),
        "whatsapp.com" => matches!(target_base, "whatsapp.net"),
        _ => false,
    }
}

fn is_redirect_shim(url: &Url) -> bool {
    let Some(host) = url.host_str() else {
        return false;
    };
    let h = host.to_ascii_lowercase();
    h == "l.messenger.com"
        || h == "l.facebook.com"
        || h == "lm.facebook.com"
        || h == "l.instagram.com"
        || (h.ends_with("google.com") && url.path() == "/url")
}

/// Unwrap Meta/Google outbound link shims (e.g. l.messenger.com/l.php?u=https://youtu.be/...)
/// so the user sees and opens the real destination URL.
fn unwrap_outbound_url(url: &Url) -> Url {
    if is_redirect_shim(url) {
        for (k, v) in url.query_pairs() {
            if (k == "u" || k == "q" || k == "url") && (v.starts_with("http://") || v.starts_with("https://")) {
                if let Ok(inner) = Url::parse(&v) {
                    return inner;
                }
            }
        }
    }
    url.clone()
}

fn is_allowed_navigation(service_base_domain: &str, target: &Url) -> bool {
    match target.scheme() {
        "about" | "blob" | "data" => return true,
        "http" | "https" => {}
        _ => return false,
    }

    if is_redirect_shim(target) {
        return false;
    }

    let Some(host) = target.host_str() else {
        return false;
    };
    let target_base = base_domain(&host.to_ascii_lowercase());
    target_base == service_base_domain
        || is_companion_domain(service_base_domain, &target_base)
        || is_oauth_url(target)
}

fn check_suspicious_url(url: &Url) -> Vec<String> {
    let mut reasons = Vec::new();
    if url.scheme() == "http" {
        reasons.push("Unencrypted HTTP link (not HTTPS)".to_string());
    }
    if !url.username().is_empty() {
        reasons.push("Contains embedded @ user-info (common phishing trick)".to_string());
    }
    if let Some(host) = url.host_str() {
        let lower = host.to_ascii_lowercase();
        if lower.contains("xn--") {
            reasons.push("Punycode / internationalized domain (verify spelling)".to_string());
        }
        if lower.parse::<std::net::IpAddr>().is_ok() {
            reasons.push("Direct IP address instead of a domain name".to_string());
        }
        let shorteners = [
            "bit.ly",
            "tinyurl.com",
            "t.co",
            "goo.gl",
            "ow.ly",
            "is.gd",
            "buff.ly",
            "cutt.ly",
            "rb.gy",
            "shorturl.at",
            "rebrand.ly",
            "tiny.cc",
        ];
        if shorteners
            .iter()
            .any(|s| lower == *s || lower.ends_with(&format!(".{s}")))
        {
            reasons.push("Shortened URL (destination hidden)".to_string());
        }
    }
    reasons
}

/// Open an external http(s) URL in the user's default system browser reliably across Windows, macOS & Linux.
pub fn open_url_in_browser(url_str: &str) -> Result<(), String> {
    let parsed = Url::parse(url_str).map_err(|e| format!("Invalid URL: {e}"))?;
    if !matches!(parsed.scheme(), "http" | "https") {
        return Err("Only http and https URLs can be opened".to_string());
    }
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        std::process::Command::new("cmd")
            .args(["/C", "start", "", parsed.as_str()])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Failed to launch browser: {e}"))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(parsed.as_str())
            .spawn()
            .map_err(|e| format!("Failed to launch browser: {e}"))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(parsed.as_str())
            .spawn()
            .map_err(|e| format!("Failed to launch browser: {e}"))?;
    }
    Ok(())
}

fn open_in_system_browser(app: &AppHandle, service_id: &str, raw_url: &Url) {
    let url = unwrap_outbound_url(raw_url);
    if !matches!(url.scheme(), "http" | "https") {
        return;
    }

    let (guard_enabled, ask_always) = app
        .try_state::<WebviewManagerState>()
        .and_then(|s| {
            s.inner
                .lock()
                .ok()
                .map(|i| (i.link_safety_guard, i.ask_before_external_link))
        })
        .unwrap_or((true, true));

    let reasons = if guard_enabled {
        check_suspicious_url(&url)
    } else {
        Vec::new()
    };

    if ask_always || !reasons.is_empty() {
        let host = url.host_str().unwrap_or("unknown").to_string();
        let _ = app.emit(
            "link-safety-prompt",
            LinkSafetyPayload {
                url: url.as_str().to_string(),
                host,
                service_id: service_id.to_string(),
                reasons,
            },
        );
        return;
    }

    let _ = open_url_in_browser(url.as_str());
}

/// Parse unread count from page `<title>` patterns like "(3) WhatsApp", "Slack (5)", or "• Messenger".
fn parse_unread_from_title(title: &str) -> usize {
    let bytes = title.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'(' || bytes[i] == b'[' {
            let close = if bytes[i] == b'(' { b')' } else { b']' };
            let start = i + 1;
            let mut end = start;
            while end < bytes.len() && bytes[end].is_ascii_digit() {
                end += 1;
            }
            if end > start && end < bytes.len() && bytes[end] == close {
                if let Ok(num) = title[start..end].parse::<usize>() {
                    return num;
                }
            }
        }
        i += 1;
    }

    let trimmed = title.trim_start();
    if trimmed.starts_with('•')
        || trimmed.starts_with('●')
        || trimmed.starts_with("* ")
        || trimmed.starts_with("(*) ")
    {
        return 1;
    }

    let lower = title.to_ascii_lowercase();
    if lower.contains("sent a message")
        || lower.contains("messaged you")
        || lower.contains("изпрати съобщение")
        || lower.contains("ново съобщение")
        || lower.contains("new message")
    {
        return 1;
    }

    0
}

fn compute_content_bounds(
    app: &AppHandle,
    sidebar_width: f64,
    right_drawer_width: f64,
) -> Result<(LogicalPosition<f64>, LogicalSize<f64>), String> {
    let main_window = app
        .get_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;
    let scale = main_window.scale_factor().unwrap_or(1.0);
    let inner_size = main_window
        .inner_size()
        .map_err(|e| format!("Failed to read window size: {e}"))?;
    let logical_w = (inner_size.width as f64) / scale;
    let logical_h = (inner_size.height as f64) / scale;
    let content_w = (logical_w - sidebar_width - right_drawer_width).max(100.0);
    let content_h = (logical_h - TITLEBAR_HEIGHT).max(100.0);
    Ok((
        LogicalPosition::new(sidebar_width, TITLEBAR_HEIGHT),
        LogicalSize::new(content_w, content_h),
    ))
}

fn compute_split_bounds(
    app: &AppHandle,
    sidebar_width: f64,
    right_drawer_width: f64,
    split_ratio: f64,
    has_split: bool,
) -> Result<(LogicalPosition<f64>, LogicalSize<f64>, LogicalPosition<f64>, LogicalSize<f64>), String> {
    let (full_pos, full_size) = compute_content_bounds(app, sidebar_width, right_drawer_width)?;
    if !has_split {
        return Ok((full_pos, full_size, full_pos, full_size));
    }
    let ratio = split_ratio.clamp(0.2, 0.8);
    let usable_w = (full_size.width - SPLIT_DIVIDER_WIDTH).max(200.0);
    let left_w = (usable_w * ratio).round();
    let right_w = (usable_w - left_w).max(100.0);
    let left_pos = full_pos;
    let left_size = LogicalSize::new(left_w, full_size.height);
    let right_pos = LogicalPosition::new(sidebar_width + left_w + SPLIT_DIVIDER_WIDTH, TITLEBAR_HEIGHT);
    let right_size = LogicalSize::new(right_w, full_size.height);
    Ok((left_pos, left_size, right_pos, right_size))
}

fn ensure_service_webview(
    app: &AppHandle,
    state: &WebviewManagerState,
    clean_id: &str,
    url_str: &str,
    pos: LogicalPosition<f64>,
    size: LogicalSize<f64>,
    content_hidden: bool,
    focus_mode: bool,
) -> Result<(), String> {
    let parsed_url = Url::parse(url_str).map_err(|e| format!("Invalid service URL: {e}"))?;
    if !matches!(parsed_url.scheme(), "http" | "https") {
        return Err("Service URL must use http or https".to_string());
    }

    let label = webview_label(clean_id);
    let already_exists = {
        let inner = state.inner.lock().map_err(|_| "State lock poisoned")?;
        inner.active_webviews.contains_key(clean_id)
    };

    if already_exists {
        if let Some(wv) = app.get_webview(&label) {
            set_webview_low_memory(&wv, false);
            let _ = wv.set_position(pos);
            let _ = wv.set_size(size);
            if !content_hidden {
                let _ = wv.show();
            }
        }
    } else {
        let main_window = app
            .get_window("main")
            .ok_or_else(|| "Main window not found".to_string())?;
        let session_dir = session_directory(app, clean_id)?;
        let service_domain = parsed_url
            .host_str()
            .map(|h| base_domain(&h.to_ascii_lowercase()))
            .unwrap_or_default();

        let nav_app = app.clone();
        let nav_domain = service_domain.clone();
        let nav_sid = clean_id.to_string();
        let popup_app = app.clone();
        let popup_domain = service_domain;
        let popup_sid = clean_id.to_string();
        let title_app = app.clone();
        let title_service_id = clean_id.to_string();

        // Intentionally do NOT attach an IPC handler: child webviews have zero access to Tauri commands.
        // Disable Tauri's drag-drop interceptor so native HTML5 file drag-and-drop works inside chats.
        // Initialization script routes target="_blank" / Meta shim links cleanly through on_navigation
        // so WebView2 never swallows them into an about:blank popup.
        let link_shim_script = r#"
            (function() {
                function isExternalOrShim(href) {
                    if (!href || (!href.startsWith('http://') && !href.startsWith('https://'))) return false;
                    try {
                        var u = new URL(href);
                        var h = u.hostname.toLowerCase();
                        if (h === 'l.messenger.com' || h === 'l.facebook.com' || h === 'lm.facebook.com' || h === 'l.instagram.com') return true;
                        return h !== location.hostname.toLowerCase() && !h.endsWith('.' + location.hostname.toLowerCase());
                    } catch (_) {
                        return false;
                    }
                }
                document.addEventListener('click', function(e) {
                    var el = e.target;
                    while (el && el.tagName !== 'A') el = el.parentElement;
                    if (!el || !el.href) return;
                    if (el.target === '_blank' || isExternalOrShim(el.href)) {
                        e.preventDefault();
                        e.stopPropagation();
                        window.location.assign(el.href);
                    }
                }, true);
            })();
        "#;

        let builder = WebviewBuilder::new(&label, WebviewUrl::External(parsed_url))
            .data_directory(session_dir)
            .disable_drag_drop_handler()
            .initialization_script(link_shim_script)
            .on_document_title_changed(move |_wv, title| {
                let count = parse_unread_from_title(&title);
                let _ = title_app.emit(
                    "service-unread-changed",
                    UnreadChangedPayload {
                        service_id: title_service_id.clone(),
                        count,
                    },
                );
            })
            .on_navigation(move |target_url| {
                if is_allowed_navigation(&nav_domain, &target_url) {
                    true
                } else {
                    open_in_system_browser(&nav_app, &nav_sid, &target_url);
                    false
                }
            })
            .on_new_window(move |target_url, _features| {
                println!("[Molva] on_new_window: {}", target_url.as_str());
                if is_redirect_shim(&target_url) {
                    open_in_system_browser(&popup_app, &popup_sid, &target_url);
                    return NewWindowResponse::Deny;
                }
                let target_base = target_url
                    .host_str()
                    .map(|h| base_domain(&h.to_ascii_lowercase()))
                    .unwrap_or_default();
                if is_oauth_url(&target_url)
                    || target_base == popup_domain
                    || is_companion_domain(&popup_domain, &target_base)
                {
                    NewWindowResponse::Allow
                } else {
                    open_in_system_browser(&popup_app, &popup_sid, &target_url);
                    NewWindowResponse::Deny
                }
            });

        let child = main_window
            .add_child(builder, pos, size)
            .map_err(|e| format!("Failed to create child webview: {e}"))?;

        configure_webview_hooks(&child, app.clone(), clean_id.to_string());

        if focus_mode {
            apply_mute(&child, true);
        }

        if content_hidden {
            let _ = child.hide();
        }
    }

    let mut inner = state.inner.lock().map_err(|_| "State lock poisoned")?;
    let existing_muted = inner
        .active_webviews
        .get(clean_id)
        .map(|e| e.muted)
        .unwrap_or(false);
    inner.active_webviews.insert(
        clean_id.to_string(),
        ActiveWebviewEntry {
            label,
            last_active: Instant::now(),
            muted: existing_muted,
        },
    );
    Ok(())
}

pub fn activate_service(
    app: &AppHandle,
    state: &WebviewManagerState,
    service_id: &str,
    url_str: &str,
    sidebar_width: Option<f64>,
) -> Result<(), String> {
    let clean_id = sanitize_id(service_id)?;

    let (sw, rw, split_ratio, content_hidden, focus_mode, prev_id, secondary_id) = {
        let mut inner = state.inner.lock().map_err(|_| "State lock poisoned")?;
        if let Some(w) = sidebar_width {
            inner.sidebar_width = w;
        }
        let prev = inner.current_service_id.clone();
        let sec = inner.secondary_service_id.clone();
        (
            inner.sidebar_width,
            inner.right_drawer_width,
            inner.split_ratio,
            inner.content_hidden,
            inner.focus_mode,
            prev,
            sec,
        )
    };

    // If the user activates the service currently in the right split pane, keep split only if different
    let active_split = secondary_id.as_deref() != Some(clean_id.as_str()) && secondary_id.is_some();

    // Hide and suspend previously active primary child webview (unless it's in the right split pane)
    if let Some(prev) = prev_id {
        if prev != clean_id && secondary_id.as_deref() != Some(prev.as_str()) {
            if let Some(prev_wv) = app.get_webview(&webview_label(&prev)) {
                let _ = prev_wv.hide();
                set_webview_low_memory(&prev_wv, true);
            }
        }
    }

    let (left_pos, left_size, right_pos, right_size) =
        compute_split_bounds(app, sw, rw, split_ratio, active_split)?;

    ensure_service_webview(
        app,
        state,
        &clean_id,
        url_str,
        left_pos,
        left_size,
        content_hidden,
        focus_mode,
    )?;

    if !content_hidden {
        if let Some(wv) = app.get_webview(&webview_label(&clean_id)) {
            let _ = wv.set_focus();
        }
    }

    if active_split {
        if let Some(ref sec_id) = secondary_id {
            if let Some(sec_wv) = app.get_webview(&webview_label(sec_id)) {
                let _ = sec_wv.set_position(right_pos);
                let _ = sec_wv.set_size(right_size);
                if !content_hidden {
                    let _ = sec_wv.show();
                }
            }
        }
    }

    let mut inner = state.inner.lock().map_err(|_| "State lock poisoned")?;
    inner.current_service_id = Some(clean_id.clone());
    if !active_split && inner.secondary_service_id.as_deref() == Some(clean_id.as_str()) {
        inner.secondary_service_id = None;
    }

    Ok(())
}

pub fn open_split_view(
    app: &AppHandle,
    state: &WebviewManagerState,
    service_id: &str,
    url_str: &str,
) -> Result<(), String> {
    let clean_id = sanitize_id(service_id)?;

    let (sw, rw, split_ratio, content_hidden, focus_mode, primary_id, prev_sec) = {
        let inner = state.inner.lock().map_err(|_| "State lock poisoned")?;
        (
            inner.sidebar_width,
            inner.right_drawer_width,
            inner.split_ratio,
            inner.content_hidden,
            inner.focus_mode,
            inner.current_service_id.clone(),
            inner.secondary_service_id.clone(),
        )
    };

    if primary_id.as_deref() == Some(clean_id.as_str()) {
        return Err("Service is already open in the primary pane".to_string());
    }

    if let Some(prev) = prev_sec {
        if prev != clean_id && primary_id.as_deref() != Some(prev.as_str()) {
            if let Some(wv) = app.get_webview(&webview_label(&prev)) {
                let _ = wv.hide();
                set_webview_low_memory(&wv, true);
            }
        }
    }

    let (left_pos, left_size, right_pos, right_size) =
        compute_split_bounds(app, sw, rw, split_ratio, true)?;

    if let Some(ref prim) = primary_id {
        if let Some(prim_wv) = app.get_webview(&webview_label(prim)) {
            let _ = prim_wv.set_position(left_pos);
            let _ = prim_wv.set_size(left_size);
            if !content_hidden {
                let _ = prim_wv.show();
            }
        }
    }

    ensure_service_webview(
        app,
        state,
        &clean_id,
        url_str,
        right_pos,
        right_size,
        content_hidden,
        focus_mode,
    )?;

    let mut inner = state.inner.lock().map_err(|_| "State lock poisoned")?;
    inner.secondary_service_id = Some(clean_id);
    Ok(())
}

pub fn close_split_view(app: &AppHandle, state: &WebviewManagerState) -> Result<(), String> {
    let (sw, rw, content_hidden, primary_id, sec_id) = {
        let mut inner = state.inner.lock().map_err(|_| "State lock poisoned")?;
        let sec = inner.secondary_service_id.take();
        (
            inner.sidebar_width,
            inner.right_drawer_width,
            inner.content_hidden,
            inner.current_service_id.clone(),
            sec,
        )
    };

    if let Some(sec) = sec_id {
        if primary_id.as_deref() != Some(sec.as_str()) {
            if let Some(wv) = app.get_webview(&webview_label(&sec)) {
                let _ = wv.hide();
                set_webview_low_memory(&wv, true);
            }
        }
    }

    let (full_pos, full_size) = compute_content_bounds(app, sw, rw)?;
    if let Some(prim) = primary_id {
        if let Some(wv) = app.get_webview(&webview_label(&prim)) {
            let _ = wv.set_position(full_pos);
            let _ = wv.set_size(full_size);
            if !content_hidden {
                let _ = wv.show();
            }
        }
    }
    Ok(())
}

pub fn reload_service(
    app: &AppHandle,
    state: &WebviewManagerState,
    service_id: &str,
) -> Result<(), String> {
    let clean_id = sanitize_id(service_id)?;
    let label = {
        let inner = state.inner.lock().map_err(|_| "State lock poisoned")?;
        inner.active_webviews.get(&clean_id).map(|e| e.label.clone())
    };
    if let Some(lbl) = label {
        if let Some(wv) = app.get_webview(&lbl) {
            wv.eval("window.location.reload();")
                .map_err(|e| format!("Failed to reload webview: {e}"))?;
        }
    }
    Ok(())
}

pub fn toggle_service_mute(
    app: &AppHandle,
    state: &WebviewManagerState,
    service_id: &str,
) -> Result<bool, String> {
    let clean_id = sanitize_id(service_id)?;
    let (label, next_muted) = {
        let mut inner = state.inner.lock().map_err(|_| "State lock poisoned")?;
        let focus = inner.focus_mode;
        let entry = inner
            .active_webviews
            .get_mut(&clean_id)
            .ok_or_else(|| "Service is not currently active".to_string())?;
        entry.muted = !entry.muted;
        (entry.label.clone(), entry.muted || focus)
    };
    if let Some(wv) = app.get_webview(&label) {
        apply_mute(&wv, next_muted);
    }
    Ok(next_muted)
}

pub fn set_service_muted(
    app: &AppHandle,
    state: &WebviewManagerState,
    service_id: &str,
    muted: bool,
) -> Result<(), String> {
    let clean_id = sanitize_id(service_id)?;
    let (label, effective_mute) = {
        let mut inner = state.inner.lock().map_err(|_| "State lock poisoned")?;
        let focus = inner.focus_mode;
        let in_call = inner.call_mode_service_id.as_deref() == Some(clean_id.as_str());
        let Some(entry) = inner.active_webviews.get_mut(&clean_id) else {
            return Ok(());
        };
        entry.muted = muted;
        (entry.label.clone(), if in_call { false } else { muted || focus })
    };
    if let Some(wv) = app.get_webview(&label) {
        apply_mute(&wv, effective_mute);
    }
    Ok(())
}

pub fn set_split_ratio(
    app: &AppHandle,
    state: &WebviewManagerState,
    ratio: f64,
) -> Result<(), String> {
    {
        let mut inner = state.inner.lock().map_err(|_| "State lock poisoned")?;
        inner.split_ratio = ratio.clamp(0.2, 0.8);
    }
    resize_all_webviews(app, state)
}

pub fn clear_service_cache(
    app: &AppHandle,
    state: &WebviewManagerState,
    service_id: &str,
    url_str: &str,
    sidebar_width: Option<f64>,
) -> Result<(), String> {
    let clean_id = sanitize_id(service_id)?;
    let was_current = {
        let inner = state.inner.lock().map_err(|_| "State lock poisoned")?;
        inner.current_service_id.as_deref() == Some(clean_id.as_str())
    };

    hibernate_service(app, state, &clean_id)?;
    // Give WebView2 a brief moment to release file handles before deleting cache folders
    std::thread::sleep(Duration::from_millis(250));

    let session_dir = session_directory(app, &clean_id)?;
    let eb_default = session_dir.join("EBWebView").join("Default");
    for folder in ["Cache", "Code Cache", "GPUCache", "DawnCache"] {
        let target = eb_default.join(folder);
        if target.exists() {
            let _ = fs::remove_dir_all(&target);
        }
    }

    if was_current {
        activate_service(app, state, &clean_id, url_str, sidebar_width)?;
    }
    Ok(())
}

pub fn reset_service_session(
    app: &AppHandle,
    state: &WebviewManagerState,
    service_id: &str,
    url_str: &str,
    sidebar_width: Option<f64>,
) -> Result<(), String> {
    let clean_id = sanitize_id(service_id)?;
    let was_current = {
        let inner = state.inner.lock().map_err(|_| "State lock poisoned")?;
        inner.current_service_id.as_deref() == Some(clean_id.as_str())
    };

    hibernate_service(app, state, &clean_id)?;
    std::thread::sleep(Duration::from_millis(250));

    let session_dir = session_directory(app, &clean_id)?;
    if session_dir.exists() {
        let _ = fs::remove_dir_all(&session_dir);
    }

    if was_current {
        activate_service(app, state, &clean_id, url_str, sidebar_width)?;
    }
    Ok(())
}

pub fn hibernate_service(
    app: &AppHandle,
    state: &WebviewManagerState,
    service_id: &str,
) -> Result<(), String> {
    let clean_id = sanitize_id(service_id)?;
    let label = {
        let mut inner = state.inner.lock().map_err(|_| "State lock poisoned")?;
        if inner.current_service_id.as_deref() == Some(&clean_id) {
            inner.current_service_id = None;
        }
        if inner.secondary_service_id.as_deref() == Some(&clean_id) {
            inner.secondary_service_id = None;
        }
        inner.active_webviews.remove(&clean_id).map(|e| e.label)
    };

    if let Some(lbl) = label {
        if let Some(wv) = app.get_webview(&lbl) {
            wv.close()
                .map_err(|e| format!("Failed to close webview for hibernation: {e}"))?;
        }
    }
    Ok(())
}

pub fn hibernate_services(
    app: &AppHandle,
    state: &WebviewManagerState,
    service_ids: &[String],
) -> Result<(), String> {
    for id in service_ids {
        hibernate_service(app, state, id)?;
    }
    Ok(())
}

pub fn set_sidebar_width(
    app: &AppHandle,
    state: &WebviewManagerState,
    width: f64,
) -> Result<(), String> {
    {
        let mut inner = state.inner.lock().map_err(|_| "State lock poisoned")?;
        inner.sidebar_width = width;
    }
    resize_all_webviews(app, state)
}

pub fn set_right_drawer_width(
    app: &AppHandle,
    state: &WebviewManagerState,
    width: f64,
) -> Result<(), String> {
    {
        let mut inner = state.inner.lock().map_err(|_| "State lock poisoned")?;
        inner.right_drawer_width = width.max(0.0);
    }
    resize_all_webviews(app, state)
}

pub fn resize_all_webviews(app: &AppHandle, state: &WebviewManagerState) -> Result<(), String> {
    let (sw, rw, split_ratio, primary_id, secondary_id, labels) = {
        let inner = state.inner.lock().map_err(|_| "State lock poisoned")?;
        let labels: Vec<String> = inner
            .active_webviews
            .values()
            .map(|e| e.label.clone())
            .collect();
        (
            inner.sidebar_width,
            inner.right_drawer_width,
            inner.split_ratio,
            inner.current_service_id.clone(),
            inner.secondary_service_id.clone(),
            labels,
        )
    };

    let has_split = secondary_id.is_some();
    let (left_pos, left_size, right_pos, right_size) =
        compute_split_bounds(app, sw, rw, split_ratio, has_split)?;

    for lbl in labels {
        if let Some(wv) = app.get_webview(&lbl) {
            if has_split && secondary_id.as_ref().map(|s| webview_label(s)) == Some(lbl.clone()) {
                let _ = wv.set_position(right_pos);
                let _ = wv.set_size(right_size);
            } else if has_split && primary_id.as_ref().map(|p| webview_label(p)) == Some(lbl.clone()) {
                let _ = wv.set_position(left_pos);
                let _ = wv.set_size(left_size);
            } else {
                let _ = wv.set_position(left_pos);
                let _ = wv.set_size(left_size);
            }
        }
    }
    Ok(())
}

pub fn set_content_hidden(
    app: &AppHandle,
    state: &WebviewManagerState,
    hidden: bool,
) -> Result<(), String> {
    let labels = {
        let mut inner = state.inner.lock().map_err(|_| "State lock poisoned")?;
        inner.content_hidden = hidden;
        let mut out = Vec::new();
        if let Some(ref id) = inner.current_service_id {
            out.push(webview_label(id));
        }
        if let Some(ref id) = inner.secondary_service_id {
            if inner.current_service_id.as_deref() != Some(id.as_str()) {
                out.push(webview_label(id));
            }
        }
        out
    };

    for lbl in labels {
        if let Some(wv) = app.get_webview(&lbl) {
            if hidden {
                let _ = wv.hide();
            } else {
                let _ = wv.show();
            }
        }
    }
    Ok(())
}

pub fn list_active_services(state: &WebviewManagerState) -> Result<Vec<String>, String> {
    let inner = state.inner.lock().map_err(|_| "State lock poisoned")?;
    Ok(inner.active_webviews.keys().cloned().collect())
}

pub fn sync_runtime_settings(
    state: &WebviewManagerState,
    hibernation_timeout_minutes: u64,
    auto_lock_minutes: u64,
    has_pin: bool,
    link_safety_guard: bool,
    ask_before_external_link: bool,
    global_hotkey_enabled: bool,
    never_sleep_ids: HashSet<String>,
) -> Result<(), String> {
    let mut inner = state.inner.lock().map_err(|_| "State lock poisoned")?;
    inner.hibernation_timeout_minutes = hibernation_timeout_minutes;
    inner.auto_lock_minutes = auto_lock_minutes;
    inner.has_pin = has_pin;
    inner.link_safety_guard = link_safety_guard;
    inner.ask_before_external_link = ask_before_external_link;
    inner.global_hotkey_enabled = global_hotkey_enabled;
    inner.never_sleep_ids = never_sleep_ids;
    Ok(())
}

fn apply_mute<R: tauri::Runtime>(wv: &tauri::Webview<R>, muted: bool) {
    #[cfg(target_os = "windows")]
    {
        use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2_8;
        use windows_core::Interface;
        let _ = wv.with_webview(move |platform_wv| {
            unsafe {
                if let Ok(core) = platform_wv.controller().CoreWebView2() {
                    if let Ok(core8) = core.cast::<ICoreWebView2_8>() {
                        let _ = core8.SetIsMuted(muted);
                    }
                }
            }
        });
    }
    #[cfg(not(target_os = "windows"))]
    {
        let js = format!(
            "document.querySelectorAll('audio,video').forEach(el => {{ el.muted = {muted}; }});"
        );
        let _ = wv.eval(&js);
    }
}

/// Hint WebView2 to release excess JS heap / renderer memory when a tab is hidden in the background.
fn set_webview_low_memory<R: tauri::Runtime>(wv: &tauri::Webview<R>, low: bool) {
    #[cfg(target_os = "windows")]
    {
        use webview2_com::Microsoft::Web::WebView2::Win32::{
            ICoreWebView2_19, ICoreWebView2_3, COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW,
            COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL,
        };
        use windows_core::Interface;
        let _ = wv.with_webview(move |platform_wv| unsafe {
            if let Ok(core) = platform_wv.controller().CoreWebView2() {
                if let Ok(core19) = core.cast::<ICoreWebView2_19>() {
                    let level = if low {
                        COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW
                    } else {
                        COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL
                    };
                    let _ = core19.SetMemoryUsageTargetLevel(level);
                }
                if !low {
                    if let Ok(core3) = core.cast::<ICoreWebView2_3>() {
                        let _ = core3.Resume();
                    }
                }
            }
        });
    }
    #[cfg(not(target_os = "windows"))]
    let _ = low;
}

pub fn set_focus_mode(
    app: &AppHandle,
    state: &WebviewManagerState,
    muted: bool,
) -> Result<(), String> {
    let entries: Vec<(String, bool)> = {
        let mut inner = state.inner.lock().map_err(|_| "State lock poisoned")?;
        inner.focus_mode = muted;
        let mut muted_list = Vec::new();
        for (id, entry) in &inner.active_webviews {
            if inner.call_mode_service_id.as_deref() == Some(id.as_str()) {
                // Never mute the active Call Mode tab even when Focus Mode is toggled
                muted_list.push((entry.label.clone(), false));
            } else {
                muted_list.push((entry.label.clone(), muted || entry.muted));
            }
        }
        muted_list
    };

    for (lbl, effective_mute) in entries {
        if let Some(wv) = app.get_webview(&lbl) {
            apply_mute(&wv, effective_mute);
        }
    }
    Ok(())
}

/// Grant WebView2 permissions (Notifications, Mic, Camera, Clipboard) and hook DownloadStarting
/// so Molva can track downloads across all isolated services.
fn configure_webview_hooks<R: tauri::Runtime>(
    wv: &tauri::Webview<R>,
    app: AppHandle,
    service_id: String,
) {
    #[cfg(target_os = "windows")]
    {
        use std::sync::atomic::{AtomicU64, Ordering};
        use webview2_com::Microsoft::Web::WebView2::Win32::{
            ICoreWebView2_4, COREWEBVIEW2_DOWNLOAD_STATE_COMPLETED,
            COREWEBVIEW2_DOWNLOAD_STATE_IN_PROGRESS, COREWEBVIEW2_PERMISSION_KIND_CAMERA,
            COREWEBVIEW2_PERMISSION_KIND_CLIPBOARD_READ, COREWEBVIEW2_PERMISSION_KIND_MICROPHONE,
            COREWEBVIEW2_PERMISSION_KIND_NOTIFICATIONS, COREWEBVIEW2_PERMISSION_STATE_ALLOW,
        };
        use webview2_com::{
            take_pwstr, BytesReceivedChangedEventHandler, DownloadStartingEventHandler,
            PermissionRequestedEventHandler, StateChangedEventHandler,
        };
        use windows_core::{Interface, PWSTR};

        static DOWNLOAD_SEQ: AtomicU64 = AtomicU64::new(1);

        let _ = wv.with_webview(move |platform_wv| unsafe {
            if let Ok(core) = platform_wv.controller().CoreWebView2() {
                let mut perm_token = 0i64;
                let perm_handler = PermissionRequestedEventHandler::create(Box::new(
                    move |_sender, args| {
                        if let Some(args) = args {
                            let mut kind = Default::default();
                            if args.PermissionKind(&mut kind).is_ok()
                                && (kind == COREWEBVIEW2_PERMISSION_KIND_NOTIFICATIONS
                                    || kind == COREWEBVIEW2_PERMISSION_KIND_MICROPHONE
                                    || kind == COREWEBVIEW2_PERMISSION_KIND_CAMERA
                                    || kind == COREWEBVIEW2_PERMISSION_KIND_CLIPBOARD_READ)
                            {
                                let _ = args.SetState(COREWEBVIEW2_PERMISSION_STATE_ALLOW);
                            }
                        }
                        Ok(())
                    },
                ));
                let _ = core.add_PermissionRequested(&perm_handler, &mut perm_token);

                if let Ok(core4) = core.cast::<ICoreWebView2_4>() {
                    let mut dl_token = 0i64;
                    let dl_handler = DownloadStartingEventHandler::create(Box::new(
                        move |_sender, args| {
                            let Some(args) = args else { return Ok(()) };
                            let Ok(op) = args.DownloadOperation() else {
                                return Ok(());
                            };

                            let mut path_ptr = PWSTR::null();
                            let file_path = if args.ResultFilePath(&mut path_ptr).is_ok() {
                                take_pwstr(path_ptr)
                            } else {
                                String::new()
                            };

                            let file_name = std::path::Path::new(&file_path)
                                .file_name()
                                .map(|n| n.to_string_lossy().to_string())
                                .filter(|n| !n.is_empty())
                                .unwrap_or_else(|| "Download".to_string());

                            let mut total_bytes: i64 = -1;
                            let _ = op.TotalBytesToReceive(&mut total_bytes);
                            let mut received_bytes: i64 = 0;
                            let _ = op.BytesReceived(&mut received_bytes);

                            let seq = DOWNLOAD_SEQ.fetch_add(1, Ordering::Relaxed);
                            let dl_id = format!("dl_{seq}");

                            let _ = app.emit(
                                "download-updated",
                                DownloadItemPayload {
                                    id: dl_id.clone(),
                                    service_id: service_id.clone(),
                                    file_name: file_name.clone(),
                                    file_path: file_path.clone(),
                                    received_bytes,
                                    total_bytes,
                                    state: "inProgress".to_string(),
                                },
                            );

                            let app_bytes = app.clone();
                            let sid_bytes = service_id.clone();
                            let id_bytes = dl_id.clone();
                            let name_bytes = file_name.clone();
                            let path_bytes = file_path.clone();
                            let mut bytes_token = 0i64;
                            let bytes_handler = BytesReceivedChangedEventHandler::create(Box::new(
                                move |op_opt, _| {
                                    if let Some(op) = op_opt {
                                        let mut rec: i64 = 0;
                                        let mut tot: i64 = -1;
                                        let _ = op.BytesReceived(&mut rec);
                                        let _ = op.TotalBytesToReceive(&mut tot);
                                        let _ = app_bytes.emit(
                                            "download-updated",
                                            DownloadItemPayload {
                                                id: id_bytes.clone(),
                                                service_id: sid_bytes.clone(),
                                                file_name: name_bytes.clone(),
                                                file_path: path_bytes.clone(),
                                                received_bytes: rec,
                                                total_bytes: tot,
                                                state: "inProgress".to_string(),
                                            },
                                        );
                                    }
                                    Ok(())
                                },
                            ));
                            let _ = op.add_BytesReceivedChanged(&bytes_handler, &mut bytes_token);

                            let app_state = app.clone();
                            let sid_state = service_id.clone();
                            let id_state = dl_id;
                            let name_state = file_name;
                            let path_state = file_path;
                            let mut state_token = 0i64;
                            let state_handler = StateChangedEventHandler::create(Box::new(
                                move |op_opt, _| {
                                    if let Some(op) = op_opt {
                                        let mut st = Default::default();
                                        let mut rec: i64 = 0;
                                        let mut tot: i64 = -1;
                                        let _ = op.State(&mut st);
                                        let _ = op.BytesReceived(&mut rec);
                                        let _ = op.TotalBytesToReceive(&mut tot);
                                        let state_str = if st == COREWEBVIEW2_DOWNLOAD_STATE_COMPLETED {
                                            "completed"
                                        } else if st == COREWEBVIEW2_DOWNLOAD_STATE_IN_PROGRESS {
                                            "inProgress"
                                        } else {
                                            "interrupted"
                                        };
                                        let _ = app_state.emit(
                                            "download-updated",
                                            DownloadItemPayload {
                                                id: id_state.clone(),
                                                service_id: sid_state.clone(),
                                                file_name: name_state.clone(),
                                                file_path: path_state.clone(),
                                                received_bytes: rec,
                                                total_bytes: tot,
                                                state: state_str.to_string(),
                                            },
                                        );
                                    }
                                    Ok(())
                                },
                            ));
                            let _ = op.add_StateChanged(&state_handler, &mut state_token);

                            Ok(())
                        },
                    ));
                    let _ = core4.add_DownloadStarting(&dl_handler, &mut dl_token);
                }
            }
        });
    }
    #[cfg(not(target_os = "windows"))]
    let _ = (wv, app, service_id);
}

pub fn open_downloaded_file(path: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {e}"))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {e}"))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {e}"))?;
    }
    Ok(())
}

pub fn reveal_downloaded_file(path: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .args(["/select,", path])
            .spawn()
            .map_err(|e| format!("Failed to open folder: {e}"))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", path])
            .spawn()
            .map_err(|e| format!("Failed to open folder: {e}"))?;
    }
    #[cfg(target_os = "linux")]
    {
        let folder = std::path::Path::new(path)
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| path.to_string());
        std::process::Command::new("xdg-open")
            .arg(folder)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {e}"))?;
    }
    Ok(())
}

/// System-wide global hotkey listener (Ctrl + Shift + M) to show/hide Molva from anywhere in Windows.
pub fn start_global_hotkey_listener(app: AppHandle) {
    #[cfg(target_os = "windows")]
    std::thread::spawn(move || {
        use std::ffi::c_void;

        const MOD_CONTROL: u32 = 0x0002;
        const MOD_SHIFT: u32 = 0x0004;
        const MOD_NOREPEAT: u32 = 0x4000;
        const WM_HOTKEY: u32 = 0x0312;
        const VK_M: u32 = 0x4D;
        const HOTKEY_ID: i32 = 1;

        #[repr(C)]
        struct Point {
            x: i32,
            y: i32,
        }

        #[repr(C)]
        struct Msg {
            hwnd: *mut c_void,
            message: u32,
            w_param: usize,
            l_param: isize,
            time: u32,
            pt: Point,
        }

        unsafe extern "system" {
            fn RegisterHotKey(
                hWnd: *mut c_void,
                id: i32,
                fsModifiers: u32,
                vk: u32,
            ) -> i32;
            fn GetMessageW(
                lpMsg: *mut Msg,
                hWnd: *mut c_void,
                wMsgFilterMin: u32,
                wMsgFilterMax: u32,
            ) -> i32;
        }

        unsafe {
            if RegisterHotKey(
                std::ptr::null_mut(),
                HOTKEY_ID,
                MOD_CONTROL | MOD_SHIFT | MOD_NOREPEAT,
                VK_M,
            ) == 0
            {
                return;
            }

            let mut msg: Msg = std::mem::zeroed();
            while GetMessageW(&mut msg, std::ptr::null_mut(), 0, 0) > 0 {
                if msg.message == WM_HOTKEY && msg.w_param == HOTKEY_ID as usize {
                    let enabled = app
                        .try_state::<WebviewManagerState>()
                        .and_then(|s| s.inner.lock().ok().map(|i| i.global_hotkey_enabled))
                        .unwrap_or(true);
                    if !enabled {
                        continue;
                    }
                    if let Some(win) = app.get_window("main") {
                        let visible = win.is_visible().unwrap_or(false);
                        let focused = win.is_focused().unwrap_or(false);
                        if visible && focused {
                            let _ = win.hide();
                        } else {
                            let _ = win.unminimize();
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                }
            }
        }
    });

    #[cfg(not(target_os = "windows"))]
    let _ = app;
}

pub fn set_call_mode(
    app: &AppHandle,
    state: &WebviewManagerState,
    active_call_service_id: Option<String>,
) -> Result<(), String> {
    let entries: Vec<(String, bool)> = {
        let mut inner = state.inner.lock().map_err(|_| "State lock poisoned")?;
        inner.call_mode_service_id = active_call_service_id.clone();
        let focus = inner.focus_mode;
        inner
            .active_webviews
            .iter()
            .map(|(id, entry)| {
                let muted = match active_call_service_id.as_deref() {
                    Some(call_id) => id != call_id,
                    None => focus || entry.muted,
                };
                (entry.label.clone(), muted)
            })
            .collect()
    };

    for (lbl, muted) in entries {
        if let Some(wv) = app.get_webview(&lbl) {
            apply_mute(&wv, muted);
        }
    }
    Ok(())
}

fn dir_size_bytes(path: &std::path::Path) -> u64 {
    let Ok(entries) = fs::read_dir(path) else {
        return 0;
    };
    let mut total: u64 = 0;
    for entry in entries.flatten() {
        let p = entry.path();
        if let Ok(meta) = entry.metadata() {
            if meta.is_dir() {
                total += dir_size_bytes(&p);
            } else {
                total += meta.len();
            }
        }
    }
    total
}

pub fn get_sessions_disk_usage(app: &AppHandle) -> Result<Vec<SessionDiskUsage>, String> {
    let base = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to resolve app_local_data_dir: {e}"))?;
    let sessions_root = base.join("sessions");
    if !sessions_root.exists() {
        return Ok(Vec::new());
    }

    let mut out = Vec::new();
    let Ok(entries) = fs::read_dir(&sessions_root) else {
        return Ok(out);
    };
    for entry in entries.flatten() {
        let p = entry.path();
        if !p.is_dir() {
            continue;
        }
        let service_id = entry.file_name().to_string_lossy().to_string();
        let total_bytes = dir_size_bytes(&p);
        let eb_default = p.join("EBWebView").join("Default");
        let cache_bytes: u64 = ["Cache", "Code Cache", "GPUCache", "DawnCache"]
            .iter()
            .map(|folder| dir_size_bytes(&eb_default.join(folder)))
            .sum();
        out.push(SessionDiskUsage {
            service_id,
            total_bytes,
            cache_bytes,
        });
    }
    Ok(out)
}

pub fn reclaim_all_cache(app: &AppHandle, state: &WebviewManagerState) -> Result<u64, String> {
    let base = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to resolve app_local_data_dir: {e}"))?;
    let sessions_root = base.join("sessions");
    if !sessions_root.exists() {
        return Ok(0);
    }

    // Hibernate inactive webviews so their cache file locks are released
    let inactive_ids: Vec<String> = {
        let inner = state.inner.lock().map_err(|_| "State lock poisoned")?;
        inner
            .active_webviews
            .keys()
            .filter(|id| {
                inner.current_service_id.as_deref() != Some(id.as_str())
                    && inner.secondary_service_id.as_deref() != Some(id.as_str())
            })
            .cloned()
            .collect()
    };
    for id in inactive_ids {
        let _ = hibernate_service(app, state, &id);
    }
    std::thread::sleep(Duration::from_millis(200));

    let mut reclaimed: u64 = 0;
    if let Ok(entries) = fs::read_dir(&sessions_root) {
        for entry in entries.flatten() {
            let p = entry.path();
            if !p.is_dir() {
                continue;
            }
            let eb_default = p.join("EBWebView").join("Default");
            for folder in ["Cache", "Code Cache", "GPUCache", "DawnCache"] {
                let target = eb_default.join(folder);
                if target.exists() {
                    let size = dir_size_bytes(&target);
                    if fs::remove_dir_all(&target).is_ok() {
                        reclaimed += size;
                    }
                }
            }
        }
    }
    Ok(reclaimed)
}

/// Fast, zero-DNS TCP reachability check to determine real internet connectivity.
pub fn has_internet_connection() -> bool {
    use std::net::{SocketAddr, TcpStream};
    let targets: [SocketAddr; 2] = [
        SocketAddr::from(([1, 1, 1, 1], 443)),
        SocketAddr::from(([8, 8, 8, 8], 53)),
    ];
    let timeout = Duration::from_millis(1500);
    targets
        .iter()
        .any(|addr| TcpStream::connect_timeout(addr, timeout).is_ok())
}

/// Background network monitor that emits "network-status-changed" when connectivity changes.
pub fn start_network_watchdog(app: AppHandle) {
    std::thread::spawn(move || {
        let mut last_online = has_internet_connection();
        let _ = app.emit("network-status-changed", last_online);
        loop {
            std::thread::sleep(Duration::from_secs(5));
            let online = has_internet_connection();
            if online != last_online {
                last_online = online;
                let _ = app.emit("network-status-changed", online);
            }
        }
    });
}

/// Measure total working-set RAM (in MB) of MessinOne and its descendant WebView2 processes.
pub fn get_memory_usage_mb() -> u64 {
    #[cfg(target_os = "windows")]
    {
        use std::collections::{HashMap, HashSet};
        use std::ffi::c_void;

        #[repr(C)]
        struct ProcessEntry32W {
            dw_size: u32,
            cnt_usage: u32,
            th32_process_id: u32,
            th32_default_heap_id: usize,
            th32_module_id: u32,
            cnt_threads: u32,
            th32_parent_process_id: u32,
            pc_pri_class_base: i32,
            dw_flags: u32,
            sz_exe_file: [u16; 260],
        }

        #[repr(C)]
        struct ProcessMemoryCountersEx {
            cb: u32,
            page_fault_count: u32,
            peak_working_set_size: usize,
            working_set_size: usize,
            quota_peak_paged_pool_usage: usize,
            quota_paged_pool_usage: usize,
            quota_peak_non_paged_pool_usage: usize,
            quota_non_paged_pool_usage: usize,
            pagefile_usage: usize,
            peak_pagefile_usage: usize,
            private_usage: usize,
        }

        const TH32CS_SNAPPROCESS: u32 = 0x00000002;
        const PROCESS_QUERY_LIMITED_INFORMATION: u32 = 0x1000;
        const PROCESS_VM_READ: u32 = 0x0010;
        const INVALID_HANDLE: *mut c_void = (-1isize) as *mut c_void;

        unsafe extern "system" {
            fn GetCurrentProcessId() -> u32;
            fn CreateToolhelp32Snapshot(dwFlags: u32, th32ProcessID: u32) -> *mut c_void;
            fn Process32FirstW(hSnapshot: *mut c_void, lppe: *mut ProcessEntry32W) -> i32;
            fn Process32NextW(hSnapshot: *mut c_void, lppe: *mut ProcessEntry32W) -> i32;
            fn OpenProcess(
                dwDesiredAccess: u32,
                bInheritHandle: i32,
                dwProcessId: u32,
            ) -> *mut c_void;
            fn CloseHandle(hObject: *mut c_void) -> i32;
            fn K32GetProcessMemoryInfo(
                Process: *mut c_void,
                ppsmemCounters: *mut ProcessMemoryCountersEx,
                cb: u32,
            ) -> i32;
        }

        unsafe {
            let root_pid = GetCurrentProcessId();
            let snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
            if snap == INVALID_HANDLE {
                return 0;
            }

            let mut children_map: HashMap<u32, Vec<u32>> = HashMap::new();
            let mut entry: ProcessEntry32W = std::mem::zeroed();
            entry.dw_size = std::mem::size_of::<ProcessEntry32W>() as u32;

            if Process32FirstW(snap, &mut entry) != 0 {
                loop {
                    children_map
                        .entry(entry.th32_parent_process_id)
                        .or_default()
                        .push(entry.th32_process_id);
                    if Process32NextW(snap, &mut entry) == 0 {
                        break;
                    }
                }
            }
            let _ = CloseHandle(snap);

            let mut tree_pids = HashSet::new();
            let mut stack = vec![root_pid];
            while let Some(pid) = stack.pop() {
                if tree_pids.insert(pid) {
                    if let Some(kids) = children_map.get(&pid) {
                        stack.extend(kids.iter().copied());
                    }
                }
            }

            let mut total_bytes: u64 = 0;
            for pid in tree_pids {
                let handle = OpenProcess(
                    PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_VM_READ,
                    0,
                    pid,
                );
                if !handle.is_null() {
                    let mut pmc: ProcessMemoryCountersEx = std::mem::zeroed();
                    pmc.cb = std::mem::size_of::<ProcessMemoryCountersEx>() as u32;
                    if K32GetProcessMemoryInfo(handle, &mut pmc, pmc.cb) != 0 {
                        total_bytes += pmc.private_usage as u64;
                    }
                    let _ = CloseHandle(handle);
                }
            }

            total_bytes / (1024 * 1024)
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        0
    }
}

/// Background watchdog that unloads inactive child webviews after the configured timeout.
pub fn start_hibernation_watchdog(app: AppHandle) {
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_secs(30));

        let state = app.state::<WebviewManagerState>();
        let expired: Vec<(String, String)> = {
            let Ok(mut inner) = state.inner.lock() else {
                continue;
            };
            if inner.hibernation_timeout_minutes == 0 {
                continue;
            }
            let timeout = Duration::from_secs(inner.hibernation_timeout_minutes * 60);
            let current_id = inner.current_service_id.clone();
            let secondary_id = inner.secondary_service_id.clone();
            let now = Instant::now();

            let to_remove: Vec<String> = inner
                .active_webviews
                .iter()
                .filter(|(id, entry)| {
                    current_id.as_deref() != Some(id.as_str())
                        && secondary_id.as_deref() != Some(id.as_str())
                        && inner.call_mode_service_id.as_deref() != Some(id.as_str())
                        && !inner.never_sleep_ids.contains(id.as_str())
                        && now.duration_since(entry.last_active) >= timeout
                })
                .map(|(id, _)| id.clone())
                .collect();

            to_remove
                .into_iter()
                .filter_map(|id| {
                    inner
                        .active_webviews
                        .remove(&id)
                        .map(|entry| (id, entry.label))
                })
                .collect()
        };

        for (service_id, label) in expired {
            if let Some(wv) = app.get_webview(&label) {
                let _ = wv.close();
            }
            let _ = app.emit("service-hibernated", service_id);
        }
    });
}

/// System-wide idle detector (Win32 GetLastInputInfo) for Idle Vault Lock.
pub fn start_idle_lock_watchdog(app: AppHandle) {
    std::thread::spawn(move || {
        let mut already_triggered = false;
        loop {
            std::thread::sleep(Duration::from_secs(10));

            let (auto_lock_min, has_pin) = {
                let state = app.state::<WebviewManagerState>();
                let Ok(inner) = state.inner.lock() else {
                    continue;
                };
                (inner.auto_lock_minutes, inner.has_pin)
            };

            if auto_lock_min == 0 || !has_pin {
                already_triggered = false;
                continue;
            }

            let idle_ms = get_system_idle_ms();
            let threshold_ms = auto_lock_min * 60 * 1000;
            if idle_ms >= threshold_ms {
                if !already_triggered {
                    already_triggered = true;
                    let _ = app.emit("auto-lock-triggered", ());
                }
            } else {
                already_triggered = false;
            }
        }
    });
}

fn get_system_idle_ms() -> u64 {
    #[cfg(target_os = "windows")]
    {
        #[repr(C)]
        struct LastInputInfo {
            cb_size: u32,
            dw_time: u32,
        }

        unsafe extern "system" {
            fn GetLastInputInfo(plii: *mut LastInputInfo) -> i32;
            fn GetTickCount() -> u32;
        }

        unsafe {
            let mut lii = LastInputInfo {
                cb_size: std::mem::size_of::<LastInputInfo>() as u32,
                dw_time: 0,
            };
            if GetLastInputInfo(&mut lii) != 0 {
                let now = GetTickCount();
                return now.wrapping_sub(lii.dw_time) as u64;
            }
        }
        0
    }
    #[cfg(not(target_os = "windows"))]
    {
        0
    }
}

/// Enable or disable Windows startup via HKCU\Software\Microsoft\Windows\CurrentVersion\Run.
pub fn set_windows_startup(enabled: bool, minimized: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;

        const CREATE_NO_WINDOW: u32 = 0x08000000;
        const RUN_KEY: &str = r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run";

        if enabled {
            let exe = std::env::current_exe()
                .map_err(|e| format!("Failed to locate executable: {e}"))?;
            let exe_str = exe.to_string_lossy();
            let value = if minimized {
                format!("\"{exe_str}\" --minimized")
            } else {
                format!("\"{exe_str}\"")
            };

            let status = Command::new("reg")
                .args(["add", RUN_KEY, "/v", "Molva", "/t", "REG_SZ", "/d", &value, "/f"])
                .creation_flags(CREATE_NO_WINDOW)
                .status()
                .map_err(|e| format!("Failed to update Windows startup registry: {e}"))?;

            if !status.success() {
                return Err("Registry update failed".to_string());
            }
        } else {
            let _ = Command::new("reg")
                .args(["delete", RUN_KEY, "/v", "Molva", "/f"])
                .creation_flags(CREATE_NO_WINDOW)
                .status();
        }
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (enabled, minimized);
        Ok(())
    }
}
