import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Eye, Plus, RefreshCw, Shield, WifiOff, Zap } from "lucide-react";
import logoImg from "./assets/logo.png";
import { AboutModal } from "./components/AboutModal";
import { AddServiceModal } from "./components/AddServiceModal";
import { CreatorLabModal } from "./components/CreatorLabModal";
import { DownloadsModal } from "./components/DownloadsModal";
import { LinkSafetyModal } from "./components/LinkSafetyModal";
import { PinLockOverlay } from "./components/PinLockOverlay";
import { QuietHoursModal } from "./components/QuietHoursModal";
import { ScratchpadPanel } from "./components/ScratchpadPanel";
import { SettingsModal } from "./components/SettingsModal";
import { Sidebar } from "./components/Sidebar";
import { TitleBar } from "./components/TitleBar";
import { appendSrcParam, useEcosystemFeed } from "./services/ecosystemFeed";
import {
  AppConfig,
  AppSettings,
  DownloadItem,
  LinkSafetyPrompt,
  NoteItem,
  QuietHoursConfig,
  ServiceConfig,
  ThemeMode,
} from "./types/app";
import "./App.css";

const COMPACT_WIDTH = 72;
const EXPANDED_WIDTH = 248;

function isNowInQuietHours(qh?: QuietHoursConfig): boolean {
  if (!qh || !qh.enabled) return false;
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 6 = Sat
  if (qh.weekends && (day === 0 || day === 6)) return true;

  const [sh, sm] = qh.startTime.split(":").map(Number);
  const [eh, em] = qh.endTime.split(":").map(Number);
  if (Number.isNaN(sh) || Number.isNaN(eh)) return false;

  const currentMins = now.getHours() * 60 + now.getMinutes();
  const startMins = sh * 60 + (sm || 0);
  const endMins = eh * 60 + (em || 0);

  if (startMins <= endMins) {
    return currentMins >= startMins && currentMins < endMins;
  }
  // Overnight range (e.g., 18:30 -> 09:00)
  return currentMins >= startMins || currentMins < endMins;
}

