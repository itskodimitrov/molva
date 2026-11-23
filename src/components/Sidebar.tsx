import React, { useState } from "react";
import {
  Bell,
  BellOff,
  Lock,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Sparkles,
  Sun,
} from "lucide-react";
import { FeaturedPromo } from "../services/ecosystemFeed";
import { ServiceConfig, ThemeMode, Workspace } from "../types/app";
import { ServiceItem } from "./ServiceItem";

interface SidebarProps {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  services: ServiceConfig[];
  activeServiceId: string | null;
  splitServiceId: string | null;
  loadedServiceIds: Set<string>;
  mutedServiceIds: Set<string>;
  quietServiceIds: Set<string>;
  unreadCounts: Record<string, number>;
  memoryMb: number;
  sleepingCount: number;
  collapsed: boolean;
  focusMode: boolean;
  theme: ThemeMode;
  featuredPromo: FeaturedPromo | null;
  onOpenPromoUrl: (url: string) => void;
  onDismissPromo: (id: string) => void;
  onOpenCreatorLab: () => void;
  onSelectWorkspace: (workspaceId: string) => void;
  onSelectService: (service: ServiceConfig) => void;
  onOpenSplitService: (service: ServiceConfig) => void;
  onCloseSplitService: () => void;
  onToggleNeverSleep: (serviceId: string) => void;
  onOpenQuietHours: (service: ServiceConfig) => void;
  onHibernateService: (serviceId: string) => void;
  onReloadService: (serviceId: string) => void;
  onToggleMuteService: (serviceId: string) => void;
  onClearServiceCache: (service: ServiceConfig) => void;
  onResetServiceSession: (service: ServiceConfig) => void;
  onOpenExternal: (url: string) => void;
  onDeleteService: (serviceId: string) => void;
  onReorderServices: (draggedId: string, targetId: string) => void;
  onOpenAddModal: () => void;
  onOpenSettings: () => void;
  onToggleCollapse: () => void;
  onToggleFocusMode: () => void;
  onCycleTheme: () => void;
  onLockApp: () => void;
  onContextMenuOpenChange: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  workspaces,
  activeWorkspaceId,
  services,
  activeServiceId,
  splitServiceId,
  loadedServiceIds,
  mutedServiceIds,
  quietServiceIds,
  unreadCounts,
  memoryMb,
  sleepingCount,
  collapsed,
  focusMode,
  theme,
  featuredPromo,
  onOpenPromoUrl,
  onDismissPromo,
  onOpenCreatorLab,
  onSelectWorkspace,
  onSelectService,
  onOpenSplitService,
  onCloseSplitService,
  onToggleNeverSleep,
  onOpenQuietHours,
  onHibernateService,
  onReloadService,
  onToggleMuteService,
  onClearServiceCache,
  onResetServiceSession,
  onOpenExternal,
  onDeleteService,
  onReorderServices,
  onOpenAddModal,
  onOpenSettings,
  onToggleCollapse,
  onToggleFocusMode,
  onCycleTheme,
  onLockApp,
  onContextMenuOpenChange,
}) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);

  const isLight = theme === "light";
  const sidebarBg =
    theme === "oled"
      ? "bg-black border-[#232730]"
      : isLight
      ? "bg-slate-100 border-slate-200 text-slate-900"
      : "bg-[#15181E] border-[#232730] text-zinc-100";

  return (
    <aside
      style={{ width: collapsed ? 72 : 248 }}
      className={`flex h-full shrink-0 flex-col border-r transition-[width] duration-150 ${sidebarBg}`}
    >
      {/* Top: Workspace Switcher */}
      <div className="border-b border-inherit p-3">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            {workspaces.map((ws, idx) => {
              const active = ws.id === activeWorkspaceId;
              return (
                <button
                  key={ws.id}
                  type="button"
                  title={`${ws.name} (Ctrl+${idx + 1})`}
                  onClick={() => onSelectWorkspace(ws.id)}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                    active
                      ? "bg-[#F59E0B] text-[#0D0F12] shadow-sm"
                      : isLight
                      ? "bg-slate-200/70 text-slate-600 hover:bg-slate-200"
                      : "bg-[#0D0F12]/60 text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-100"
                  }`}
                >
                  {ws.name.slice(0, 1).toUpperCase()}
                </button>
              );
            })}
          </div>
        ) : (
          <div
            className={`flex flex-wrap gap-1.5 rounded-xl border p-1.5 ${
              isLight
                ? "border-slate-200 bg-slate-200/50"
                : "border-[#232730] bg-[#0D0F12]/70"
            }`}
          >
            {workspaces.map((ws, idx) => {
              const active = ws.id === activeWorkspaceId;
              return (
                <button
                  key={ws.id}
                  type="button"
                  title={`Switch to ${ws.name} (Ctrl+${idx + 1})`}
                  onClick={() => onSelectWorkspace(ws.id)}
                  className={`flex-1 truncate rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? "bg-[#F59E0B] text-[#0D0F12] shadow-sm"
                      : isLight
                      ? "text-slate-600 hover:bg-slate-200/80"
                      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                  }`}
                >
                  {ws.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Middle: Services List */}
      <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
        {services.map((service) => (
          <ServiceItem
            key={service.id}
            service={service}
            isActive={service.id === activeServiceId}
            isSplitActive={service.id === splitServiceId}
            isLoaded={loadedServiceIds.has(service.id)}
            isMuted={mutedServiceIds.has(service.id)}
            isInQuietHours={quietServiceIds.has(service.id)}
            collapsed={collapsed}
            unreadCount={unreadCounts[service.id] ?? 0}
            focusMode={focusMode}
            theme={theme}
            onSelect={onSelectService}
            onOpenSplit={onOpenSplitService}
            onCloseSplit={onCloseSplitService}
            onToggleNeverSleep={onToggleNeverSleep}
            onOpenQuietHours={onOpenQuietHours}
            onHibernate={onHibernateService}
            onReload={onReloadService}
            onToggleMute={onToggleMuteService}
            onClearCache={onClearServiceCache}
            onResetSession={onResetServiceSession}
            onOpenExternal={onOpenExternal}
            onDelete={onDeleteService}
            onDragStart={(id) => setDraggedId(id)}
            onDragOver={(_, targetId) => {
              if (draggedId && draggedId !== targetId) {
                setDragTargetId(targetId);
              }
            }}
            onDrop={(targetId) => {
              if (draggedId && draggedId !== targetId) {
                onReorderServices(draggedId, targetId);
              }
              setDraggedId(null);
              setDragTargetId(null);
            }}
            onContextMenuOpenChange={onContextMenuOpenChange}
            isDragTarget={dragTargetId === service.id}
          />
        ))}

        {/* Quick Add Button */}
        <button
          type="button"
          onClick={onOpenAddModal}
          title="Add Service"
          className={`mt-2 flex w-full items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 text-xs font-semibold transition-colors ${
            collapsed ? "justify-center px-2" : ""
          } ${
            isLight
              ? "border-slate-300 text-slate-500 hover:border-amber-500 hover:text-amber-600"
              : "border-[#232730] text-zinc-400 hover:border-[#F59E0B]/70 hover:bg-[#F59E0B]/5 hover:text-[#F59E0B]"
          }`}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Add Service</span>}
        </button>
      </div>

      {/* Slot #1: Compact Creator Promo Card (Expanded) or subtle icon (Collapsed) */}
      {featuredPromo && !collapsed && (
        <div className="px-3 pb-2">
          <div
            className={`group relative rounded-xl border p-3 transition-colors ${
              isLight
                ? "border-slate-200 bg-white hover:border-amber-400"
                : "border-[#232730] bg-[#15181E] hover:border-[#F59E0B]/40"
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="rounded-md bg-[#F59E0B]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#F59E0B]">
                {featuredPromo.badge}
              </span>
              <button
                type="button"
                onClick={() => onDismissPromo(featuredPromo.id)}
                title="Dismiss"
                className="rounded px-1 text-xs leading-none text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-200"
              >
                ×
              </button>
            </div>
            <div className="truncate text-xs font-semibold">
              {featuredPromo.title}
            </div>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-400">
              {featuredPromo.description}
            </p>
            <button
              type="button"
              onClick={() => onOpenPromoUrl(featuredPromo.url)}
              className="mt-2 text-[11px] font-bold text-[#F59E0B] transition-colors hover:text-amber-400"
            >
              {featuredPromo.cta_text}
            </button>
          </div>
        </div>
      )}

      {featuredPromo && collapsed && (
        <div className="flex justify-center pb-2">
          <button
            type="button"
            onClick={onOpenCreatorLab}
            title={`${featuredPromo.badge}: ${featuredPromo.title}`}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#232730] bg-[#0D0F12]/70 text-[#F59E0B] transition-colors hover:border-[#F59E0B]/50"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Memory Indicator Card */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <div
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-medium ${
              isLight
                ? "border-slate-200 bg-white text-slate-600"
                : "border-[#232730] bg-[#0D0F12]/70 text-zinc-400"
            }`}
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#10B981]" />
            <span className="truncate">
              Running on <strong className="text-zinc-200">{memoryMb} MB</strong>{" "}
              • {sleepingCount} sleeping
            </span>
          </div>
        </div>
      )}

      {/* Bottom Utility Bar */}
      <div className="border-t border-inherit p-2.5">
        <div
          className={`flex items-center gap-1 ${
            collapsed ? "flex-col" : "justify-between"
          }`}
        >
          <button
            type="button"
            onClick={onToggleFocusMode}
            title={
              focusMode
                ? "Focus Mode On (Click to disable)"
                : "Focus Mode (Mute & Hide Badges)"
            }
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
              focusMode
                ? "bg-[#F59E0B]/20 text-[#F59E0B]"
                : isLight
                ? "text-slate-600 hover:bg-slate-200"
                : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
            }`}
          >
            {focusMode ? (
              <BellOff className="h-4 w-4" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={onLockApp}
            title="Vault Lock (Ctrl + L)"
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
              isLight
                ? "text-slate-600 hover:bg-slate-200"
                : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
            }`}
          >
            <Lock className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onCycleTheme}
            title={`Theme: ${theme.toUpperCase()} (Click to cycle)`}
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
              isLight
                ? "text-slate-600 hover:bg-slate-200"
                : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
            }`}
          >
            {isLight ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            title="Settings"
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
              isLight
                ? "text-slate-600 hover:bg-slate-200"
                : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
            }`}
          >
            <Settings className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            title={
              collapsed
                ? `Expand Sidebar (Running on ${memoryMb} MB • ${sleepingCount} sleeping)`
                : "Collapse Sidebar"
            }
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
              isLight
                ? "text-slate-600 hover:bg-slate-200"
                : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
            }`}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};
