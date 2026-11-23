<div align="center">
  <img src="src/assets/logo.png" width="96" alt="Molva Logo" />
  <h1>Molva</h1>
  <p><strong>“Where all whispers meet”</strong></p>
  <p>
    An ultra-lightweight, privacy-first, open-source workspace &amp; messenger shell built with <strong>Rust + Tauri v2</strong> and native OS webviews (<strong>0% Electron</strong>).<br />
    Named after the Old Bulgarian word <em>мълва</em> (<em>molva</em> — whisper, talk, word-of-mouth).
  </p>

  <p>
    <a href="https://github.com/itskodimitrov/molva/actions/workflows/ci.yml">
      <img src="https://github.com/itskodimitrov/molva/actions/workflows/ci.yml/badge.svg" alt="CI Check" />
    </a>
    <a href="https://github.com/itskodimitrov/molva/releases/latest">
      <img src="https://img.shields.io/github/v/release/itskodimitrov/molva?label=Release&color=F59E0B" alt="Latest Release v1.0.0" />
    </a>
    <a href="LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT License" />
    </a>
    <img src="https://img.shields.io/badge/Built%20with-Rust%20%2B%20Tauri%20v2-F59E0B" alt="Built with Rust + Tauri v2" />
    <img src="https://img.shields.io/badge/Electron-0%25-10B981" alt="0% Electron" />
  </p>

  <p>
    <a href="https://molva.brand4e.bg">Website (molva.brand4e.bg)</a> •
    <a href="https://github.com/itskodimitrov/molva/releases/latest">Download Latest Release</a> •
    <a href="SECURITY.md">Security Architecture</a> •
    <a href="https://give.brand4e.bg">Brand4e Ecosystem (give.brand4e.bg)</a>
  </p>
</div>

---

## Why Molva? (Verifiable Engineering vs. Electron Wrappers)

Most multi-messenger desktops bundle an entire copy of Chromium + Node.js via Electron. Molva compiles to a native Rust binary using Tauri v2 and delegates rendering directly to the operating system's native webview engine.

| Engineering Criterion | Molva | Ferdium | Rambox |
| :--- | :--- | :--- | :--- |
| **Core Runtime** | **Rust + Tauri v2 + OS Native WebView2** | Bundled Chromium + Node.js (Electron) | Bundled Chromium + Node.js (Electron) |
| **True Process Hibernation** | Calls `.close()` on inactive WebView2 instances (`0 MB` active RAM, cookies preserved on disk) | JS-level tab suspension / reload | JS-level tab suspension / reload |
| **Background Tab Memory Shrinking** | Direct Win32 COM `ICoreWebView2_19::SetMemoryUsageTargetLevel(LOW)` on tab switch | Standard Chromium background throttling | Standard Chromium background throttling |
| **Cloud Account Requirement** | **100% Local-First** (`config.json`, no account required) | Optional / local or server sync | Cloud account login required |
| **Child Webview IPC Security** | **Zero IPC handler** (`capabilities/default.json` scoped strictly to `["main"]`) | Electron preload / IPC bridge | Electron preload / IPC bridge |
| **Anti-Phishing & Link Unwrapper** | Unwraps `l.messenger.com`, `l.facebook.com`, `l.instagram.com`, and Google redirect shims; warns on punycode (`xn--`), raw IPs, HTTP, `@` user-info, and shortlinks | Basic external link opening | Basic external link opening |

---

## Feature Breakdown

| Feature | Technical Implementation |
| :--- | :--- |
| **Resizable Split View (20%–80%)** | Side-by-side multi-service workspace with interactive drag divider (`20%` to `80%` split ratio) and instant swap/close controls. |
| **Meeting / Call Mode** | Dedicated distraction-free call layout with persistent mic/camera permission handling in native WebView2. |
| **Per-Service Quiet Hours** | Independent per-workspace mute & schedule rules (e.g., silence work Slack/Teams outside office hours). |
| **Vault Lock & Idle Auto-Lock** | Local SHA-256 PIN lock (`Ctrl + L`) plus Win32 `GetLastInputInfo` system-wide idle detection to lock automatically when you step away. |
| **Privacy Shield** | Instant blur/lock overlay (`Ctrl + B`) with optional **Auto-shield on window blur** to hide chats whenever Molva loses focus. |
| **Docked Downloads Manager** | Native `ICoreWebView2_4` `DownloadStarting` hook with live progress, completed state tracking, and one-click file/folder reveal. |
| **Docked Scratchpad & Tasks** | Built-in local notes and categorized to-do checklist (`Ctrl + N`) stored locally alongside your workspace. |
| **1-Click Disk Cache Cleaner** | Safely purges `Cache`, `Code Cache`, `GPUCache`, and `DawnCache` across service data directories while preserving login cookies. |
| **Live Process-Tree RAM Counter** | Real-time Win32 `K32GetProcessMemoryInfo` working-set measurement across Molva and all active WebView2 descendant processes. |

