import React, { useEffect, useState } from "react";
import {
  Clock,
  Columns2,
  Copy,
  Eraser,
  ExternalLink,
  Flame,
  LogOut,
  Moon,
  RotateCw,
  Trash2,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { ServiceConfig, ThemeMode } from "../types/app";

interface ServiceItemProps {
  service: ServiceConfig;
  isActive: boolean;
  isSplitActive: boolean;
  isLoaded: boolean;
  isMuted: boolean;
  isInQuietHours: boolean;
  collapsed: boolean;
  unreadCount: number;
  focusMode: boolean;
  theme: ThemeMode;
  onSelect: (service: ServiceConfig) => void;
  onOpenSplit: (service: ServiceConfig) => void;
  onCloseSplit: () => void;
  onToggleNeverSleep: (serviceId: string) => void;
  onOpenQuietHours: (service: ServiceConfig) => void;
  onHibernate: (serviceId: string) => void;
  onReload: (serviceId: string) => void;
  onToggleMute: (serviceId: string) => void;
  onClearCache: (service: ServiceConfig) => void;
  onResetSession: (service: ServiceConfig) => void;
  onOpenExternal: (url: string) => void;
  onDelete: (serviceId: string) => void;
  onDragStart: (serviceId: string) => void;
  onDragOver: (e: React.DragEvent, targetId: string) => void;
  onDrop: (targetId: string) => void;
  onContextMenuOpenChange?: (open: boolean) => void;
  isDragTarget: boolean;
}

export const ServiceItem: React.FC<ServiceItemProps> = ({
  service,
  isActive,
  isSplitActive,
  isLoaded,
  isMuted,
  isInQuietHours,
  collapsed,
  unreadCount,
  focusMode,
  theme,
  onSelect,
  onOpenSplit,
  onCloseSplit,
  onToggleNeverSleep,
  onOpenQuietHours,
  onHibernate,
  onReload,
  onToggleMute,
  onClearCache,
  onResetSession,
  onOpenExternal,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onContextMenuOpenChange,
  isDragTarget,
}) => {
  const [imgError, setImgError] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  const isLight = theme === "light";
  const showUnread = !focusMode && !isInQuietHours && unreadCount > 0;

  useEffect(() => {
    if (collapsed) {
      onContextMenuOpenChange?.(menuPos !== null);
    }
  }, [menuPos, collapsed, onContextMenuOpenChange]);

  const closeMenu = () => setMenuPos(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const clampedY = Math.min(e.clientY, window.innerHeight - 360);
    const x = collapsed ? Math.max(8, e.clientX) : 14;
    setMenuPos({ x, y: Math.max(46, clampedY) });
  };

  return (
    <div
      className="relative"
      draggable
      onDragStart={() => onDragStart(service.id)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e, service.id);
      }}
      onDrop={() => onDrop(service.id)}
    >
      {isDragTarget && (
        <div className="mx-2 mb-1 h-0.5 rounded-full bg-[#F59E0B]" />
      )}

      <button
        type="button"
        onClick={() => onSelect(service)}
        onContextMenu={handleContextMenu}
        title={
          collapsed
            ? `${service.name}${!isLoaded ? " (Sleeping • 0 MB RAM)" : ""}`
            : undefined
        }
        className={`group relative flex w-full items-center gap-3.5 rounded-xl border px-3 py-2.5 text-left transition-all ${
          collapsed ? "justify-center px-2" : ""
        } ${
          isActive
            ? isLight
              ? "border-amber-500/30 bg-amber-500/15 text-slate-900 shadow-sm"
              : "border-[#232730] bg-white/[0.08] text-white shadow-sm"
            : isLight
            ? "border-transparent text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
            : "border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
        }`}
      >
        {/* Active indicator pill (Electric Amber) */}
        {isActive && (
          <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#F59E0B]" />
        )}

        {/* Service Icon */}
        <div
          className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
            isLight
              ? "border-slate-200 bg-white"
              : "border-[#232730] bg-[#0D0F12]/70"
          }`}
        >
          {service.iconUrl && !imgError ? (
            <img
              src={service.iconUrl}
              alt={service.name}
              onError={() => setImgError(true)}
              className={`h-5 w-5 rounded-sm object-contain transition-opacity ${
                !isLoaded ? "opacity-55 grayscale-[35%]" : "opacity-100"
              }`}
            />
          ) : (
            <span
              className={`text-xs font-semibold ${
                !isLoaded ? "opacity-60" : ""
              }`}
            >
              {service.name.slice(0, 2).toUpperCase()}
            </span>
          )}

          {/* Always Awake (Never Sleep) badge */}
          {service.neverSleep && isLoaded && (
            <span
              title="Always Awake (Never sleep)"
              className={`absolute -left-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                isLight
                  ? "border-slate-100 bg-amber-100 text-amber-600"
                  : "border-[#15181E] bg-[#0D0F12] text-[#F59E0B]"
              }`}
            >
              <Flame className="h-2 w-2" />
            </span>
          )}

          {/* Sleeping / 0 MB RAM badge (Emerald Mint) */}
          {!isLoaded && (
            <span
              title="Sleeping (0 MB RAM)"
              className={`absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                isLight
                  ? "border-slate-100 bg-emerald-100 text-emerald-700"
                  : "border-[#15181E] bg-[#0D0F12] text-[#10B981]"
              }`}
            >
              <Moon className="h-2 w-2" />
            </span>
          )}

          {/* Unread badge in compact mode */}
          {collapsed && showUnread && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F59E0B] px-1 text-[10px] font-bold text-[#0D0F12]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>

        {/* Service Name + Unread badge in expanded mode */}
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-sm font-medium">
              {service.name}
            </span>
            {showUnread && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F59E0B] px-1.5 text-[11px] font-bold text-[#0D0F12]">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {/* Context Menu (kept inside sidebar width when expanded so child WebView2 never clips it) */}
      {menuPos && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={closeMenu}
            onContextMenu={(e) => {
              e.preventDefault();
              closeMenu();
            }}
          />
          <div
            style={{
              top: menuPos.y,
              left: menuPos.x,
              width: collapsed ? 204 : 220,
            }}
            className={`fixed z-50 rounded-lg border p-1 shadow-2xl ${
              isLight
                ? "border-slate-200 bg-white text-slate-800"
                : "border-[#232730] bg-[#15181E] text-zinc-200"
            }`}
          >
            {isLoaded ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    onReload(service.id);
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium ${
                    isLight ? "hover:bg-slate-100" : "hover:bg-white/[0.06]"
                  }`}
                >
                  <RotateCw className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                  <span className="truncate">Reload</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    onToggleMute(service.id);
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium ${
                    isLight ? "hover:bg-slate-100" : "hover:bg-white/[0.06]"
                  }`}
                >
                  {isMuted ? (
                    <Volume2 className="h-3.5 w-3.5 shrink-0 text-[#10B981]" />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  )}
                  <span className="truncate">
                    {isMuted ? "Unmute audio" : "Mute audio"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    onHibernate(service.id);
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium ${
                    isLight ? "hover:bg-slate-100" : "hover:bg-white/[0.06]"
                  }`}
                >
                  <Moon className="h-3.5 w-3.5 shrink-0 text-[#10B981]" />
                  <span className="truncate">Put to sleep (Free RAM)</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  onSelect(service);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium ${
                  isLight ? "hover:bg-slate-100" : "hover:bg-white/[0.06]"
                }`}
              >
                <Zap className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]" />
                <span className="truncate">Wake up</span>
              </button>
            )}

            {!isActive && (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  if (isSplitActive) onCloseSplit();
                  else onOpenSplit(service);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium ${
                  isLight ? "hover:bg-slate-100" : "hover:bg-white/[0.06]"
                }`}
              >
                <Columns2 className="h-3.5 w-3.5 shrink-0 text-[#10B981]" />
                <span className="truncate">
                  {isSplitActive ? "Close Split View" : "Open in Split View"}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                closeMenu();
                onToggleNeverSleep(service.id);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium ${
                isLight ? "hover:bg-slate-100" : "hover:bg-white/[0.06]"
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <Flame
                  className={`h-3.5 w-3.5 shrink-0 ${
                    service.neverSleep ? "text-[#F59E0B]" : "text-zinc-400"
                  }`}
                />
                <span className="truncate">Never sleep</span>
              </span>
              {service.neverSleep && (
                <span className="text-[10px] font-bold text-[#F59E0B]">ON</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                closeMenu();
                onOpenQuietHours(service);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium ${
                isLight ? "hover:bg-slate-100" : "hover:bg-white/[0.06]"
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <Clock
                  className={`h-3.5 w-3.5 shrink-0 ${
                    service.quietHours?.enabled
                      ? "text-[#F59E0B]"
                      : "text-zinc-400"
                  }`}
                />
                <span className="truncate">Quiet Hours</span>
              </span>
              {service.quietHours?.enabled && (
                <span className="text-[10px] font-bold text-[#F59E0B]">ON</span>
              )}
            </button>

            <div
              className={`my-1 border-t ${
                isLight ? "border-slate-200" : "border-[#232730]"
              }`}
            />

            <button
              type="button"
              onClick={() => {
                closeMenu();
                onOpenExternal(service.url);
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium ${
                isLight ? "hover:bg-slate-100" : "hover:bg-white/[0.06]"
              }`}
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              <span className="truncate">Open in Browser</span>
            </button>
            <button
              type="button"
              onClick={() => {
                closeMenu();
                navigator.clipboard?.writeText(service.url).catch(() => {});
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium ${
                isLight ? "hover:bg-slate-100" : "hover:bg-white/[0.06]"
              }`}
            >
              <Copy className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              <span className="truncate">Copy URL</span>
            </button>

            <div
              className={`my-1 border-t ${
                isLight ? "border-slate-200" : "border-[#232730]"
              }`}
            />

            <button
              type="button"
              onClick={() => {
                closeMenu();
                onClearCache(service);
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium ${
                isLight ? "hover:bg-slate-100" : "hover:bg-white/[0.06]"
              }`}
            >
              <Eraser className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]" />
              <span className="truncate">Clear Cache</span>
            </button>
            <button
              type="button"
              onClick={() => {
                closeMenu();
                onResetSession(service);
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-amber-400 ${
                isLight ? "hover:bg-amber-50" : "hover:bg-amber-500/10"
              }`}
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Reset Session (Logout)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                closeMenu();
                onDelete(service.id);
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-rose-400 ${
                isLight ? "hover:bg-rose-50" : "hover:bg-rose-500/10"
              }`}
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Remove Service</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
