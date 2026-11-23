import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ArrowLeft,
  BarChart3,
  Cpu,
  HardDrive,
  Info,
  Layers,
  Palette,
  Plus,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  AppSettings,
  ServiceConfig,
  ServiceUsageStat,
  SessionDiskUsage,
  ThemeMode,
  Workspace,
} from "../types/app";

interface SettingsModalProps {
  open: boolean;
  settings: AppSettings;
  workspaces: Workspace[];
  services: ServiceConfig[];
  usageStats: Record<string, ServiceUsageStat>;
  onClose: () => void;
  onOpenAbout: () => void;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onAddWorkspace: (name: string) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  onResetUsageStats: () => void;
}

type SettingsTab =
  | "appearance"
  | "performance"
  | "security"
  | "workspaces"
  | "storage";

function formatMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) return "0.0 MB";
  return `${mb.toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${remMins}m`;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  settings,
  workspaces,
  services,
  usageStats,
  onClose,
  onOpenAbout,
  onUpdateSettings,
  onAddWorkspace,
  onDeleteWorkspace,
  onResetUsageStats,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");
  const [newWsName, setNewWsName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [diskUsage, setDiskUsage] = useState<SessionDiskUsage[]>([]);
  const [cleaning, setCleaning] = useState(false);
  const [reclaimedMsg, setReclaimedMsg] = useState<string | null>(null);

  const loadDiskUsage = () => {
    invoke<SessionDiskUsage[]>("get_sessions_disk_usage")
      .then((res) => setDiskUsage(res))
      .catch(() => {});
  };

  useEffect(() => {
    if (open && activeTab === "storage") {
      loadDiskUsage();
    }
  }, [open, activeTab]);

  if (!open) return null;

  const isLight = settings.theme === "light";
  const pageBg =
    settings.theme === "oled"
      ? "bg-black text-zinc-100"
      : isLight
      ? "bg-slate-50 text-slate-900"
      : "bg-[#0D0F12] text-zinc-100";
  const cardBg = isLight
    ? "border-slate-200 bg-white"
    : "border-[#232730] bg-[#15181E]";
  const innerBg = isLight
    ? "border-slate-200 bg-slate-50"
    : "border-[#232730] bg-[#0D0F12]/70";

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newWsName.trim();
    if (!trimmed) return;
    onAddWorkspace(trimmed);
    setNewWsName("");
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPin.trim();
    if (trimmed.length < 4) return;
    const encoded = new TextEncoder().encode(trimmed);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    onUpdateSettings({ pinHash: hashHex });
    setNewPin("");
  };

  const handleReclaimCache = async () => {
    setCleaning(true);
    setReclaimedMsg(null);
    try {
      const reclaimed = await invoke<number>("reclaim_all_cache");
      setReclaimedMsg(`Freed ${formatMb(reclaimed)} of cached files!`);
      loadDiskUsage();
    } catch {
      setReclaimedMsg("Failed to clean some active caches.");
    } finally {
      setCleaning(false);
    }
  };

  const navItems: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "appearance",
      label: "Appearance & Startup",
      icon: <Palette className="h-4 w-4" />,
    },
    {
      id: "performance",
      label: "RAM & Hibernation",
      icon: <Cpu className="h-4 w-4" />,
    },
    {
      id: "security",
      label: "Security & Privacy",
      icon: <Shield className="h-4 w-4" />,
    },
    {
      id: "workspaces",
      label: "Workspaces",
      icon: <Layers className="h-4 w-4" />,
    },
    {
      id: "storage",
      label: "Storage & Usage Stats",
      icon: <HardDrive className="h-4 w-4" />,
    },
  ];

  const serviceMap = new Map(services.map((s) => [s.id, s]));
  const totalDiskBytes = diskUsage.reduce((acc, d) => acc + d.totalBytes, 0);
  const totalCacheBytes = diskUsage.reduce((acc, d) => acc + d.cacheBytes, 0);
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <section className={`flex flex-1 overflow-hidden ${pageBg}`}>
      {/* Left Settings Navigation */}
      <div
        className={`flex w-60 shrink-0 flex-col border-r p-4 ${
          isLight
            ? "border-slate-200 bg-slate-100"
            : "border-[#232730] bg-[#15181E]/60"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className={`mb-5 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
            isLight
              ? "border-slate-200 bg-white hover:bg-slate-50"
              : "border-[#232730] bg-[#0D0F12]/80 hover:border-[#F59E0B]/60 hover:text-[#F59E0B]"
          }`}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Chats
        </button>

        <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Settings
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-all ${
                  active
                    ? "bg-[#F59E0B] text-[#0D0F12] shadow-sm"
                    : isLight
                    ? "text-slate-600 hover:bg-slate-200/70"
                    : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100"
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={onOpenAbout}
          className={`mt-4 flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors ${
            isLight
              ? "border-slate-200 bg-white hover:bg-slate-50"
              : "border-[#232730] bg-[#0D0F12]/70 hover:border-[#F59E0B]/60 hover:text-[#F59E0B]"
          }`}
        >
          <Info className="h-4 w-4 text-[#F59E0B]" />
          About Molva
        </button>
      </div>

      {/* Right Settings Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {activeTab === "appearance" && (
            <>
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  Appearance &amp; Startup
                </h1>
                <p className="mt-1 text-xs text-zinc-400">
                  Choose your theme and how Molva behaves when Windows starts.
                </p>
              </div>

              <div className={`rounded-2xl border p-5 ${cardBg}`}>
                <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Theme
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(["dark", "oled", "light"] as ThemeMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onUpdateSettings({ theme: mode })}
                      className={`rounded-xl border px-4 py-3 text-xs font-semibold capitalize transition-all ${
                        settings.theme === mode
                          ? "border-[#F59E0B] bg-[#F59E0B]/15 text-[#F59E0B]"
                          : `${innerBg} hover:bg-white/5`
                      }`}
                    >
                      {mode === "oled" ? "OLED Black" : `${mode} Mode`}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`space-y-4 rounded-2xl border p-5 ${cardBg}`}>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  System &amp; Startup
                </label>
                <label className="flex cursor-pointer items-center justify-between gap-4">
                  <div>
                    <span className="text-sm font-medium">
                      Launch Molva when Windows starts
                    </span>
                    <p className="text-xs text-zinc-400">
                      Adds Molva to your Windows user startup registry.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.launchOnStartup ?? false}
                    onChange={(e) =>
                      onUpdateSettings({ launchOnStartup: e.target.checked })
                    }
                    className="h-4 w-4 accent-[#F59E0B]"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between gap-4">
                  <div>
                    <span className="text-sm font-medium">
                      Start quietly minimized in System Tray
                    </span>
                    <p className="text-xs text-zinc-400">
                      Starts in the background without popping open a window.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!settings.launchOnStartup}
                    checked={settings.startMinimized ?? false}
                    onChange={(e) =>
                      onUpdateSettings({ startMinimized: e.target.checked })
                    }
                    className="h-4 w-4 accent-[#F59E0B] disabled:opacity-40"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between gap-4">
                  <div>
                    <span className="text-sm font-medium">
                      Global Quick-Toggle Hotkey (Ctrl + Shift + M)
                    </span>
                    <p className="text-xs text-zinc-400">
                      Show or hide Molva from anywhere in Windows.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.globalHotkeyEnabled ?? true}
                    onChange={(e) =>
                      onUpdateSettings({
                        globalHotkeyEnabled: e.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-[#F59E0B]"
                  />
                </label>
              </div>
            </>
          )}

          {activeTab === "performance" && (
            <>
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  RAM &amp; True Hibernation
                </h1>
                <p className="mt-1 text-xs text-zinc-400">
                  Inactive WebView2 processes are closed to reclaim RAM while
                  preserving cookies on disk.
                </p>
              </div>

              <div className={`space-y-5 rounded-2xl border p-5 ${cardBg}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-sm font-medium">
                      Auto-hibernate inactive services after
                    </span>
                    <p className="text-xs text-zinc-400">
                      Services marked as Never Sleep or in Call Mode stay awake.
                    </p>
                  </div>
                  <select
                    value={settings.hibernationTimeoutMinutes}
                    onChange={(e) =>
                      onUpdateSettings({
                        hibernationTimeoutMinutes: Number(e.target.value),
                      })
                    }
                    className={`rounded-xl border px-3 py-2 text-xs outline-none focus:border-[#F59E0B] ${innerBg}`}
                  >
                    <option value={0}>Never</option>
                    <option value={1}>1 minute (Aggressive)</option>
                    <option value={3}>3 minutes</option>
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes (Default)</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>

                <label className="flex cursor-pointer items-center justify-between gap-4">
                  <div>
                    <span className="text-sm font-medium">
                      Hibernate previous workspace on switch
                    </span>
                    <p className="text-xs text-zinc-400">
                      Frees RAM immediately when switching between Work and
                      Personal.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.hibernateOnWorkspaceSwitch}
                    onChange={(e) =>
                      onUpdateSettings({
                        hibernateOnWorkspaceSwitch: e.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-[#F59E0B]"
                  />
                </label>
              </div>
            </>
          )}

          {activeTab === "security" && (
            <>
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  Security &amp; Privacy
                </h1>
                <p className="mt-1 text-xs text-zinc-400">
                  All credentials, PIN hashes and shields run 100% locally.
                </p>
              </div>

              <div className={`space-y-4 rounded-2xl border p-5 ${cardBg}`}>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Vault Lock PIN (SHA-256 Local)
                </label>
                <form onSubmit={handleSavePin} className="flex gap-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    placeholder={
                      settings.pinHash
                        ? "Enter new PIN (4+ chars) to change"
                        : "Set PIN (4+ chars)"
                    }
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className={`flex-1 rounded-xl border px-3.5 py-2.5 text-xs outline-none focus:border-[#F59E0B] ${innerBg}`}
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-[#F59E0B] px-4 py-2 text-xs font-bold text-[#0D0F12] hover:bg-amber-400"
                  >
                    Save PIN
                  </button>
                  {settings.pinHash && (
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ pinHash: null })}
                      className="rounded-xl border border-rose-500/40 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10"
                    >
                      Clear
                    </button>
                  )}
                </form>

                <div className="flex items-center justify-between gap-4 pt-2">
                  <div>
                    <span className="text-sm font-medium">
                      Idle Vault Lock (auto-lock)
                    </span>
                    <p className="text-xs text-zinc-400">
                      {settings.pinHash
                        ? "Locks Molva after system inactivity."
                        : "Set a PIN above to enable auto-lock."}
                    </p>
                  </div>
                  <select
                    disabled={!settings.pinHash}
                    value={settings.autoLockMinutes ?? 0}
                    onChange={(e) =>
                      onUpdateSettings({
                        autoLockMinutes: Number(e.target.value),
                      })
                    }
                    className={`rounded-xl border px-3 py-2 text-xs outline-none focus:border-[#F59E0B] disabled:opacity-40 ${innerBg}`}
                  >
                    <option value={0}>Off</option>
                    <option value={1}>1 minute</option>
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>
              </div>

              <div className={`space-y-4 rounded-2xl border p-5 ${cardBg}`}>
                <label className="flex cursor-pointer items-center justify-between gap-4">
                  <div>
                    <span className="text-sm font-medium">
                      Privacy Shield on window blur (Auto-hide chats)
                    </span>
                    <p className="text-xs text-zinc-400">
                      Hides chats when switching apps (manual toggle: Ctrl + B).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.privacyShieldOnBlur ?? false}
                    onChange={(e) =>
                      onUpdateSettings({
                        privacyShieldOnBlur: e.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-[#F59E0B]"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between gap-4">
                  <div>
                    <span className="text-sm font-medium">
                      Ask before opening external links
                    </span>
                    <p className="text-xs text-zinc-400">
                      Shows a clean confirmation dialog with the full URL
                      before launching your browser.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.askBeforeExternalLink ?? true}
                    onChange={(e) =>
                      onUpdateSettings({
                        askBeforeExternalLink: e.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-[#F59E0B]"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between gap-4">
                  <div>
                    <span className="text-sm font-medium">
                      Link Safety Guard (Anti-Phishing Preview)
                    </span>
                    <p className="text-xs text-zinc-400">
                      Warn before opening shorteners, IP links, HTTP or punycode
                      URLs.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.linkSafetyGuard ?? true}
                    onChange={(e) =>
                      onUpdateSettings({ linkSafetyGuard: e.target.checked })
                    }
                    className="h-4 w-4 accent-[#F59E0B]"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between gap-4">
                  <div>
                    <span className="text-sm font-medium">
                      Show Creator Updates &amp; Ecosystem Picks
                    </span>
                    <p className="text-xs text-zinc-400">
                      Fetches a static, anonymous JSON feed from molva.brand4e.bg
                      once every 12h (zero tracking).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showEcosystemPicks ?? true}
                    onChange={(e) =>
                      onUpdateSettings({ showEcosystemPicks: e.target.checked })
                    }
                    className="h-4 w-4 accent-[#F59E0B]"
                  />
                </label>
              </div>
            </>
          )}

          {activeTab === "workspaces" && (
            <>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Workspaces</h1>
                <p className="mt-1 text-xs text-zinc-400">
                  Organize chats into separate workspaces with Ctrl + 1 / 2 / 3.
                </p>
              </div>

              <div className={`space-y-3 rounded-2xl border p-5 ${cardBg}`}>
                {workspaces.map((ws) => (
                  <div
                    key={ws.id}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium ${innerBg}`}
                  >
                    <span>{ws.name}</span>
                    {workspaces.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteWorkspace(ws.id)}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}

                <form
                  onSubmit={handleCreateWorkspace}
                  className="flex gap-2 pt-2"
                >
                  <input
                    type="text"
                    placeholder="New workspace name"
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    className={`flex-1 rounded-xl border px-3.5 py-2.5 text-xs outline-none focus:border-[#F59E0B] ${innerBg}`}
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-xl bg-[#F59E0B] px-4 py-2 text-xs font-bold text-[#0D0F12] hover:bg-amber-400"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </form>
              </div>
            </>
          )}

          {activeTab === "storage" && (
            <>
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  Storage &amp; Usage Stats
                </h1>
                <p className="mt-1 text-xs text-zinc-400">
                  Inspect isolated session disk usage, reclaim cache, and view
                  local time spent per app.
                </p>
              </div>

              {/* Disk Space Cleaner */}
              <div className={`space-y-4 rounded-2xl border p-5 ${cardBg}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <HardDrive className="h-4 w-4 text-[#F59E0B]" />
                      Disk Space Cleaner
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      Total sessions: <strong>{formatMb(totalDiskBytes)}</strong>{" "}
                      • Cleanable cache:{" "}
                      <strong className="text-[#10B981]">
                        {formatMb(totalCacheBytes)}
                      </strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={cleaning}
                    onClick={handleReclaimCache}
                    className="flex items-center gap-1.5 rounded-xl bg-[#10B981] px-4 py-2 text-xs font-bold text-[#0D0F12] transition-colors hover:bg-emerald-400 disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {cleaning ? "Cleaning..." : "Reclaim Disk Space"}
                  </button>
                </div>

                {reclaimedMsg && (
                  <p className="text-xs font-medium text-[#10B981]">
                    {reclaimedMsg}
                  </p>
                )}

                <div className="space-y-2">
                  {diskUsage.length === 0 ? (
                    <p className="text-xs text-zinc-500">
                      No isolated sessions stored yet.
                    </p>
                  ) : (
                    diskUsage.map((item) => {
                      const svc = serviceMap.get(item.serviceId);
                      return (
                        <div
                          key={item.serviceId}
                          className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs ${innerBg}`}
                        >
                          <span className="font-semibold">
                            {svc?.name ?? item.serviceId}
                          </span>
                          <span className="text-zinc-400">
                            {formatMb(item.totalBytes)}{" "}
                            <span className="text-[#10B981]">
                              ({formatMb(item.cacheBytes)} cache)
                            </span>
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Service Usage Stats */}
              <div className={`space-y-4 rounded-2xl border p-5 ${cardBg}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <BarChart3 className="h-4 w-4 text-[#F59E0B]" />
                      Service Usage Stats (100% Local)
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      Time spent in each app today and all-time.
                    </p>
                  </div>
                  {Object.keys(usageStats).length > 0 && (
                    <button
                      type="button"
                      onClick={onResetUsageStats}
                      className="rounded-xl border border-[#232730] px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-white/5"
                    >
                      Reset Stats
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {services.length === 0 ? (
                    <p className="text-xs text-zinc-500">
                      Add a service to start tracking local usage.
                    </p>
                  ) : (
                    services.map((svc) => {
                      const st = usageStats[svc.id];
                      const todaySec =
                        st && st.lastDate === todayStr ? st.todaySeconds : 0;
                      const totalSec = st?.totalSeconds ?? 0;
                      return (
                        <div
                          key={svc.id}
                          className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs ${innerBg}`}
                        >
                          <span className="font-semibold">{svc.name}</span>
                          <span className="text-zinc-400">
                            Today:{" "}
                            <strong className="text-[#F59E0B]">
                              {formatDuration(todaySec)}
                            </strong>{" "}
                            • Total: {formatDuration(totalSec)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
