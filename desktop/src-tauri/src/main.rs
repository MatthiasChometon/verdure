// verdure desktop — a tray launcher for the local prod stack.
//
// It shows a coloured dot in the system tray (red = stopped, amber = starting,
// green = up), lets you start/stop the stack, and opens the app in its own
// window. Starting/stopping shells out to the repo's verdure-up/down scripts so
// the Docker orchestration lives in one place.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::os::windows::process::CommandExt;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WebviewUrl, WebviewWindowBuilder,
};

/// Where the compose files and verdure-up/down scripts live. Overridable so the
/// installed app can point elsewhere without a rebuild.
const DEFAULT_DIR: &str = "C:\\projets\\verdure";
const CREATE_NO_WINDOW: u32 = 0x0800_0000;
const APP_URL: &str = "http://localhost:3666/";

#[derive(Clone, Copy, PartialEq, Eq)]
enum Status {
    Down,
    Starting,
    Up,
}

impl Status {
    fn as_str(self) -> &'static str {
        match self {
            Status::Down => "down",
            Status::Starting => "starting",
            Status::Up => "up",
        }
    }

    fn tooltip(self) -> &'static str {
        match self {
            Status::Down => "verdure — arrêté",
            Status::Starting => "verdure — démarrage…",
            Status::Up => "verdure — en ligne",
        }
    }
}

struct Shared {
    starting: Mutex<bool>,
    last: Mutex<Status>,
}

fn verdure_dir() -> String {
    std::env::var("VERDURE_DIR").unwrap_or_else(|_| DEFAULT_DIR.to_string())
}

/// Fire a verdure-*.ps1 script in the background, without flashing a console.
fn run_ps(script: &'static str) {
    let root = verdure_dir();
    let path = format!("{}\\{}", root, script);
    let _ = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            &path,
            "-Root",
            &root,
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn();
}

/// Probe the front over TCP: green only on a real HTTP response, amber while the
/// port is open but not answering yet (front still building), red if refused.
fn probe() -> Status {
    use std::io::{Read, Write};
    use std::net::TcpStream;

    let addr = match "127.0.0.1:3666".parse() {
        Ok(a) => a,
        Err(_) => return Status::Down,
    };
    let mut stream = match TcpStream::connect_timeout(&addr, Duration::from_millis(700)) {
        Ok(s) => s,
        Err(_) => return Status::Down,
    };
    let _ = stream.set_read_timeout(Some(Duration::from_millis(1500)));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(1000)));
    if stream
        .write_all(b"GET / HTTP/1.0\r\nHost: localhost\r\nConnection: close\r\n\r\n")
        .is_err()
    {
        return Status::Starting;
    }
    let mut buf = [0u8; 32];
    match stream.read(&mut buf) {
        Ok(n) if n >= 12 => {
            let head = String::from_utf8_lossy(&buf[..n]);
            if head.contains(" 200") || head.contains(" 302") || head.contains(" 304") {
                Status::Up
            } else {
                Status::Starting
            }
        }
        _ => Status::Starting,
    }
}

/// A flat coloured disc used as the tray icon for a given status.
fn dot(r: u8, g: u8, b: u8) -> Image<'static> {
    let size: i32 = 32;
    let mut px = vec![0u8; (size * size * 4) as usize];
    let c = (size as f32 - 1.0) / 2.0;
    let rad = 13.0f32;
    for y in 0..size {
        for x in 0..size {
            let dx = x as f32 - c;
            let dy = y as f32 - c;
            let d = (dx * dx + dy * dy).sqrt();
            let i = ((y * size + x) * 4) as usize;
            if d <= rad {
                px[i] = r;
                px[i + 1] = g;
                px[i + 2] = b;
                px[i + 3] = 255;
            } else if d <= rad + 1.0 {
                px[i] = r;
                px[i + 1] = g;
                px[i + 2] = b;
                px[i + 3] = 120;
            }
        }
    }
    Image::new_owned(px, size as u32, size as u32)
}

fn icon_for(s: Status) -> Image<'static> {
    match s {
        Status::Up => dot(46, 160, 67),
        Status::Starting => dot(219, 158, 30),
        Status::Down => dot(207, 34, 46),
    }
}

