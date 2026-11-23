# Molva

> **“Where all whispers meet”** — An ultra-lightweight, privacy-first, open-source workspace & messenger shell for **Windows, macOS, and Linux**, built with **Rust + Tauri v2** and native OS webviews (WebView2 / WKWebView / WebKitGTK, 0% Electron).

## Highlights
- **Session Isolation:** Every added service runs in its own sandboxed `data_directory` so multiple accounts stay completely separate.
- **True RAM Hibernation:** Inactive tabs close their WebView2 processes (`0 MB RAM`) while preserving persistent login sessions on disk.
- **Built-in Productivity:** Resizable Split View, Call Mode, Quiet Hours per service, Docked Downloads & Scratchpad/Tasks panels, Vault Lock (`Ctrl + L`), Privacy Shield (`Ctrl + B`), and Link Safety Guard.
- **Local-First:** All configuration, PIN hashes (SHA-256), notes, and usage stats remain 100% on your device.

## Legal, Trademarks & Warranty Disclaimer

1. **Non-Affiliation & Trademarks:**  
   Molva is an independent open-source web browser shell and is not affiliated with, endorsed by, or sponsored by WhatsApp, Meta, Discord, Slack, Telegram, Google, Microsoft, OpenAI, or any other third-party service included in the presets. All product names, logos, and brands are property of their respective owners.

2. **No-Warranty (As-Is) Liability Shield:**  
   Molva is open-source software licensed under the **MIT License**. It is provided **"AS IS"**, without warranty of any kind, express or implied. The authors and contributors shall not be liable for any data loss, session interruptions, or third-party account restrictions/bans.

3. **100% Local Data Processing:**  
   Molva does not collect, store, or transmit user sessions, messages, or passwords to any external servers. If the optional *"Show Creator Updates & Ecosystem Picks"* setting is enabled, Molva fetches only a static, anonymous JSON catalog from `molva.brand4e.bg` once every 12 hours without any personal identifiers.

## Development

```powershell
npm install
npm run tauri dev
```
