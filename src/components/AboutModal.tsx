import React, { useRef, useState } from "react";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import {
  Bug,
  CheckCircle2,
  FileText,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import logoImg from "../assets/logo.png";
import { ThemeMode } from "../types/app";

interface AboutModalProps {
  open: boolean;
  theme: ThemeMode;
  onClose: () => void;
}

const APP_VERSION = "v1.0.0";
const GITHUB_REPO = "https://github.com/molva-app/molva";
const GITHUB_ISSUES = "https://github.com/molva-app/molva/issues";
const GITHUB_RELEASES_API =
  "https://api.github.com/repos/molva-app/molva/releases/latest";

const MIT_LICENSE_TEXT = `MIT License

Copyright (c) ${new Date().getFullYear()} Molva Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

const UNDER_THE_HOOD = [
  "Built with Rust + Tauri v2",
  "Native Windows WebView2 (COM API)",
  "0% Electron",
  "Local-First Architecture",
];

const PRIVACY_AUDIT = [
  "100% Local Sessions & Config (No cloud account required)",
  "Sandboxed Sessions per App",
  "Zero Child Webview IPC Access",
  "Zero Telemetry & Analytics",
];

export const AboutModal: React.FC<AboutModalProps> = ({
  open,
  theme,
  onClose,
}) => {
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [showLicense, setShowLicense] = useState(false);
  const [easterEggUnlocked, setEasterEggUnlocked] = useState(false);
  const clickTimestamps = useRef<number[]>([]);

  if (!open) return null;

  const isLight = theme === "light";

  const handleLogoClick = () => {
    const now = Date.now();
    const recent = clickTimestamps.current.filter((t) => now - t < 2000);
    recent.push(now);
    clickTimestamps.current = recent;

    if (recent.length >= 5) {
      setEasterEggUnlocked((prev) => !prev);
      clickTimestamps.current = [];
    }
  };

  const handleCheckUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateStatus(null);
    const currentClean = APP_VERSION.replace(/^v/i, "");
    try {
      const feedRes = await fetch("https://molva.brand4e.bg/api/feed.php", {
        headers: { Accept: "application/json" },
      });
      if (feedRes.ok) {
        const feedData = (await feedRes.json()) as { latest_version?: string };
        const latest = (feedData.latest_version ?? currentClean).replace(
          /^v/i,
          ""
        );
        if (latest === currentClean) {
          setUpdateStatus(`You're up to date (${APP_VERSION}).`);
        } else {
          setUpdateStatus(`New version available: v${latest}`);
        }
        return;
      }
      throw new Error("Feed unavailable");
    } catch {
      try {
        const ghRes = await fetch(GITHUB_RELEASES_API, {
          headers: { Accept: "application/vnd.github+json" },
        });
        if (!ghRes.ok) {
          setUpdateStatus(
            `You are running ${APP_VERSION} (latest local build).`
          );
        } else {
          const data = (await ghRes.json()) as { tag_name?: string };
          const latest = (data.tag_name ?? APP_VERSION).replace(/^v/i, "");
          if (latest === currentClean) {
            setUpdateStatus(`You're up to date (${APP_VERSION}).`);
          } else {
            setUpdateStatus(`New version available: v${latest}`);
          }
        }
      } catch {
        setUpdateStatus(
          `Running ${APP_VERSION}. Could not reach update server.`
        );
      }
    } finally {
      setCheckingUpdate(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
      <div
        className={`relative max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-2xl border p-7 shadow-2xl ${
          isLight
            ? "border-slate-200 bg-white text-slate-900"
            : "border-[#232730] bg-[#15181E] text-zinc-100"
        }`}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Hero Section */}
        <div className="flex flex-col items-center text-center">
          <button
            type="button"
            onClick={handleLogoClick}
            title="Molva"
            className={`mb-3 flex h-20 w-20 items-center justify-center rounded-2xl border p-3 transition-all ${
              easterEggUnlocked
                ? "border-[#F59E0B] bg-[#0D0F12] ring-2 ring-[#F59E0B]/50 shadow-lg shadow-amber-500/20"
                : isLight
                ? "border-slate-200 bg-slate-50"
                : "border-[#232730] bg-[#0D0F12]"
            }`}
          >
            <img
              src={logoImg}
              alt="Molva Logo"
              className="h-full w-full object-contain"
            />
          </button>

          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">Molva</h2>
            <span className="rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#F59E0B]">
              {APP_VERSION}
            </span>
          </div>

          <p className="mt-1 text-sm font-medium text-[#F59E0B]">
            “Where all whispers meet”
          </p>

          <p
            className={`mt-2 max-w-md text-xs leading-relaxed ${
              isLight ? "text-slate-600" : "text-zinc-400"
            }`}
          >
            Named after the Old Bulgarian word <em>мълва</em> — meaning a
            lively murmur, spoken exchange, and the flow of everyday
            conversations.
          </p>

          {easterEggUnlocked && (
            <div className="mt-3 flex items-center gap-1.5 rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-3 py-1 text-xs font-medium text-[#F59E0B]">
              <Sparkles className="h-3.5 w-3.5" />
              Crafted with Rust, White Monsters, and shisha
            </div>
          )}
        </div>

        {/* Under the Hood */}
        <div className="mt-6">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Under the Hood
          </div>
          <div className="flex flex-wrap gap-1.5">
            {UNDER_THE_HOOD.map((badge) => (
              <span
                key={badge}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  isLight
                    ? "border-slate-200 bg-slate-100 text-slate-700"
                    : "border-[#232730] bg-[#0D0F12] text-zinc-300"
                }`}
              >
                {badge}
              </span>
            ))}
          </div>
        </div>

        {/* Community & Updates */}
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => openExternal(GITHUB_REPO).catch(() => {})}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              isLight
                ? "border-slate-200 hover:bg-slate-100"
                : "border-[#232730] bg-[#0D0F12]/60 hover:border-[#F59E0B]/60 hover:text-[#F59E0B]"
            }`}
          >
            <Star className="h-3.5 w-3.5 text-[#F59E0B]" />
            Star on GitHub
          </button>

          <button
            type="button"
            onClick={() => openExternal(GITHUB_ISSUES).catch(() => {})}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              isLight
                ? "border-slate-200 hover:bg-slate-100"
                : "border-[#232730] bg-[#0D0F12]/60 hover:border-white/25"
            }`}
          >
            <Bug className="h-3.5 w-3.5 text-zinc-400" />
            Report a Bug
          </button>

          <button
            type="button"
            disabled={checkingUpdate}
            onClick={handleCheckUpdates}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              isLight
                ? "border-slate-200 hover:bg-slate-100"
                : "border-[#232730] bg-[#0D0F12]/60 hover:border-[#10B981]/60 hover:text-[#10B981]"
            }`}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-[#10B981] ${
                checkingUpdate ? "animate-spin" : ""
              }`}
            />
            {checkingUpdate ? "Checking..." : "Check Updates"}
          </button>
        </div>

        {updateStatus && (
          <p className="mt-2 text-center text-xs text-zinc-400">
            {updateStatus}
          </p>
        )}

        {/* Security & Privacy Audit */}
        <div
          className={`mt-5 rounded-xl border p-4 ${
            isLight
              ? "border-slate-200 bg-slate-50"
              : "border-[#232730] bg-[#0D0F12]/70"
          }`}
        >
          <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <Shield className="h-3.5 w-3.5 text-[#10B981]" />
            Security &amp; Privacy Audit
          </div>
          <ul className="space-y-1.5 text-xs">
            {PRIVACY_AUDIT.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#10B981]" />
                <span>{item}</span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-2 pt-0.5">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#10B981]" />
                <span>Open-Source under MIT License</span>
              </span>
              <button
                type="button"
                onClick={() => setShowLicense((prev) => !prev)}
                className="flex items-center gap-1 rounded-md border border-[#232730] px-2 py-0.5 text-[11px] font-medium text-[#F59E0B] hover:bg-white/5"
              >
                <FileText className="h-3 w-3" />
                {showLicense ? "Hide License" : "View License"}
              </button>
            </li>
          </ul>

          {showLicense && (
            <pre
              className={`mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg border p-3 font-mono text-[10px] leading-relaxed ${
                isLight
                  ? "border-slate-200 bg-white text-slate-600"
                  : "border-[#232730] bg-[#15181E] text-zinc-400"
              }`}
            >
              {MIT_LICENSE_TEXT}
            </pre>
          )}
        </div>

        {/* Legal, Trademarks & Warranty Disclaimer */}
        <div
          className={`mt-4 rounded-xl border p-4 text-xs ${
            isLight
              ? "border-slate-200 bg-slate-50 text-slate-600"
              : "border-[#232730] bg-[#0D0F12]/50 text-zinc-400"
          }`}
        >
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Legal, Trademarks &amp; Warranty Disclaimer
          </div>
          <div className="space-y-2 leading-relaxed">
            <p>
              <strong className="text-zinc-200">
                1. Non-Affiliation &amp; Trademarks:
              </strong>{" "}
              Molva is an independent open-source web browser shell and is not
              affiliated with, endorsed by, or sponsored by WhatsApp, Meta,
              Discord, Slack, Telegram, Google, Microsoft, OpenAI, or any other
              third-party service included in the presets. All product names,
              logos, and brands are property of their respective owners.
            </p>
            <p>
              <strong className="text-zinc-200">
                2. No-Warranty (As-Is) Liability Shield:
              </strong>{" "}
              Under the MIT License, this software is provided &ldquo;AS
              IS&rdquo;, without warranty of any kind. The authors shall not be
              liable for any data loss, session interruptions, or third-party
              account actions.
            </p>
            <p>
              <strong className="text-zinc-200">
                3. 100% Local Data Processing:
              </strong>{" "}
              Molva does not collect, store, or transmit user sessions,
              messages, or passwords to any external servers. When Creator
              Updates are enabled, only a static, anonymous JSON catalog is
              fetched from{" "}
              <span className="text-[#F59E0B]">molva.brand4e.bg</span> without
              any personal identifiers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
