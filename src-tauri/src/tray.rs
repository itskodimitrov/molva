use tauri::image::Image;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager};

const TRAY_ID: &str = "messinone-tray";

pub fn init_tray(app: &AppHandle) -> Result<(), String> {
    let show_item = MenuItem::with_id(app, "show", "Show Molva", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit Completely", true, None::<&str>)
        .map_err(|e| e.to_string())?;

    let menu = Menu::with_items(app, &[&show_item, &quit_item]).map_err(|e| e.to_string())?;

    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu)
        .tooltip("Molva")
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_main_window(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder.build(app).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn show_main_window(app: &AppHandle) {
    if let Some(win) = app.get_window("main") {
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_focus();
    }
}

pub fn update_tray_unread(app: &AppHandle, total_unread: usize) -> Result<(), String> {
    let Some(tray) = app.tray_by_id(TRAY_ID) else {
        return Ok(());
    };

    let tooltip = if total_unread > 0 {
        format!("Molva — {total_unread} unread")
    } else {
        "Molva".to_string()
    };
    let _ = tray.set_tooltip(Some(&tooltip));

    if let Some(base_icon) = app.default_window_icon() {
        if total_unread > 0 {
            let badged = draw_unread_dot(base_icon);
            let _ = tray.set_icon(Some(badged));
        } else {
            let _ = tray.set_icon(Some(base_icon.clone()));
        }
    }

    Ok(())
}

fn draw_unread_dot(icon: &Image<'_>) -> Image<'static> {
    let w = icon.width();
    let h = icon.height();
    let mut rgba = icon.rgba().to_vec();

    // Draw a crisp red notification dot in the top-right corner
    let cx = (w as f32) * 0.78;
    let cy = (h as f32) * 0.22;
    let radius = ((w.min(h) as f32) * 0.20).max(3.0);

    for y in 0..h {
        for x in 0..w {
            let dx = x as f32 - cx;
            let dy = y as f32 - cy;
            if dx * dx + dy * dy <= radius * radius {
                let idx = ((y * w + x) * 4) as usize;
                if idx + 3 < rgba.len() {
                    rgba[idx] = 239; // R
                    rgba[idx + 1] = 68; // G
                    rgba[idx + 2] = 68; // B
                    rgba[idx + 3] = 255; // A
                }
            }
        }
    }

    Image::new_owned(rgba, w, h)
}
