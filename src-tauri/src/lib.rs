mod state;
mod tray;
mod webview_manager;

use state::AppConfig;
use std::collections::HashSet;
use tauri::{AppHandle, Emitter, Manager, State, WindowEvent};
use webview_manager::WebviewManagerState;

#[tauri::command]
fn get_app_config(app: AppHandle) -> Result<AppConfig, String> {
    state::load_config(&app)
}

#[tauri::command]
fn save_app_config(
    app: AppHandle,
    wv_state: State<'_, WebviewManagerState>,
    config: AppConfig,
) -> Result<(), String> {
    state::save_config(&app, &config)?;
    let never_sleep_ids: HashSet<String> = config
        .services
        .iter()
        .filter(|s| s.never_sleep)
        .map(|s| s.id.clone())
        .collect();
    webview_manager::sync_runtime_settings(
        &wv_state,
        config.settings.hibernation_timeout_minutes,
        config.settings.auto_lock_minutes,
        config.settings.pin_hash.is_some(),
        config.settings.link_safety_guard,
        config.settings.ask_before_external_link,
        config.settings.global_hotkey_enabled,
        never_sleep_ids,
    )?;
    Ok(())
}

#[tauri::command]
async fn activate_service(
    app: AppHandle,
    wv_state: State<'_, WebviewManagerState>,
    service_id: String,
    url: String,
    sidebar_width: Option<f64>,
) -> Result<(), String> {
    let res = webview_manager::activate_service(&app, &wv_state, &service_id, &url, sidebar_width);
    if let Err(ref e) = res {
        eprintln!("[MessinOne] activate_service failed for {service_id}: {e}");
    }
    res
}

#[tauri::command]
async fn hibernate_service(
    app: AppHandle,
    wv_state: State<'_, WebviewManagerState>,
    service_id: String,
) -> Result<(), String> {
    webview_manager::hibernate_service(&app, &wv_state, &service_id)
}

#[tauri::command]
async fn hibernate_services(
    app: AppHandle,
    wv_state: State<'_, WebviewManagerState>,
    service_ids: Vec<String>,
) -> Result<(), String> {
    webview_manager::hibernate_services(&app, &wv_state, &service_ids)
}

#[tauri::command]
async fn set_sidebar_width(
    app: AppHandle,
    wv_state: State<'_, WebviewManagerState>,
    width: f64,
) -> Result<(), String> {
    webview_manager::set_sidebar_width(&app, &wv_state, width)
}

#[tauri::command]
async fn set_right_drawer_width(
    app: AppHandle,
    wv_state: State<'_, WebviewManagerState>,
    width: f64,
) -> Result<(), String> {
    webview_manager::set_right_drawer_width(&app, &wv_state, width)
}

#[tauri::command]
async fn set_content_hidden(
    app: AppHandle,
    wv_state: State<'_, WebviewManagerState>,
    hidden: bool,
) -> Result<(), String> {
    webview_manager::set_content_hidden(&app, &wv_state, hidden)
}

#[tauri::command]
fn list_active_services(wv_state: State<'_, WebviewManagerState>) -> Result<Vec<String>, String> {
    webview_manager::list_active_services(&wv_state)
}

#[tauri::command]
async fn set_focus_mode(
    app: AppHandle,
    wv_state: State<'_, WebviewManagerState>,
    muted: bool,
) -> Result<(), String> {
    webview_manager::set_focus_mode(&app, &wv_state, muted)
}

#[tauri::command]
async fn set_tray_unread(app: AppHandle, total_unread: usize) -> Result<(), String> {
    tray::update_tray_unread(&app, total_unread)
}

#[tauri::command]
async fn get_memory_usage_mb() -> Result<u64, String> {
    Ok(webview_manager::get_memory_usage_mb())
}

#[tauri::command]
async fn reload_service(
    app: AppHandle,
    wv_state: State<'_, WebviewManagerState>,
    service_id: String,
) -> Result<(), String> {
    webview_manager::reload_service(&app, &wv_state, &service_id)
}

#[tauri::command]
async fn toggle_service_mute(
    app: AppHandle,
    wv_state: State<'_, WebviewManagerState>,
    service_id: String,
) -> Result<bool, String> {
    webview_manager::toggle_service_mute(&app, &wv_state, &service_id)
}

#[tauri::command]
async fn clear_service_cache(
    app: AppHandle,
    wv_state: State<'_, WebviewManagerState>,
    service_id: String,
    url: String,
    sidebar_width: Option<f64>,
) -> Result<(), String> {
    webview_manager::clear_service_cache(&app, &wv_state, &service_id, &url, sidebar_width)
}

#[tauri::command]
async fn reset_service_session(
    app: AppHandle,
    wv_state: State<'_, WebviewManagerState>,
    service_id: String,
    url: String,
    sidebar_width: Option<f64>,
) -> Result<(), String> {
    webview_manager::reset_service_session(&app, &wv_state, &service_id, &url, sidebar_width)
}

#[tauri::command]
async fn set_always_on_top(app: AppHandle, pinned: bool) -> Result<(), String> {
    let win = app
        .get_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;
    win.set_always_on_top(pinned).map_err(|e| e.to_string())
}

