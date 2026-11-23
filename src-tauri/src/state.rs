use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuietHoursConfig {
    pub enabled: bool,
    pub start_time: String, // "18:30"
    pub end_time: String,   // "09:00"
    pub weekends: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceConfig {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub url: String,
    pub icon_url: Option<String>,
    pub order: usize,
    #[serde(default)]
    pub never_sleep: bool,
    #[serde(default)]
    pub quiet_hours: Option<QuietHoursConfig>,
}

fn default_split_ratio() -> f64 {
    0.5
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub sidebar_collapsed: bool,
    pub theme: String, // "dark" | "oled" | "light"
    pub hibernation_timeout_minutes: u64,
    pub hibernate_on_workspace_switch: bool,
    pub focus_mode: bool,
    pub pin_hash: Option<String>,
    #[serde(default)]
    pub auto_lock_minutes: u64,
    #[serde(default)]
    pub launch_on_startup: bool,
    #[serde(default)]
    pub start_minimized: bool,
    #[serde(default = "default_split_ratio")]
    pub split_ratio: f64,
    #[serde(default)]
    pub privacy_shield_on_blur: bool,
    #[serde(default = "default_true")]
    pub link_safety_guard: bool,
    #[serde(default = "default_true")]
    pub ask_before_external_link: bool,
    #[serde(default = "default_true")]
    pub global_hotkey_enabled: bool,
    #[serde(default = "default_true")]
    pub show_ecosystem_picks: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            sidebar_collapsed: false,
            theme: "dark".to_string(),
            hibernation_timeout_minutes: 10,
            hibernate_on_workspace_switch: false,
            focus_mode: false,
            pin_hash: None,
            auto_lock_minutes: 0,
            launch_on_startup: false,
            start_minimized: false,
            split_ratio: 0.5,
            privacy_shield_on_blur: false,
            link_safety_guard: true,
            ask_before_external_link: true,
            global_hotkey_enabled: true,
            show_ecosystem_picks: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteItem {
    pub id: String,
    pub content: String,
    #[serde(default)]
    pub pinned: bool,
    #[serde(default)]
    pub is_todo: bool,
    #[serde(default)]
    pub done: bool,
    #[serde(default)]
    pub created_at: u64,
    #[serde(default)]
    pub category: Option<String>,
}

fn default_note_categories() -> Vec<String> {
    vec![
        "General".to_string(),
        "Work".to_string(),
        "Ideas".to_string(),
    ]
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceUsageStat {
    #[serde(default)]
    pub today_seconds: u64,
    #[serde(default)]
    pub total_seconds: u64,
    #[serde(default)]
    pub last_date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub workspaces: Vec<Workspace>,
    pub services: Vec<ServiceConfig>,
    pub active_workspace_id: String,
    pub active_service_id: Option<String>,
    pub settings: AppSettings,
    #[serde(default)]
    pub notes: Vec<NoteItem>,
    #[serde(default = "default_note_categories")]
    pub note_categories: Vec<String>,
    #[serde(default)]
    pub usage_stats: HashMap<String, ServiceUsageStat>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            workspaces: vec![
                Workspace {
                    id: "work".to_string(),
                    name: "Work".to_string(),
                },
                Workspace {
                    id: "personal".to_string(),
                    name: "Personal".to_string(),
                },
            ],
            services: Vec::new(),
            active_workspace_id: "work".to_string(),
            active_service_id: None,
            settings: AppSettings::default(),
            notes: Vec::new(),
            note_categories: default_note_categories(),
            usage_stats: HashMap::new(),
        }
    }
}

fn config_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to resolve app_config_dir: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create config dir: {e}"))?;
    Ok(dir.join("config.json"))
}

pub fn load_config(app: &AppHandle) -> Result<AppConfig, String> {
    let path = config_file_path(app)?;
    if !path.exists() {
        let default_cfg = AppConfig::default();
        save_config(app, &default_cfg)?;
        return Ok(default_cfg);
    }

    let raw = fs::read_to_string(&path).map_err(|e| format!("Failed to read config: {e}"))?;
    serde_json::from_str::<AppConfig>(&raw).map_err(|e| format!("Failed to parse config: {e}"))
}

pub fn save_config(app: &AppHandle, config: &AppConfig) -> Result<(), String> {
    let path = config_file_path(app)?;
    let json = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize config: {e}"))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write config: {e}"))
}
