import React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  Columns2,
  Download,
  Eye,
  EyeOff,
  Minus,
  PhoneCall,
  Pin,
  ShieldCheck,
  Sparkles,
  Square,
  StickyNote,
  X,
} from "lucide-react";
import logoImg from "../assets/logo.png";
import { ThemeMode } from "../types/app";

interface TitleBarProps {
  theme: ThemeMode;
  activeWorkspaceName: string;
  activeServiceName: string | null;
  splitServiceName: string | null;
  alwaysOnTop: boolean;
  privacyShieldActive: boolean;
  callModeActive: boolean;
  downloadsOpen: boolean;
  scratchpadOpen: boolean;
  canQuickSplit: boolean;
  canCallMode: boolean;
  activeDownloadsCount: number;
  activeDownloadPct: number | null;
  totalDownloadsCount: number;
  notesCount: number;
  showEcosystemPicks: boolean;
  hasUnreadProjects: boolean;
  onToggleAlwaysOnTop: () => void;
  onTogglePrivacyShield: () => void;
  onToggleCallMode: () => void;
  onToggleQuickSplit: () => void;
  onToggleDownloads: () => void;
  onToggleScratchpad: () => void;
  onOpenCreatorLab: () => void;
  onOpenAbout: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  theme,
  activeWorkspaceName,
  activeServiceName,
  splitServiceName,
  alwaysOnTop,
  privacyShieldActive,
  callModeActive,
  downloadsOpen,
  scratchpadOpen,
  canQuickSplit,
  canCallMode,
  activeDownloadsCount,
  activeDownloadPct,
  totalDownloadsCount,
  notesCount,
  showEcosystemPicks,
  hasUnreadProjects,
  onToggleAlwaysOnTop,
  onTogglePrivacyShield,
  onToggleCallMode,
  onToggleQuickSplit,
  onToggleDownloads,
  onToggleScratchpad,
  onOpenCreatorLab,
  onOpenAbout,
}) => {
  const isLight = theme === "light";
  const barBg =
    theme === "oled"
      ? "bg-black border-[#232730] text-zinc-100"
      : isLight
      ? "bg-slate-100 border-slate-200 text-slate-900"
      : "bg-[#15181E] border-[#232730] text-zinc-100";

  const appWindow = getCurrentWindow();

  return (
    <header
      data-tauri-drag-region
      onDoubleClick={() => appWindow.toggleMaximize().catch(() => {})}
      className={`flex h-[38px] w-full shrink-0 select-none items-center justify-between border-b px-3 ${barBg}`}
    >
      {/* Left: Brand + Active Context Pill */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenAbout}
          title="About Molva"
          className={`flex items-center gap-2 rounded-lg px-2 py-1 transition-colors ${
            isLight ? "hover:bg-slate-200/80" : "hover:bg-white/[0.06]"
          }`}
        >
          <img
            src={logoImg}
            alt="Molva"
            className="h-5 w-5 rounded-md object-contain"
          />
          <span className="text-sm font-semibold tracking-tight">Molva</span>
        </button>

        <div
          data-tauri-drag-region
          className={`hidden items-center gap-2 rounded-full border px-2.5 py-0.5 text-[11px] font-medium sm:flex ${
            isLight
              ? "border-slate-200 bg-white text-slate-600"
              : "border-[#232730] bg-[#0D0F12]/80 text-zinc-400"
          }`}
        >
          <ShieldCheck className="h-3 w-3 text-[#10B981]" />
          <span>{activeWorkspaceName}</span>
          {activeServiceName && (
            <>
              <span className="opacity-40">/</span>
              <span className="font-semibold text-[#F59E0B]">
                {activeServiceName}
              </span>
            </>
          )}
          {splitServiceName && (
            <>
              <span className="opacity-40">+</span>
              <span className="font-semibold text-[#10B981]">
                {splitServiceName}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Middle Drag Spacer */}
      <div data-tauri-drag-region className="h-full flex-1" />

      {/* Right: Quick Feature Toggles + Window Controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onToggleCallMode}
          disabled={!callModeActive && !canCallMode}
          title={
            callModeActive
              ? "End Call Mode (Unmute other chats)"
              : "Meeting / Call Mode (Mute all other chats & keep call awake)"
          }
          className={`flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors disabled:opacity-35 ${
            callModeActive
              ? "bg-[#10B981]/20 text-[#10B981]"
              : isLight
              ? "text-slate-600 hover:bg-slate-200"
              : "text-zinc-400 hover:bg-white/[0.08] hover:text-white"
          }`}
        >
          <PhoneCall className="h-3.5 w-3.5" />
          <span className="hidden md:inline">
            {callModeActive ? "In Call" : "Call"}
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleQuickSplit}
          disabled={!splitServiceName && !canQuickSplit}
          title={
            splitServiceName
              ? "Close Split View"
              : canQuickSplit
              ? "Toggle Split View (2 chats side by side)"
              : "Add at least 2 services to use Split View"
          }
          className={`flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition-colors disabled:opacity-35 ${
            splitServiceName
              ? "bg-[#10B981]/15 text-[#10B981]"
              : isLight
              ? "text-slate-600 hover:bg-slate-200"
              : "text-zinc-400 hover:bg-white/[0.08] hover:text-white"
          }`}
        >
          <Columns2 className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Split</span>
        </button>

        {showEcosystemPicks && (
          <button
            type="button"
            onClick={onOpenCreatorLab}
            title="What's New & Creator's Tools"
            className={`relative flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
              isLight
                ? "text-slate-600 hover:bg-slate-200"
                : "text-zinc-400 hover:bg-white/[0.08] hover:text-[#F59E0B]"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {hasUnreadProjects && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#F59E0B] shadow-sm shadow-amber-500/60" />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onToggleScratchpad}
          title={
            scratchpadOpen
              ? "Close Scratchpad (Ctrl + N)"
              : "Open Scratchpad & Pinned Notes (Ctrl + N)"
          }
          className={`relative flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
            scratchpadOpen
              ? "bg-[#F59E0B]/20 text-[#F59E0B]"
              : isLight
              ? "text-slate-600 hover:bg-slate-200"
              : "text-zinc-400 hover:bg-white/[0.08] hover:text-white"
          }`}
        >
          <StickyNote className="h-3.5 w-3.5" />
          {notesCount > 0 && !scratchpadOpen && (
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
          )}
        </button>

        <button
          type="button"
          onClick={onToggleDownloads}
          title={downloadsOpen ? "Close Downloads Panel" : "Open Downloads Panel"}
          className={`relative flex h-7 items-center gap-1.5 rounded-md px-2 transition-colors ${
            downloadsOpen
              ? "bg-[#F59E0B]/20 text-[#F59E0B]"
              : activeDownloadsCount > 0
              ? "bg-[#10B981]/20 text-[#10B981]"
              : isLight
              ? "text-slate-600 hover:bg-slate-200"
              : "text-zinc-400 hover:bg-white/[0.08] hover:text-white"
          }`}
        >
          <Download
            className={`h-3.5 w-3.5 ${
              activeDownloadsCount > 0 ? "animate-bounce" : ""
            }`}
          />
          {activeDownloadsCount > 0 && (
            <span className="text-[11px] font-semibold">
              {activeDownloadPct !== null
                ? `${activeDownloadPct}%`
                : "Downloading..."}
            </span>
          )}
          {totalDownloadsCount > 0 && activeDownloadsCount === 0 && (
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
          )}
        </button>

        <button
          type="button"
          onClick={onTogglePrivacyShield}
          title={
            privacyShieldActive
              ? "Disable Privacy Shield (Ctrl + B)"
              : "Privacy Shield (Hide chats • Ctrl + B)"
          }
          className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
            privacyShieldActive
              ? "bg-[#F59E0B]/20 text-[#F59E0B]"
              : isLight
              ? "text-slate-600 hover:bg-slate-200"
              : "text-zinc-400 hover:bg-white/[0.08] hover:text-white"
          }`}
        >
          {privacyShieldActive ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
        </button>

        <button
          type="button"
          onClick={onToggleAlwaysOnTop}
          title={
            alwaysOnTop
              ? "Unpin Window (Always on Top: ON)"
              : "Pin Window on Top (Always on Top: OFF)"
          }
          className={`mr-1 flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
            alwaysOnTop
              ? "bg-[#F59E0B]/20 text-[#F59E0B]"
              : isLight
              ? "text-slate-600 hover:bg-slate-200"
              : "text-zinc-400 hover:bg-white/[0.08] hover:text-white"
          }`}
        >
          <Pin className="h-3.5 w-3.5" />
        </button>

        <div
          className={`mx-1 h-4 w-px ${
            isLight ? "bg-slate-300" : "bg-[#232730]"
          }`}
        />

        <button
          type="button"
          onClick={() => appWindow.minimize().catch(() => {})}
          title="Minimize"
          className={`flex h-7 w-8 items-center justify-center rounded-md transition-colors ${
            isLight
              ? "text-slate-600 hover:bg-slate-200"
              : "text-zinc-400 hover:bg-white/[0.08] hover:text-white"
          }`}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => appWindow.toggleMaximize().catch(() => {})}
          title="Maximize / Restore"
          className={`flex h-7 w-8 items-center justify-center rounded-md transition-colors ${
            isLight
              ? "text-slate-600 hover:bg-slate-200"
              : "text-zinc-400 hover:bg-white/[0.08] hover:text-white"
          }`}
        >
          <Square className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => appWindow.close().catch(() => {})}
          title="Minimize to Tray"
          className="flex h-7 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-rose-500/20 hover:text-rose-400"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
};