fn show_main(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

fn open_app_window(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("app") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
        return;
    }
    let url = match tauri::Url::parse(APP_URL) {
        Ok(u) => u,
        Err(_) => return,
    };
    let _ = WebviewWindowBuilder::new(app, "app", WebviewUrl::External(url))
        .title("verdure")
        .inner_size(1100.0, 820.0)
        .build();
}

fn begin_start(app: &tauri::AppHandle) {
    *app.state::<Arc<Shared>>().starting.lock().unwrap() = true;
    std::thread::spawn(|| run_ps("verdure-up.ps1"));
}

fn begin_stop(app: &tauri::AppHandle) {
    *app.state::<Arc<Shared>>().starting.lock().unwrap() = false;
    std::thread::spawn(|| run_ps("verdure-down.ps1"));
}

#[tauri::command]
fn status(state: tauri::State<Arc<Shared>>) -> String {
    state.last.lock().unwrap().as_str().to_string()
}

#[tauri::command]
fn start_stack(app: tauri::AppHandle) {
    begin_start(&app);
}

#[tauri::command]
fn stop_stack(app: tauri::AppHandle) {
    begin_stop(&app);
}

#[tauri::command]
fn open_app(app: tauri::AppHandle) {
    open_app_window(&app);
}

fn main() {
    let shared = Arc::new(Shared {
        starting: Mutex::new(false),
        last: Mutex::new(Status::Down),
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            show_main(app);
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .manage(shared.clone())
        .invoke_handler(tauri::generate_handler![
            status,
            start_stack,
            stop_stack,
            open_app
        ])
        .setup(move |app| {
            let open_i = MenuItem::with_id(app, "open", "Ouvrir l'application", true, None::<&str>)?;
            let panel_i =
                MenuItem::with_id(app, "panel", "Panneau de contrôle", true, None::<&str>)?;
            let start_i = MenuItem::with_id(app, "start", "Démarrer", true, None::<&str>)?;
            let stop_i = MenuItem::with_id(app, "stop", "Arrêter", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quitter", true, None::<&str>)?;
            let menu = Menu::with_items(
                app,
                &[&open_i, &panel_i, &start_i, &stop_i, &quit_i],
            )?;

            TrayIconBuilder::with_id("tray")
                .icon(icon_for(Status::Down))
                .tooltip(Status::Down.tooltip())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => open_app_window(app),
                    "panel" => show_main(app),
                    "start" => begin_start(app),
                    "stop" => begin_stop(app),
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
                        show_main(tray.app_handle());
                    }
                })
                .build(app)?;

            #[cfg(desktop)]
            {
                use tauri_plugin_autostart::ManagerExt;
                let _ = app.autolaunch().enable();
            }

            // Boot launch (--minimized) stays in the tray; manual launch shows the panel.
            let minimized = std::env::args().any(|a| a == "--minimized");
            if let Some(w) = app.get_webview_window("main") {
                if minimized {
                    let _ = w.hide();
                } else {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }

            let handle = app.handle().clone();
            let shared = shared.clone();
            std::thread::spawn(move || {
                let mut prev: Option<Status> = None;
                loop {
                    let probed = probe();
                    let starting = *shared.starting.lock().unwrap();
                    let status = match probed {
                        Status::Up => Status::Up,
                        Status::Starting => Status::Starting,
                        Status::Down => {
                            if starting {
                                Status::Starting
                            } else {
                                Status::Down
                            }
                        }
                    };
                    if probed == Status::Up {
                        *shared.starting.lock().unwrap() = false;
                    }
                    *shared.last.lock().unwrap() = status;

                    if prev != Some(status) {
                        prev = Some(status);
                        if let Some(tray) = handle.tray_by_id("tray") {
                            let _ = tray.set_icon(Some(icon_for(status)));
                            let _ = tray.set_tooltip(Some(status.tooltip()));
                        }
                        let _ = handle.emit("status", status.as_str());
                    }
                    std::thread::sleep(Duration::from_millis(1500));
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the control panel just hides it; quit only via the tray.
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running the verdure desktop app");
}