---

## Keyboard Shortcuts (Layout-Independent via `e.code`)

All in-app shortcuts use physical key codes (`e.code`), so they work reliably regardless of whether your keyboard is currently set to English, Bulgarian, or another layout.

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Shift + M` | **Global Toggle** — Win32 system-wide hotkey to show/hide Molva from anywhere |
| `Ctrl + 1` … `Ctrl + 9` | **Switch Workspace** — Jump directly to pinned services 1–9 |
| `Ctrl + L` | **Vault Lock** — Immediately lock Molva behind your SHA-256 PIN |
| `Ctrl + B` | **Privacy Shield** — Toggle instant privacy blur overlay |
| `Ctrl + N` | **Scratchpad & Tasks** — Toggle the docked notes and checklist panel |

---

## Built-In Service Presets (31 Presets + Custom URL)

Every service runs in its own isolated `data_directory` so you can sign into multiple accounts (work + personal) side by side with zero cookie bleed.

| Category | Included Presets |
| :--- | :--- |
| **Messengers & Team Chat (12)** | WhatsApp, Messenger, Telegram, Discord, Slack, Microsoft Teams, Google Messages, Element, Rocket.Chat, Mattermost, Zulip, WeChat |
| **Video & Audio Meetings (3)** | Zoom, Google Meet, Webex |
| **Email Communication (6)** | Gmail, Outlook, Proton Mail, Yahoo Mail, Tuta Mail, Fastmail |
| **Social DMs & Communities (7)** | Instagram, LinkedIn, X Messages, Reddit Chat, Facebook, Guilded, Twitch |
| **Productivity & AI (3)** | Notion, ChatGPT, Google Calendar |
| **Custom Web Apps** | Add **any custom URL** with isolated session storage, custom name, and accent color |

---

## Platform Support Note (Windows-First Architecture)

> **Note:** Molva is designed **Windows-first** with deep native Win32 & WebView2 COM integrations (live process-tree RAM counter, low-memory target levels, native download manager, system idle auto-lock, startup registry, and global hotkeys).
>
> Experimental **macOS** (`.dmg` for Apple Silicon & Intel) and **Linux** (`.AppImage` & `.deb`) builds are provided via GitHub Actions for core multi-webview session isolation and tab hibernation.

---

## More from the Brand4e Ecosystem

- **[Molva Official Portal](https://molva.brand4e.bg)** — Releases, updates, and project home.
- **[Give by Brand4e](https://give.brand4e.bg)** — Fast, simple & free giveaways, raffles, and community utilities by Brand4e.

---

## Development

```powershell
# Install frontend dependencies
npm install

# Run in development mode (Vite + Tauri v2)
npm run tauri dev

# Build production installers
npm run tauri build
```

---

## Legal, Trademarks & Warranty Disclaimer

1. **Non-Affiliation & Trademarks:**  
   Molva is an independent open-source web browser shell and is not affiliated with, endorsed by, or sponsored by WhatsApp, Meta, Discord, Slack, Telegram, Google, Microsoft, OpenAI, or any other third-party service included in the presets. All product names, logos, and brands are property of their respective owners.

2. **No-Warranty (As-Is) Liability Shield:**  
   Molva is open-source software licensed under the **MIT License**. It is provided **"AS IS"**, without warranty of any kind, express or implied. The authors and contributors shall not be liable for any data loss, session interruptions, or third-party account restrictions/bans.

3. **100% Local Data Processing:**  
   Molva does not collect, store, or transmit user sessions, messages, or passwords to any external servers. If the optional *"Show Creator Updates & Ecosystem Picks"* setting is enabled, Molva fetches only a static, anonymous JSON catalog from `molva.brand4e.bg` without any personal identifiers.
