// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::{thread, time::Duration};
use std::{io::{BufReader, Read}, process::{Command, Stdio}};

use tauri::{Manager, State};

#[derive(Clone, serde::Serialize)]
struct Payload {
  message: String,
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
// #[tauri::command]
// fn greet(name: &str) -> String {
//     format!("Hello, {}! You've been greeted from Rust!", name)
// }

/*
    This function spawns a new thread to continuously run a small C++ binary that has
    been compiled.  It listens to the default sink source of audio and sends to API
    for transcription.  

    TODO This spawns the C++ binary because I originally wrote it using PulseAudio C library
    and there is an equivalent Rust library but I have not got it working yet.  Until 
    then this is the workaround to use in Tauri app. -George Balch
*/
#[tauri::command]
async fn listen(app_handle: tauri::AppHandle, stop_flag: Arc<AtomicBool>) {
    let mut child = Command::new("./scribe/scribe").stdout(Stdio::piped()).spawn().expect("Spawning listener failed.");
    let stdout = child.stdout.take().expect("Failed to open stdout.");
    let mut reader = BufReader::new(stdout);

    let mut buf = [0; 2048];
    while !stop_flag.load(Ordering::Relaxed) {
        match reader.read(&mut buf) {
            Ok(nbytes) => {
                let buffer_contents = &buf[..nbytes];
                if let Some(start_index) = buffer_contents.windows(5).position(|window| window == b"[seg]") {
                    // Adjust start_index to get text after "[seg]"
                    let start_text_index = start_index + 5;
                    // Find the start index of "[end]" after "[seg]"
                    if let Some(end_index) = buffer_contents[start_text_index..].windows(5).position(|window| window == b"[end]") {
                        // Extract text between "[seg]" and "[end]"
                        let text_between = &buffer_contents[start_text_index..start_text_index + end_index];
                        app_handle.emit_all("transcription", String::from_utf8_lossy(text_between))
                            .expect("Failed to emit transcription event.");
                    }
                }
            },
            _ => {},
        }
    }

    child.kill().expect("Failed to kill child process.");
}

#[tauri::command]
fn start_listening(app_handle: tauri::AppHandle, stop_flag: State<'_, Arc<AtomicBool>>) {
    stop_flag.store(false, Ordering::Relaxed);
    let stop_flag_clone = stop_flag.inner().clone();
    tauri::async_runtime::spawn(listen(app_handle, stop_flag_clone));
}

#[tauri::command]
fn stop_listening(stop_flag: State<'_, Arc<AtomicBool>>) {
    stop_flag.store(true, Ordering::Relaxed);
}

fn main() {
    tauri::Builder::default()
        .manage(Arc::new(AtomicBool::new(false)))
        .invoke_handler(tauri::generate_handler![start_listening, stop_listening])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}