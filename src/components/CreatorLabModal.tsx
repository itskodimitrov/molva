import React from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Download,
  ExternalLink,
  GitBranch,
  Sparkles,
  X,
} from "lucide-react";
import {
  appendSrcParam,
  CURRENT_MOLVA_VERSION,
  EcosystemFeed,
} from "../services/ecosystemFeed";
import { ThemeMode } from "../types/app";

interface CreatorLabModalProps {
  open: boolean;
  feed: EcosystemFeed;
  theme: ThemeMode;
  onClose: () => void;
  onOpenUrl: (url: string) => void;
}

export const CreatorLabModal: React.FC<CreatorLabModalProps> = ({
  open,
  feed,
  theme,
  onClose,
  onOpenUrl,
}) => {
  if (!open) return null;

  const isLight = theme === "light";
  const hasUpdate =
    feed.latest_version.trim().replace(/^v/i, "") !==
    CURRENT_MOLVA_VERSION.trim().replace(/^v/i, "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
      <div
        className={`relative max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-2xl border p-6 shadow-2xl ${
          isLight
            ? "border-slate-200 bg-white text-slate-900"
            : "border-[#232730] bg-[#15181E] text-zinc-100"
        }`}
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#F59E0B]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                Creator&apos;s Lab &amp; What&apos;s New
              </h2>
              <p className="text-xs text-zinc-400">
                Updates &amp; free tools from the creator of Molva.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 1. Version Status */}
        <div
          className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
            isLight
              ? "border-slate-200 bg-slate-50"
              : "border-[#232730] bg-[#0D0F12]/80"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {hasUpdate ? (
              <Download className="h-4 w-4 text-[#F59E0B]" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
            )}
            <div>
              <div className="text-xs font-bold">
                {hasUpdate
                  ? `New Molva update available: v${feed.latest_version}`
                  : `You are running the latest Molva (v${CURRENT_MOLVA_VERSION})`}
              </div>
              <div className="text-[11px] text-zinc-400">
                Latest release: v{feed.latest_version}
              </div>
            </div>
          </div>

          {hasUpdate && (
            <button
              type="button"
              onClick={() => onOpenUrl(feed.download_url)}
              className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-3 py-1.5 text-xs font-bold text-[#0D0F12] hover:bg-amber-400"
            >
              <Download className="h-3.5 w-3.5" />
              Download Update
            </button>
          )}
        </div>

        {/* 2. Ecosystem Projects */}
        <div className="mb-5">
          <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            More from Brand4e Ecosystem
          </div>
          <div className="space-y-2.5">
            {feed.projects.map((proj) => (
              <div
                key={proj.id}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors ${
                  isLight
                    ? "border-slate-200 bg-slate-50 hover:border-amber-400"
                    : "border-[#232730] bg-[#0D0F12]/70 hover:border-[#F59E0B]/40"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{proj.title}</span>
                    <span className="rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-0.5 text-[10px] font-bold text-[#F59E0B]">
                      {proj.badge}
                    </span>
                    {proj.is_new && (
                      <span className="rounded-full bg-[#10B981]/20 px-2 py-0.5 text-[10px] font-bold text-[#10B981]">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">{proj.tagline}</p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onOpenUrl(appendSrcParam(proj.url, "creator_lab"))
                  }
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-[#F59E0B] px-3 py-1.5 text-xs font-bold text-[#0D0F12] transition-colors hover:bg-amber-400"
                >
                  Open
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Built by Brand4e */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
            isLight
              ? "border-slate-200 bg-slate-50"
              : "border-[#232730] bg-[#0D0F12]/60"
          }`}
        >
          <div>
            <div className="text-xs font-bold">Built by Brand4e</div>
            <p className="text-[11px] text-zinc-400">
              100% free &amp; open-source desktop software.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenUrl("https://molva.brand4e.bg")}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                isLight
                  ? "border-slate-200 bg-white hover:bg-slate-100"
                  : "border-[#232730] bg-[#15181E] hover:border-[#F59E0B]/50 hover:text-[#F59E0B]"
              }`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              molva.brand4e.bg
            </button>
            <button
              type="button"
              onClick={() => onOpenUrl("https://github.com/itskodimitrov/molva")}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                isLight
                  ? "border-slate-200 bg-white hover:bg-slate-100"
                  : "border-[#232730] bg-[#15181E] hover:border-white/25"
              }`}
            >
              <GitBranch className="h-3.5 w-3.5" />
              GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