#[tauri::command]
async fn open_split_view(
    app: AppHandle,
    wv_state: State<'_, WebviewManagerState>,
    service_id: String,
    url: String,
) -> Result<(), String> {
    webview_manager::open_split_view(&app, &wv_state, &service_id, &url)
}

#[tauri::command]
async fn close_split_view(
    app: AppHandle,
    wv_state: State<'_, WebviewManagerState>,
) -> Result<(), String> {
    webview_manager::close_split_view(&app, &wv_state)
}

#[tauri::command]
async fn set_windows_startup(enabled: bool, minimized: bool) -> Result<(), String> {
    webview_manager::set_windows_startup(enabled, minimized)
}

#[tauri::command]
async fn set_split_ratio(
    app: AppHandle,
    wv_state: State<'_, WebviewManagerState>,
    ratio: f64,
) -> Result<(), String> {
    webview_manager::set_split_ratio(&app, &wv_state, ratio)
}

#[tauri::command]
async fn set_service_muted(
    app: AppHandle,
    wv_state: State<'_, WebviewManagerState>,
    service_id: String,
    muted: bool,
) -> Result<(), String> {
    webview_manager::set_service_muted(&app, &wv_state, &service_id, muted)
}

#[tauri::command]
async fn open_downloaded_file(path: String) -> Result<(), String> {
    webview_manager::open_downloaded_file(&path)
}

#[tauri::command]
async fn reveal_downloaded_file(path: String) -> Result<(), String> {
    webview_manager::reveal_downloaded_file(&path)
}

#[tauri::command]
async fn set_call_mode(
    app: AppHandle,
    wv_state: State<'_, WebviewManagerState>,
    service_id: Option<String>,
) -> Result<(), String> {
    webview_manager::set_call_mode(&app, &wv_state, service_id)
}

#[tauri::command]
async fn get_sessions_disk_usage(
    app: AppHandle,
) -> Result<Vec<webview_manager::SessionDiskUsage>, String> {
    webview_manager::get_sessions_disk_usage(&app)
}

#[tauri::command]
async fn reclaim_all_cache(
    app: AppHandle,
    wv_state: State<'_, WebviewManagerState>,
) -> Result<u64, String> {
    webview_manager::reclaim_all_cache(&app, &wv_state)
}

#[tauri::command]
async fn check_internet_connection() -> Result<bool, String> {
    Ok(webview_manager::has_internet_connection())
}

#[tauri::command]
async fn open_url_in_browser(url: String) -> Result<(), String> {
    webview_manager::open_url_in_browser(&url)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let cfg = state::load_config(app.handle()).unwrap_or_default();
            let initial_sidebar_width = if cfg.settings.sidebar_collapsed {
                72.0
            } else {
                248.0
            };
            let never_sleep_ids: HashSet<String> = cfg
                .services
                .iter()
                .filter(|s| s.never_sleep)
                .map(|s| s.id.clone())
                .collect();
            app.manage(WebviewManagerState::new(
                initial_sidebar_width,
                cfg.settings.split_ratio,
                cfg.settings.hibernation_timeout_minutes,
                cfg.settings.auto_lock_minutes,
                cfg.settings.pin_hash.is_some(),
                cfg.settings.focus_mode,
                cfg.settings.link_safety_guard,
                cfg.settings.ask_before_external_link,
                cfg.settings.global_hotkey_enabled,
                never_sleep_ids,
            ));

            tray::init_tray(app.handle())?;
            webview_manager::start_hibernation_watchdog(app.handle().clone());
            webview_manager::start_idle_lock_watchdog(app.handle().clone());
            webview_manager::start_global_hotkey_listener(app.handle().clone());
            webview_manager::start_network_watchdog(app.handle().clone());

            if std::env::args().any(|a| a == "--minimized") {
                if let Some(win) = app.get_window("main") {
                    let _ = win.hide();
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" {
                match event {
                    WindowEvent::Resized(_) => {
                        let app = window.app_handle();
                        if let Some(wv_state) = app.try_state::<WebviewManagerState>() {
                            let _ = webview_manager::resize_all_webviews(app, &wv_state);
                        }
                    }
                    WindowEvent::Focused(focused) => {
                        let _ = window.app_handle().emit("window-focus-changed", *focused);
                    }
                    WindowEvent::CloseRequested { api, .. } => {
                        // Minimize to system tray instead of quitting
                        api.prevent_close();
                        let _ = window.hide();
                    }
                    _ => {}
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_app_config,
            save_app_config,
            activate_service,
            hibernate_service,
            hibernate_services,
            set_sidebar_width,
            set_right_drawer_width,
            set_content_hidden,
            list_active_services,
            set_focus_mode,
            set_tray_unread,
            get_memory_usage_mb,
            reload_service,
            toggle_service_mute,
            clear_service_cache,
            reset_service_session,
            set_always_on_top,
            open_split_view,
            close_split_view,
            set_windows_startup,
            set_split_ratio,
            set_service_muted,
            open_downloaded_file,
            reveal_downloaded_file,
            set_call_mode,
            get_sessions_disk_usage,
            reclaim_all_cache,
            check_internet_connection,
            open_url_in_browser,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
