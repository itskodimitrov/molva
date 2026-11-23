# Security Policy

## Supported Versions
Security fixes are applied to the latest release (`v1.0.0` and newer).

## Security Architecture
- **Zero IPC in Service Webviews:** Child webviews running third-party web applications receive no Tauri IPC handler and zero ACL capability grants (`src-tauri/capabilities/default.json` is strictly scoped to `"webviews": ["main"]`).
- **Session Isolation:** Each service uses an isolated `data_directory` under the user's local application data folder.
- **Local-First Storage:** All settings, notes, usage stats, and Vault Lock PIN hashes (SHA-256) remain strictly on the user's device.

## Reporting a Vulnerability
If you discover a security vulnerability in Molva, please do **not** open a public issue with exploit details. Contact the maintainers privately via `https://molva.brand4e.bg` or open a private security advisory on GitHub.
