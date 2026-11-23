import React from "react";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FolderOpen,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { DownloadItem, ServiceConfig, ThemeMode } from "../types/app";

interface DownloadsModalProps {
  open: boolean;
  downloads: DownloadItem[];
  services: ServiceConfig[];
  theme: ThemeMode;
  onClose: () => void;
  onOpenFile: (path: string) => void;
  onRevealFile: (path: string) => void;
  onClear: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const DownloadsModal: React.FC<DownloadsModalProps> = ({
  open,
  downloads,
  services,
  theme,
  onClose,
  onOpenFile,
  onRevealFile,
  onClear,
}) => {
  if (!open) return null;

  const isLight = theme === "light";
  const panelBg =
    theme === "oled"
      ? "bg-black border-[#232730] text-zinc-100"
      : isLight
      ? "bg-slate-100 border-slate-200 text-slate-900"
      : "bg-[#15181E] border-[#232730] text-zinc-100";

  const serviceMap = new Map(services.map((s) => [s.id, s.name]));

  return (
    <aside
      style={{ width: 340 }}
      className={`flex h-full shrink-0 flex-col border-l ${panelBg}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-inherit px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#232730] bg-[#0D0F12] text-[#F59E0B]">
            <Download className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight">Downloads</h2>
            <p className="text-[11px] text-zinc-400">
              {downloads.length === 0
                ? "Session history"
                : `${downloads.length} file${downloads.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {downloads.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              title="Clear List"
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Close Downloads Panel"
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Downloads List */}
      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        {downloads.length === 0 ? (
          <div
            className={`flex h-full min-h-48 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center ${
              isLight ? "border-slate-300" : "border-[#232730]"
            }`}
          >
            <Download className="mb-2.5 h-6 w-6 text-zinc-500" />
            <p className="text-xs font-medium text-zinc-400">
              No downloads yet in this session.
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Files you download from any chat will appear here.
            </p>
          </div>
        ) : (
          downloads.map((item) => {
            const serviceName = serviceMap.get(item.serviceId) ?? "Service";
            const pct =
              item.totalBytes > 0
                ? Math.min(
                    100,
                    Math.round((item.receivedBytes / item.totalBytes) * 100)
                  )
                : null;

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-3 ${
                  isLight
                    ? "border-slate-200 bg-white"
                    : "border-[#232730] bg-[#0D0F12]/70"
                }`}
              >
                <div className="truncate text-xs font-semibold">
                  {item.fileName}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
                  <span className="font-medium text-[#F59E0B]">
                    {serviceName}
                  </span>
                  <span>•</span>
                  <span>
                    {formatBytes(item.receivedBytes)}
                    {item.totalBytes > 0
                      ? ` / ${formatBytes(item.totalBytes)}`
                      : ""}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  {item.state === "completed" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#10B981]">
                      <CheckCircle2 className="h-3 w-3" />
                      Completed
                    </span>
                  ) : item.state === "interrupted" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-rose-400">
                      <XCircle className="h-3 w-3" />
                      Interrupted
                    </span>
                  ) : (
                    <span className="text-[11px] text-sky-400">
                      Downloading{pct !== null ? ` (${pct}%)` : "..."}
                    </span>
                  )}

                  {item.state === "completed" && item.filePath && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenFile(item.filePath)}
                        title="Open File"
                        className="flex items-center gap-1 rounded-lg bg-[#F59E0B] px-2 py-1 text-[11px] font-bold text-[#0D0F12] hover:bg-amber-400"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => onRevealFile(item.filePath)}
                        title="Open Folder"
                        className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium ${
                          isLight
                            ? "border-slate-200 bg-slate-50 hover:bg-slate-100"
                            : "border-[#232730] bg-[#15181E] hover:bg-white/5"
                        }`}
                      >
                        <FolderOpen className="h-3 w-3 text-[#10B981]" />
                        Folder
                      </button>
                    </div>
                  )}
                </div>

                {item.state === "inProgress" && pct !== null && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#232730]">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full rounded-full bg-[#F59E0B] transition-all"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
