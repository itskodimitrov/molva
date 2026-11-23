import React, { useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  ShieldAlert,
  X,
} from "lucide-react";
import { LinkSafetyPrompt, ThemeMode } from "../types/app";

interface LinkSafetyModalProps {
  prompt: LinkSafetyPrompt | null;
  sourceServiceName?: string | null;
  theme: ThemeMode;
  onCancel: () => void;
  onProceed: (url: string) => void;
}

export const LinkSafetyModal: React.FC<LinkSafetyModalProps> = ({
  prompt,
  sourceServiceName,
  theme,
  onCancel,
  onProceed,
}) => {
  const [copied, setCopied] = useState(false);

  if (!prompt) return null;

  const isLight = theme === "light";
  const isSuspicious = prompt.reasons.length > 0;

  const handleCopy = () => {
    navigator.clipboard?.writeText(prompt.url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm">
      <div
        className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${
          isLight
            ? "border-slate-200 bg-white text-slate-900"
            : "border-[#232730] bg-[#15181E] text-zinc-100"
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                isSuspicious
                  ? "border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#F59E0B]"
                  : "border-[#10B981]/40 bg-[#10B981]/15 text-[#10B981]"
              }`}
            >
              {isSuspicious ? (
                <ShieldAlert className="h-5 w-5" />
              ) : (
                <Globe className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                {isSuspicious
                  ? "Link Safety Warning"
                  : "Open in Default Browser?"}
              </h2>
              <p className="text-xs text-zinc-400">
                {sourceServiceName
                  ? `External link clicked in ${sourceServiceName}`
                  : "External link intercepted from chat"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className={`rounded-xl border p-4 ${
            isLight
              ? "border-slate-200 bg-slate-50"
              : "border-[#232730] bg-[#0D0F12]"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#F59E0B]">
              {prompt.host}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-lg border border-[#232730] px-2 py-1 text-[11px] font-medium text-zinc-400 hover:bg-white/5 hover:text-white"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-[#10B981]" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy Link
                </>
              )}
            </button>
          </div>
          <p className="mt-2 max-h-24 overflow-y-auto break-all font-mono text-xs text-zinc-300">
            {prompt.url}
          </p>
        </div>

        {isSuspicious && (
          <ul className="mt-4 space-y-1.5 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-3">
            {prompt.reasons.map((reason) => (
              <li
                key={reason}
                className="flex items-center gap-2 text-xs text-amber-300"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F59E0B]" />
                {reason}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-colors ${
              isLight
                ? "border-slate-200 hover:bg-slate-100"
                : "border-[#232730] text-zinc-300 hover:bg-white/5"
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onProceed(prompt.url)}
            className="flex items-center gap-1.5 rounded-xl bg-[#F59E0B] px-5 py-2 text-xs font-bold text-[#0D0F12] transition-colors hover:bg-amber-400"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in Browser
          </button>
        </div>
      </div>
    </div>
  );
};