export function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loadedServiceIds, setLoadedServiceIds] = useState<Set<string>>(
    () => new Set()
  );
  const [mutedServiceIds, setMutedServiceIds] = useState<Set<string>>(
    () => new Set()
  );
  const [quietServiceIds, setQuietServiceIds] = useState<Set<string>>(
    () => new Set()
  );
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [memoryMb, setMemoryMb] = useState<number>(0);
  const [splitServiceId, setSplitServiceId] = useState<string | null>(null);
  const [splitRatio, setSplitRatio] = useState<number>(0.5);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [callModeServiceId, setCallModeServiceId] = useState<string | null>(
    null
  );
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [creatorLabOpen, setCreatorLabOpen] = useState(false);
  const [quietHoursService, setQuietHoursService] =
    useState<ServiceConfig | null>(null);
  const [linkSafetyPrompt, setLinkSafetyPrompt] =
    useState<LinkSafetyPrompt | null>(null);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [rightPanel, setRightPanel] = useState<
    "none" | "downloads" | "scratchpad"
  >("none");
  const [privacyShieldManual, setPrivacyShieldManual] = useState(false);
  const [privacyShieldBlur, setPrivacyShieldBlur] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [checkingNetwork, setCheckingNetwork] = useState(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [notifToast, setNotifToast] = useState<{
    serviceId: string;
    name: string;
    count: number;
  } | null>(null);
  const seenDownloadsRef = useRef<Set<string>>(new Set());
  const prevUnreadRef = useRef<Record<string, number>>({});
  const [locked, setLocked] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);

  const showEcosystemPicks = config?.settings.showEcosystemPicks ?? true;
  const {
    feed: ecosystemFeed,
    isPromoDismissed,
    hasUnreadProjects,
    dismissPromo,
    markProjectsSeen,
  } = useEcosystemFeed(showEcosystemPicks);

  const privacyShieldActive = privacyShieldManual || privacyShieldBlur;

  const persistConfig = useCallback(async (next: AppConfig) => {
    setConfig(next);
    try {
      await invoke("save_app_config", { config: next });
    } catch (err) {
      console.error("Failed to save config:", err);
    }
  }, []);

  // Load initial config & active webview list
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [cfg, activeIds] = await Promise.all([
          invoke<AppConfig>("get_app_config"),
          invoke<string[]>("list_active_services"),
        ]);
        if (!mounted) return;
        setConfig(cfg);
        setSplitRatio(cfg.settings.splitRatio ?? 0.5);
        setLoadedServiceIds(new Set(activeIds));

        if (cfg.activeServiceId) {
          const svc = cfg.services.find((s) => s.id === cfg.activeServiceId);
          if (svc) {
            const sw = cfg.settings.sidebarCollapsed
              ? COMPACT_WIDTH
              : EXPANDED_WIDTH;
            await invoke("activate_service", {
              serviceId: svc.id,
              url: svc.url,
              sidebarWidth: sw,
            });
            if (mounted) {
              setLoadedServiceIds((prev) => new Set(prev).add(svc.id));
            }
          }
        }
      } catch (err) {
        console.error("Failed to initialize MessinOne:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Listen for background auto-hibernation, unread title, and idle auto-lock events from Rust
  useEffect(() => {
    const unlistenHibernate = listen<string>("service-hibernated", (event) => {
      setLoadedServiceIds((prev) => {
        const next = new Set(prev);
        next.delete(event.payload);
        return next;
      });
    });

    const unlistenUnread = listen<{ serviceId: string; count: number }>(
      "service-unread-changed",
      (event) => {
        const { serviceId, count } = event.payload;
        const prevCount = prevUnreadRef.current[serviceId] ?? 0;
        prevUnreadRef.current[serviceId] = count;

        setUnreadCounts((prev) => ({
          ...prev,
          [serviceId]: count,
        }));

        if (
          count > prevCount &&
          !config?.settings.focusMode &&
          config?.activeServiceId !== serviceId
        ) {
          const svc = config?.services.find((s) => s.id === serviceId);
          if (svc) {
            setNotifToast({ serviceId, name: svc.name, count });
          }
        }
      }
    );

    const unlistenAutoLock = listen("auto-lock-triggered", () => {
      setLocked(true);
    });

    const unlistenLinkSafety = listen<LinkSafetyPrompt>(
      "link-safety-prompt",
      (event) => {
        setLinkSafetyPrompt(event.payload);
      }
    );

    const unlistenDownload = listen<DownloadItem>(
      "download-updated",
      (event) => {
        const item = event.payload;
        if (!seenDownloadsRef.current.has(item.id)) {
          seenDownloadsRef.current.add(item.id);
          // Auto-open the right Downloads panel on a brand new download so the user always sees it
          setRightPanel("downloads");
        }
        setDownloads((prev) => {
          const idx = prev.findIndex((d) => d.id === item.id);
          if (idx === -1) {
            return [item, ...prev].slice(0, 50);
          }
          const copy = [...prev];
          copy[idx] = item;
          return copy;
        });
      }
    );

    return () => {
      unlistenHibernate.then((unlisten) => unlisten());
      unlistenUnread.then((unlisten) => unlisten());
      unlistenAutoLock.then((unlisten) => unlisten());
      unlistenLinkSafety.then((unlisten) => unlisten());
      unlistenDownload.then((unlisten) => unlisten());
    };
  }, []);

  // Auto Privacy Shield on window blur (when enabled in Settings)
  useEffect(() => {
    const unlistenFocus = listen<boolean>("window-focus-changed", (event) => {
      if (!config?.settings.privacyShieldOnBlur) {
        setPrivacyShieldBlur(false);
        return;
      }
      setPrivacyShieldBlur(!event.payload);
    });
    return () => {
      unlistenFocus.then((unlisten) => unlisten());
    };
  }, [config?.settings.privacyShieldOnBlur]);

  // Monitor internet connectivity (Rust TCP watchdog + browser online/offline events)
  useEffect(() => {
    invoke<boolean>("check_internet_connection")
      .then((online) => setIsOffline(!online))
      .catch(() => {});

    const unlistenNet = listen<boolean>("network-status-changed", (event) => {
      setIsOffline(!event.payload);
    });
    const handleOnline = () => {
      invoke<boolean>("check_internet_connection")
        .then((online) => setIsOffline(!online))
        .catch(() => setIsOffline(false));
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      unlistenNet.then((unlisten) => unlisten());
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Auto-dismiss in-app notification toast after 4.5s
  useEffect(() => {
    if (!notifToast) return;
    const t = setTimeout(() => setNotifToast(null), 4500);
    return () => clearTimeout(t);
  }, [notifToast]);

  // Sync total unread count to system tray icon & tooltip
  useEffect(() => {
    if (!config) return;
    const totalUnread = config.settings.focusMode
      ? 0
      : Object.values(unreadCounts).reduce((sum, n) => sum + n, 0);
    invoke("set_tray_unread", { totalUnread }).catch(() => {});
  }, [unreadCounts, config]);

  // Hide native child webview while modals, Privacy Shield, Offline Screen, App Lock, or compact context menu are open
  useEffect(() => {
    if (!config) return;
    invoke("set_content_hidden", {
      hidden:
        addOpen ||
        settingsOpen ||
        aboutOpen ||
        creatorLabOpen ||
        quietHoursService !== null ||
        linkSafetyPrompt !== null ||
        privacyShieldActive ||
        isOffline ||
        locked ||
        contextMenuOpen,
    }).catch(() => {});
  }, [
    addOpen,
    settingsOpen,
    aboutOpen,
    creatorLabOpen,
    quietHoursService,
    linkSafetyPrompt,
    privacyShieldActive,
    isOffline,
    locked,
    contextMenuOpen,
    config,
  ]);

  // Resize child webviews cleanly when the right panel (Downloads / Scratchpad) opens/closes
  useEffect(() => {
    if (!config) return;
    invoke("set_right_drawer_width", {
      width: rightPanel !== "none" ? 340 : 0,
    }).catch(() => {});
  }, [rightPanel, config]);

  // Scheduled Focus Mode (Quiet Hours) per service — evaluated every 30s & on config change
  useEffect(() => {
    if (!config) return;
    const evaluateQuietHours = () => {
      const nextQuiet = new Set<string>();
      for (const svc of config.services) {
        const activeQuiet = isNowInQuietHours(svc.quietHours);
        if (activeQuiet) {
          nextQuiet.add(svc.id);
        }
        if (loadedServiceIds.has(svc.id)) {
          const shouldMute = activeQuiet || mutedServiceIds.has(svc.id);
          invoke("set_service_muted", {
            serviceId: svc.id,
            muted: shouldMute,
          }).catch(() => {});
        }
      }
      setQuietServiceIds(nextQuiet);
    };
    evaluateQuietHours();
    const timer = setInterval(evaluateQuietHours, 30000);
    return () => clearInterval(timer);
  }, [config, loadedServiceIds, mutedServiceIds]);

  // Poll real RAM usage (MB) every 5s
  useEffect(() => {
    const refreshMemory = () => {
      invoke<number>("get_memory_usage_mb")
        .then((mb) => setMemoryMb(mb))
        .catch(() => {});
    };
    refreshMemory();
    const timer = setInterval(refreshMemory, 5000);
    return () => clearInterval(timer);
  }, []);

  // Local-only Service Usage Stats tracker (ticks every 15s while a chat is visible)
  useEffect(() => {
    if (
      !config ||
      !config.activeServiceId ||
      settingsOpen ||
      locked ||
      privacyShieldActive
    ) {
      return;
    }
    const activeId = config.activeServiceId;
    const timer = setInterval(() => {
      const today = new Date().toISOString().slice(0, 10);
      const prevMap = config.usageStats ?? {};
      const prev = prevMap[activeId];
      const todaySeconds =
        prev && prev.lastDate === today ? prev.todaySeconds + 15 : 15;
      const totalSeconds = (prev?.totalSeconds ?? 0) + 15;
      const nextConfig: AppConfig = {
        ...config,
        usageStats: {
          ...prevMap,
          [activeId]: { todaySeconds, totalSeconds, lastDate: today },
        },
      };
      persistConfig(nextConfig);
    }, 15000);
    return () => clearInterval(timer);
  }, [config, settingsOpen, locked, privacyShieldActive, persistConfig]);

  const workspaceServices = useMemo(() => {
    if (!config) return [];
    return config.services
      .filter((s) => s.workspaceId === config.activeWorkspaceId)
      .sort((a, b) => a.order - b.order);
  }, [config]);

  const handleSelectService = useCallback(
    async (service: ServiceConfig) => {
      if (!config) return;
      const sw = config.settings.sidebarCollapsed
        ? COMPACT_WIDTH
        : EXPANDED_WIDTH;
      try {
        await invoke("activate_service", {
          serviceId: service.id,
          url: service.url,
          sidebarWidth: sw,
        });
        setLoadedServiceIds((prev) => new Set(prev).add(service.id));
        await persistConfig({ ...config, activeServiceId: service.id });
      } catch (err) {
        console.error("Failed to activate service:", err);
      }
    },
    [config, persistConfig]
  );

  const handleSelectWorkspace = useCallback(
    async (workspaceId: string) => {
      if (!config || config.activeWorkspaceId === workspaceId) return;

      if (config.settings.hibernateOnWorkspaceSwitch) {
        const prevIds = config.services
          .filter((s) => s.workspaceId === config.activeWorkspaceId)
          .map((s) => s.id);
        if (prevIds.length > 0) {
          await invoke("hibernate_services", { serviceIds: prevIds }).catch(
            console.error
          );
          setLoadedServiceIds((prev) => {
            const next = new Set(prev);
            prevIds.forEach((id) => next.delete(id));
            return next;
          });
        }
      }

      const nextServices = config.services
        .filter((s) => s.workspaceId === workspaceId)
        .sort((a, b) => a.order - b.order);
      const nextActive = nextServices[0] ?? null;

      await persistConfig({
        ...config,
        activeWorkspaceId: workspaceId,
        activeServiceId: nextActive ? nextActive.id : null,
      });

      if (nextActive) {
        const sw = config.settings.sidebarCollapsed
          ? COMPACT_WIDTH
          : EXPANDED_WIDTH;
        await invoke("activate_service", {
          serviceId: nextActive.id,
          url: nextActive.url,
          sidebarWidth: sw,
        }).catch(console.error);
        setLoadedServiceIds((prev) => new Set(prev).add(nextActive.id));
      } else {
        await invoke("set_content_hidden", { hidden: true }).catch(() => {});
      }
    },
    [config, persistConfig]
  );

  const handleLockApp = useCallback(() => {
    if (!config) return;
    if (config.settings.pinHash) {
      setLocked(true);
    } else {
      setSettingsOpen(true);
    }
  }, [config]);

  // Layout-independent keyboard shortcuts (using e.code so they work on EN, BG, etc.):
  // Ctrl+1..9 for workspaces, Ctrl+L for Vault Lock, Ctrl+B for Privacy Shield, Ctrl+N for Scratchpad
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!config || (!e.ctrlKey && !e.metaKey) || isOffline) return;

      const digitMatch = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
      if (digitMatch) {
        const idx = Number(digitMatch[1]) - 1;
        if (config.workspaces[idx]) {
          e.preventDefault();
          handleSelectWorkspace(config.workspaces[idx].id);
        }
      } else if (e.code === "KeyL") {
        e.preventDefault();
        handleLockApp();
      } else if (e.code === "KeyB") {
        e.preventDefault();
        setPrivacyShieldManual((prev) => !prev);
      } else if (e.code === "KeyN") {
        e.preventDefault();
        setRightPanel((prev) =>
          prev === "scratchpad" ? "none" : "scratchpad"
        );
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [config, isOffline, handleSelectWorkspace, handleLockApp]);

  const handleHibernateService = async (serviceId: string) => {
    if (!config) return;
    await invoke("hibernate_service", { serviceId }).catch(console.error);
    setLoadedServiceIds((prev) => {
      const next = new Set(prev);
      next.delete(serviceId);
      return next;
    });
    if (splitServiceId === serviceId) {
      setSplitServiceId(null);
    }
  };

  const handleReloadService = async (serviceId: string) => {
    await invoke("reload_service", { serviceId }).catch(console.error);
  };

  const handleToggleMuteService = async (serviceId: string) => {
    try {
      const muted = await invoke<boolean>("toggle_service_mute", { serviceId });
      setMutedServiceIds((prev) => {
        const next = new Set(prev);
        if (muted) next.add(serviceId);
        else next.delete(serviceId);
        return next;
      });
    } catch (err) {
      console.error("Failed to toggle mute:", err);
    }
  };

  const handleClearServiceCache = async (service: ServiceConfig) => {
    if (!config) return;
    const sw = config.settings.sidebarCollapsed
      ? COMPACT_WIDTH
      : EXPANDED_WIDTH;
    await invoke("clear_service_cache", {
      serviceId: service.id,
      url: service.url,
      sidebarWidth: sw,
    }).catch(console.error);
  };

  const handleResetServiceSession = async (service: ServiceConfig) => {
    if (!config) return;
    const sw = config.settings.sidebarCollapsed
      ? COMPACT_WIDTH
      : EXPANDED_WIDTH;
    await invoke("reset_service_session", {
      serviceId: service.id,
      url: service.url,
      sidebarWidth: sw,
    }).catch(console.error);
  };

  const handleOpenExternal = async (url: string) => {
    try {
      await invoke("open_url_in_browser", { url });
      const host = new URL(url).hostname;
      setStatusToast(`Opened ${host} in your browser`);
      setTimeout(() => setStatusToast(null), 2600);
    } catch (err) {
      console.error("Failed to open external URL:", err);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!config) return;
    await invoke("hibernate_service", { serviceId }).catch(console.error);
    setLoadedServiceIds((prev) => {
      const next = new Set(prev);
      next.delete(serviceId);
      return next;
    });
    const remaining = config.services.filter((s) => s.id !== serviceId);
    const nextActiveId =
      config.activeServiceId === serviceId ? null : config.activeServiceId;
    await persistConfig({
      ...config,
      services: remaining,
      activeServiceId: nextActiveId,
    });
  };

  const handleAddService = async (
    name: string,
    url: string,
    iconUrl: string | null
  ) => {
    if (!config) return;
    const id = `svc_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    const newService: ServiceConfig = {
      id,
      workspaceId: config.activeWorkspaceId,
      name,
      url,
      iconUrl,
      order: workspaceServices.length,
    };
    const nextConfig: AppConfig = {
      ...config,
      services: [...config.services, newService],
      activeServiceId: id,
    };
    await persistConfig(nextConfig);
    const sw = config.settings.sidebarCollapsed
      ? COMPACT_WIDTH
      : EXPANDED_WIDTH;
    await invoke("activate_service", {
      serviceId: newService.id,
      url: newService.url,
      sidebarWidth: sw,
    }).catch(console.error);
    setLoadedServiceIds((prev) => new Set(prev).add(newService.id));
  };

  const handleReorderServices = async (draggedId: string, targetId: string) => {
    if (!config) return;
    const list = [...workspaceServices];
    const fromIdx = list.findIndex((s) => s.id === draggedId);
    const toIdx = list.findIndex((s) => s.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);

    const updatedOrders = new Map(list.map((s, idx) => [s.id, idx]));
    const updatedServices = config.services.map((s) =>
      updatedOrders.has(s.id) ? { ...s, order: updatedOrders.get(s.id)! } : s
    );
    await persistConfig({ ...config, services: updatedServices });
  };

  const handleToggleCollapse = async () => {
    if (!config) return;
    const nextCollapsed = !config.settings.sidebarCollapsed;
    const nextWidth = nextCollapsed ? COMPACT_WIDTH : EXPANDED_WIDTH;
    await persistConfig({
      ...config,
      settings: { ...config.settings, sidebarCollapsed: nextCollapsed },
    });
    await invoke("set_sidebar_width", { width: nextWidth }).catch(
      console.error
    );
  };

  const handleUpdateSettings = async (patch: Partial<AppSettings>) => {
    if (!config) return;
    const nextSettings = { ...config.settings, ...patch };
    await persistConfig({
      ...config,
      settings: nextSettings,
    });
    if (
      "launchOnStartup" in patch ||
      "startMinimized" in patch
    ) {
      invoke("set_windows_startup", {
        enabled: nextSettings.launchOnStartup ?? false,
        minimized: nextSettings.startMinimized ?? false,
      }).catch(console.error);
    }
  };

  const handleToggleAlwaysOnTop = async () => {
    const next = !alwaysOnTop;
    setAlwaysOnTop(next);
    await invoke("set_always_on_top", { pinned: next }).catch(console.error);
  };

  const handleToggleCallMode = async () => {
    if (!config) return;
    const nextId = callModeServiceId ? null : config.activeServiceId;
    setCallModeServiceId(nextId);
    await invoke("set_call_mode", { serviceId: nextId }).catch(console.error);
  };

  const handleOpenSplitService = async (service: ServiceConfig) => {
    if (!config) return;
    try {
      await invoke("open_split_view", {
        serviceId: service.id,
        url: service.url,
      });
      setSplitServiceId(service.id);
      setLoadedServiceIds((prev) => new Set(prev).add(service.id));
    } catch (err) {
      console.error("Failed to open split view:", err);
    }
  };

  const handleCloseSplitService = async () => {
    await invoke("close_split_view").catch(console.error);
    setSplitServiceId(null);
  };

  const handleToggleQuickSplit = async () => {
    if (splitServiceId) {
      await handleCloseSplitService();
      return;
    }
    const candidate = workspaceServices.find(
      (s) => s.id !== config?.activeServiceId
    );
    if (candidate) {
      await handleOpenSplitService(candidate);
    }
  };

  const handleToggleNeverSleep = async (serviceId: string) => {
    if (!config) return;
    const updated = config.services.map((s) =>
      s.id === serviceId ? { ...s, neverSleep: !s.neverSleep } : s
    );
    await persistConfig({ ...config, services: updated });
  };

  const handleSaveQuietHours = async (
    serviceId: string,
    quietHours: QuietHoursConfig
  ) => {
    if (!config) return;
    const updated = config.services.map((s) =>
      s.id === serviceId ? { ...s, quietHours } : s
    );
    await persistConfig({ ...config, services: updated });
  };

  const handleAddNote = async (
    content: string,
    isTodo: boolean,
    category: string
  ) => {
    if (!config) return;
    const newNote: NoteItem = {
      id: `note_${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .slice(2, 5)}`,
      content,
      pinned: false,
      isTodo,
      done: false,
      createdAt: Date.now(),
      category: category || "General",
    };
    await persistConfig({
      ...config,
      notes: [newNote, ...(config.notes ?? [])],
    });
  };

  const handleEditNote = async (
    id: string,
    content: string,
    category: string
  ) => {
    if (!config) return;
    const updated = (config.notes ?? []).map((n) =>
      n.id === id ? { ...n, content, category } : n
    );
    await persistConfig({ ...config, notes: updated });
  };

  const handleTogglePinNote = async (id: string) => {
    if (!config) return;
    const updated = (config.notes ?? []).map((n) =>
      n.id === id ? { ...n, pinned: !n.pinned } : n
    );
    await persistConfig({ ...config, notes: updated });
  };

  const handleToggleDoneNote = async (id: string) => {
    if (!config) return;
    const updated = (config.notes ?? []).map((n) =>
      n.id === id ? { ...n, done: !n.done } : n
    );
    await persistConfig({ ...config, notes: updated });
  };

  const handleDeleteNote = async (id: string) => {
    if (!config) return;
    const updated = (config.notes ?? []).filter((n) => n.id !== id);
    await persistConfig({ ...config, notes: updated });
  };

  const handleClearCompletedNotes = async () => {
    if (!config) return;
    const updated = (config.notes ?? []).filter((n) => !(n.isTodo && n.done));
    await persistConfig({ ...config, notes: updated });
  };

  const handleAddCategory = async (name: string) => {
    if (!config) return;
    const current = config.noteCategories ?? ["General", "Work", "Ideas"];
    if (current.some((c) => c.toLowerCase() === name.toLowerCase())) return;
    await persistConfig({
      ...config,
      noteCategories: [...current, name],
    });
  };

  const handleDeleteCategory = async (name: string) => {
    if (!config || name === "General") return;
    const current = config.noteCategories ?? ["General", "Work", "Ideas"];
    const nextCats = current.filter((c) => c !== name);
    const nextNotes = (config.notes ?? []).map((n) =>
      n.category === name ? { ...n, category: "General" } : n
    );
    await persistConfig({
      ...config,
      noteCategories: nextCats,
      notes: nextNotes,
    });
  };

  const handleStartSplitDrag = (e: React.MouseEvent) => {
    if (!config) return;
    e.preventDefault();
    const sidebarW = config.settings.sidebarCollapsed
      ? COMPACT_WIDTH
      : EXPANDED_WIDTH;
    let latestRatio = splitRatio;

    const onMouseMove = (ev: MouseEvent) => {
      const contentW = Math.max(200, window.innerWidth - sidebarW - 6);
      const raw = (ev.clientX - sidebarW) / contentW;
      latestRatio = Math.min(0.8, Math.max(0.2, raw));
      setSplitRatio(latestRatio);
      invoke("set_split_ratio", { ratio: latestRatio }).catch(() => {});
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      persistConfig({
        ...config,
        settings: { ...config.settings, splitRatio: latestRatio },
      });
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleResetSplitRatio = () => {
    if (!config) return;
    setSplitRatio(0.5);
    invoke("set_split_ratio", { ratio: 0.5 }).catch(() => {});
    persistConfig({
      ...config,
      settings: { ...config.settings, splitRatio: 0.5 },
    });
  };

  const handleCycleTheme = () => {
    if (!config) return;
    const order: ThemeMode[] = ["dark", "oled", "light"];
    const next = order[(order.indexOf(config.settings.theme) + 1) % order.length];
    handleUpdateSettings({ theme: next });
  };

  const handleAddWorkspace = async (name: string) => {
    if (!config) return;
    const id = `ws_${Date.now().toString(36)}`;
    await persistConfig({
      ...config,
      workspaces: [...config.workspaces, { id, name }],
    });
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    if (!config || config.workspaces.length <= 1) return;
    const removedServiceIds = config.services
      .filter((s) => s.workspaceId === workspaceId)
      .map((s) => s.id);
    if (removedServiceIds.length > 0) {
      await invoke("hibernate_services", {
        serviceIds: removedServiceIds,
      }).catch(console.error);
    }
    const workspaces = config.workspaces.filter((w) => w.id !== workspaceId);
    const services = config.services.filter(
      (s) => s.workspaceId !== workspaceId
    );
    const activeWorkspaceId =
      config.activeWorkspaceId === workspaceId
        ? workspaces[0].id
        : config.activeWorkspaceId;
    await persistConfig({
      ...config,
      workspaces,
      services,
      activeWorkspaceId,
      activeServiceId: null,
    });
  };

  if (!config) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0D0F12] text-sm text-zinc-400">
        Loading Molva...
      </div>
    );
  }

  const isLight = config.settings.theme === "light";
  const mainBg =
    config.settings.theme === "oled"
      ? "bg-black text-zinc-100"
      : isLight
      ? "bg-slate-50 text-slate-900"
      : "bg-[#0D0F12] text-zinc-100";

  const sleepingCount = Math.max(
    0,
    config.services.length - loadedServiceIds.size
  );

  const activeWorkspaceName =
    config.workspaces.find((w) => w.id === config.activeWorkspaceId)?.name ??
    "Workspace";
  const activeServiceName =
    config.services.find((s) => s.id === config.activeServiceId)?.name ?? null;
  const splitServiceName =
    config.services.find((s) => s.id === splitServiceId)?.name ?? null;
  const canQuickSplit =
    workspaceServices.filter((s) => s.id !== config.activeServiceId).length > 0;

  const activeDownloads = downloads.filter((d) => d.state === "inProgress");
  const activeDownloadsCount = activeDownloads.length;
  const activeDownloadPct =
    activeDownloadsCount > 0 && activeDownloads[0].totalBytes > 0
      ? Math.min(
          100,
          Math.round(
            (activeDownloads[0].receivedBytes / activeDownloads[0].totalBytes) *
              100
          )
        )
      : null;

  return (
    <div className={`flex h-screen w-screen flex-col overflow-hidden ${mainBg}`}>
      <TitleBar
        theme={config.settings.theme}
        activeWorkspaceName={activeWorkspaceName}
        activeServiceName={activeServiceName}
        splitServiceName={splitServiceName}
        alwaysOnTop={alwaysOnTop}
        privacyShieldActive={privacyShieldActive}
        callModeActive={callModeServiceId !== null}
        downloadsOpen={rightPanel === "downloads"}
        scratchpadOpen={rightPanel === "scratchpad"}
        canQuickSplit={canQuickSplit}
        canCallMode={config.activeServiceId !== null}
        activeDownloadsCount={activeDownloadsCount}
        activeDownloadPct={activeDownloadPct}
        totalDownloadsCount={downloads.length}
        notesCount={(config.notes ?? []).length}
        showEcosystemPicks={showEcosystemPicks}
        hasUnreadProjects={hasUnreadProjects}
        onToggleAlwaysOnTop={handleToggleAlwaysOnTop}
        onTogglePrivacyShield={() => setPrivacyShieldManual((prev) => !prev)}
        onToggleCallMode={handleToggleCallMode}
        onToggleQuickSplit={handleToggleQuickSplit}
        onToggleDownloads={() =>
          setRightPanel((prev) =>
            prev === "downloads" ? "none" : "downloads"
          )
        }
        onToggleScratchpad={() =>
          setRightPanel((prev) =>
            prev === "scratchpad" ? "none" : "scratchpad"
          )
        }
        onOpenCreatorLab={() => {
          markProjectsSeen();
          setCreatorLabOpen(true);
        }}
        onOpenAbout={() => setAboutOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          workspaces={config.workspaces}
          activeWorkspaceId={config.activeWorkspaceId}
          services={workspaceServices}
          activeServiceId={config.activeServiceId}
          splitServiceId={splitServiceId}
          loadedServiceIds={loadedServiceIds}
          mutedServiceIds={mutedServiceIds}
          quietServiceIds={quietServiceIds}
          unreadCounts={unreadCounts}
          memoryMb={memoryMb}
          sleepingCount={sleepingCount}
          collapsed={config.settings.sidebarCollapsed}
          focusMode={config.settings.focusMode}
          theme={config.settings.theme}
          featuredPromo={
            showEcosystemPicks && !isPromoDismissed
              ? ecosystemFeed.featured_promo
              : null
          }
          onOpenPromoUrl={(url) =>
            handleOpenExternal(appendSrcParam(url, "sidebar"))
          }
          onDismissPromo={dismissPromo}
          onOpenCreatorLab={() => {
            markProjectsSeen();
            setCreatorLabOpen(true);
          }}
          onSelectWorkspace={handleSelectWorkspace}
          onSelectService={(svc) => {
            setSettingsOpen(false);
            handleSelectService(svc);
          }}
          onOpenSplitService={handleOpenSplitService}
          onCloseSplitService={handleCloseSplitService}
          onToggleNeverSleep={handleToggleNeverSleep}
          onOpenQuietHours={(svc) => setQuietHoursService(svc)}
          onHibernateService={handleHibernateService}
          onReloadService={handleReloadService}
          onToggleMuteService={handleToggleMuteService}
          onClearServiceCache={handleClearServiceCache}
          onResetServiceSession={handleResetServiceSession}
          onOpenExternal={handleOpenExternal}
          onDeleteService={handleDeleteService}
          onReorderServices={handleReorderServices}
          onOpenAddModal={() => setAddOpen(true)}
          onOpenSettings={() => setSettingsOpen((prev) => !prev)}
          onToggleCollapse={handleToggleCollapse}
          onToggleFocusMode={() => {
            const nextMuted = !config.settings.focusMode;
            handleUpdateSettings({ focusMode: nextMuted });
            invoke("set_focus_mode", { muted: nextMuted }).catch(console.error);
          }}
          onCycleTheme={handleCycleTheme}
          onLockApp={handleLockApp}
          onContextMenuOpenChange={setContextMenuOpen}
        />

        {settingsOpen ? (
          <SettingsModal
            open={settingsOpen}
            settings={config.settings}
            workspaces={config.workspaces}
            services={config.services}
            usageStats={config.usageStats ?? {}}
            onClose={() => setSettingsOpen(false)}
            onOpenAbout={() => setAboutOpen(true)}
            onUpdateSettings={handleUpdateSettings}
            onAddWorkspace={handleAddWorkspace}
            onDeleteWorkspace={handleDeleteWorkspace}
            onResetUsageStats={() =>
              persistConfig({ ...config, usageStats: {} })
            }
          />
        ) : (
          /* Empty Content Placeholder (covered by child WebView2 when a service is active) */
          <main className="relative flex flex-1 flex-col items-center justify-center p-10 text-center">
            {/* Resizable Split View Divider (sits in the 6px gap between left and right WebView2) */}
            {splitServiceId && (
              <div
                onMouseDown={handleStartSplitDrag}
                onDoubleClick={handleResetSplitRatio}
                title="Drag to resize split • Double-click for 50/50"
                style={{
                  left: `calc((100% - 6px) * ${splitRatio})`,
                }}
                className="absolute bottom-0 top-0 z-30 flex w-[6px] cursor-col-resize items-center justify-center bg-[#232730] transition-colors hover:bg-[#F59E0B]"
              >
                <span className="h-8 w-0.5 rounded-full bg-zinc-500/70" />
              </div>
            )}
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-[#232730] bg-[#15181E] p-4 shadow-2xl shadow-amber-500/10">
              <img
                src={logoImg}
                alt="Molva"
                className="h-full w-full object-contain"
              />
            </div>
            {(() => {
              const sleepingService = config.activeServiceId
                ? config.services.find((s) => s.id === config.activeServiceId)
                : null;
              const isSleeping =
                sleepingService && !loadedServiceIds.has(sleepingService.id);

              return isSleeping && sleepingService ? (
                <>
                  <h1 className="text-2xl font-bold tracking-tight">
                    {sleepingService.name} is sleeping
                  </h1>
                  <p className="mt-2 max-w-md text-sm text-zinc-400">
                    Session cookies are safely preserved on disk while using 0
                    MB of RAM.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSelectService(sleepingService)}
                    className="mt-6 flex items-center gap-2 rounded-xl bg-[#F59E0B] px-5 py-2.5 text-sm font-bold text-[#0D0F12] shadow-lg shadow-amber-500/15 transition-transform hover:scale-[1.02] hover:bg-amber-400"
                  >
                    <Zap className="h-4 w-4" />
                    Wake Up {sleepingService.name}
                  </button>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-bold tracking-tight">Molva</h1>
                  <p className="mt-2 max-w-md text-sm text-zinc-400">
                    Quiet space. Add your first chat to start the murmur.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-zinc-400">
                    <span className="rounded-full border border-[#232730] bg-[#15181E] px-3 py-1">
                      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                      Isolated Sessions
                    </span>
                    <span className="rounded-full border border-[#232730] bg-[#15181E] px-3 py-1">
                      True RAM Hibernation
                    </span>
                    <span className="rounded-full border border-[#232730] bg-[#15181E] px-3 py-1">
                      0% Electron
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    className="mt-7 flex items-center gap-2 rounded-xl bg-[#F59E0B] px-5 py-2.5 text-sm font-bold text-[#0D0F12] shadow-lg shadow-amber-500/15 transition-transform hover:scale-[1.02] hover:bg-amber-400"
                  >
                    <Plus className="h-4 w-4" />
                    Add Service
                  </button>
                </>
              );
            })()}

            {/* Slot #2: Thank-You & Ecosystem Banner on Sleeping / Empty Screen */}
            {showEcosystemPicks &&
              (() => {
                const sleepingService = config.activeServiceId
                  ? config.services.find((s) => s.id === config.activeServiceId)
                  : null;
                const isSleeping = Boolean(
                  sleepingService && !loadedServiceIds.has(sleepingService.id)
                );

                return (
                  <div className="mt-7 w-full max-w-xl rounded-2xl border border-[#232730] bg-[#15181E]/90 p-4 text-left shadow-lg">
                    <p className="text-[11px] font-medium text-[#10B981]">
                      {isSleeping && sleepingService
                        ? `⚡ ${sleepingService.name} is hibernated — its WebView2 process is closed (0 MB active RAM) while session cookies stay preserved on disk.`
                        : "⚡ Molva is 100% free & open-source — built natively with Rust, Tauri v2, and Windows WebView2."}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#232730] bg-[#0D0F12]/80 px-3.5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-zinc-100">
                          Support our work by checking out:{" "}
                          <span className="text-[#F59E0B]">
                            {ecosystemFeed.featured_promo.title}
                          </span>
                        </div>
                        <div className="truncate text-[11px] text-zinc-400">
                          {ecosystemFeed.featured_promo.description}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenExternal(
                            appendSrcParam(
                              ecosystemFeed.featured_promo.url,
                              "sleeping_screen"
                            )
                          )
                        }
                        className="shrink-0 rounded-lg bg-[#F59E0B] px-3 py-1.5 text-xs font-bold text-[#0D0F12] transition-colors hover:bg-amber-400"
                      >
                        {ecosystemFeed.featured_promo.cta_text}
                      </button>
                    </div>
                  </div>
                );
              })()}

            <div className="mt-8 flex items-center gap-4 text-[11px] text-zinc-500">
              <span>
                <kbd className="rounded border border-[#232730] bg-[#15181E] px-1.5 py-0.5 text-zinc-300">
                  Ctrl + 1 / 2
                </kbd>{" "}
                Switch Workspace
              </span>
              <span>
                <kbd className="rounded border border-[#232730] bg-[#15181E] px-1.5 py-0.5 text-zinc-300">
                  Ctrl + L
                </kbd>{" "}
                Vault Lock
              </span>
            </div>
          </main>
        )}

        {/* Docked Right Panels (Downloads / Scratchpad) */}
        <DownloadsModal
          open={rightPanel === "downloads"}
          downloads={downloads}
          services={config.services}
          theme={config.settings.theme}
          onClose={() => setRightPanel("none")}
          onOpenFile={(path) =>
            invoke("open_downloaded_file", { path }).catch(console.error)
          }
          onRevealFile={(path) =>
            invoke("reveal_downloaded_file", { path }).catch(console.error)
          }
          onClear={() => setDownloads([])}
        />

        <ScratchpadPanel
          open={rightPanel === "scratchpad"}
          notes={config.notes ?? []}
          categories={config.noteCategories ?? ["General", "Work", "Ideas"]}
          theme={config.settings.theme}
          onClose={() => setRightPanel("none")}
          onAddNote={handleAddNote}
          onEditNote={handleEditNote}
          onTogglePin={handleTogglePinNote}
          onToggleDone={handleToggleDoneNote}
          onDeleteNote={handleDeleteNote}
          onClearCompleted={handleClearCompletedNotes}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      </div>

      <AddServiceModal
        open={addOpen}
        theme={config.settings.theme}
        onClose={() => setAddOpen(false)}
        onAdd={handleAddService}
      />

      <AboutModal
        open={aboutOpen}
        theme={config.settings.theme}
        onClose={() => setAboutOpen(false)}
      />

      <CreatorLabModal
        open={creatorLabOpen}
        feed={ecosystemFeed}
        theme={config.settings.theme}
        onClose={() => setCreatorLabOpen(false)}
        onOpenUrl={(url) => handleOpenExternal(url)}
      />

      <QuietHoursModal
        service={quietHoursService}
        theme={config.settings.theme}
        onClose={() => setQuietHoursService(null)}
        onSave={handleSaveQuietHours}
      />

      <LinkSafetyModal
        prompt={linkSafetyPrompt}
        sourceServiceName={
          linkSafetyPrompt?.serviceId
            ? config.services.find((s) => s.id === linkSafetyPrompt.serviceId)
                ?.name ?? null
            : null
        }
        theme={config.settings.theme}
        onCancel={() => setLinkSafetyPrompt(null)}
        onProceed={(url) => {
          setLinkSafetyPrompt(null);
          handleOpenExternal(url);
        }}
      />

      {statusToast && (
        <div className="fixed bottom-4 right-4 z-[95] rounded-xl border border-[#232730] bg-[#15181E] px-4 py-2.5 text-xs font-medium text-zinc-100 shadow-2xl">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#10B981]" />
          {statusToast}
        </div>
      )}

      {notifToast && !isOffline && !locked && (
        <button
          type="button"
          onClick={() => {
            const svc = config.services.find(
              (s) => s.id === notifToast.serviceId
            );
            setNotifToast(null);
            if (svc) {
              setSettingsOpen(false);
              handleSelectService(svc);
            }
          }}
          className="fixed bottom-4 right-4 z-[94] flex items-center gap-3 rounded-2xl border border-[#F59E0B]/40 bg-[#15181E] px-4 py-3 text-left shadow-2xl transition-transform hover:scale-[1.02]"
        >
          <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-[#F59E0B]" />
          <div>
            <div className="text-xs font-bold text-zinc-100">
              {notifToast.name}
            </div>
            <div className="text-[11px] text-zinc-400">
              {notifToast.count} unread message
              {notifToast.count === 1 ? "" : "s"} • Click to open
            </div>
          </div>
        </button>
      )}

      {/* Privacy Shield Overlay */}
      {privacyShieldActive && !locked && (
        <div
          onClick={() => {
            setPrivacyShieldManual(false);
            setPrivacyShieldBlur(false);
          }}
          className="fixed inset-x-0 bottom-0 top-[38px] z-40 flex cursor-pointer flex-col items-center justify-center bg-[#0D0F12]/95 backdrop-blur-2xl"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#232730] bg-[#15181E] p-3 shadow-2xl shadow-amber-500/10">
            <Shield className="h-8 w-8 text-[#F59E0B]" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100">
            Privacy Shield Active
          </h2>
          <p className="mt-1.5 text-xs text-zinc-400">
            Your conversations are hidden from view.
          </p>
          <button
            type="button"
            className="mt-5 flex items-center gap-2 rounded-xl border border-[#232730] bg-[#15181E] px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-[#F59E0B]/60 hover:text-[#F59E0B]"
          >
            <Eye className="h-3.5 w-3.5" />
            Click anywhere or press Ctrl + B to resume
          </button>
        </div>
      )}

      {config.settings.pinHash && (
        <PinLockOverlay
          open={locked}
          pinHash={config.settings.pinHash}
          onUnlock={() => setLocked(false)}
        />
      )}

      {/* Full-window No Internet Lock Screen (blocks all app actions until connection returns) */}
      {isOffline && (
        <div
          onContextMenu={(e) => e.preventDefault()}
          className="fixed inset-x-0 bottom-0 top-[38px] z-[90] flex flex-col items-center justify-center bg-[#0D0F12]/98 p-8 text-center backdrop-blur-xl"
        >
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-[#F59E0B]/40 bg-[#15181E] shadow-2xl shadow-amber-500/10">
            <WifiOff className="h-9 w-9 text-[#F59E0B]" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
            No Internet Connection
          </h2>
          <p className="mt-2 max-w-md text-sm text-zinc-400">
            Molva is waiting for your connection to return. All chats are
            safely paused until you&apos;re back online.
          </p>

          <div className="mt-6 flex items-center gap-2 rounded-full border border-[#232730] bg-[#15181E] px-4 py-1.5 text-xs text-zinc-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#F59E0B]" />
            Checking connection automatically...
          </div>

          <button
            type="button"
            disabled={checkingNetwork}
            onClick={() => {
              setCheckingNetwork(true);
              invoke<boolean>("check_internet_connection")
                .then((online) => setIsOffline(!online))
                .catch(() => {})
                .finally(() => setCheckingNetwork(false));
            }}
            className="mt-5 flex items-center gap-2 rounded-xl bg-[#F59E0B] px-5 py-2.5 text-xs font-bold text-[#0D0F12] transition-colors hover:bg-amber-400 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${checkingNetwork ? "animate-spin" : ""}`}
            />
            {checkingNetwork ? "Checking..." : "Retry Now"}
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
