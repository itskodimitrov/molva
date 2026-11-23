import React, { useState } from "react";
import { Globe, Plus, Search, X } from "lucide-react";
import { faviconUrlFor, SERVICE_PRESETS } from "../constants/presets";
import { ServicePreset, ThemeMode } from "../types/app";

interface AddServiceModalProps {
  open: boolean;
  theme: ThemeMode;
  onClose: () => void;
  onAdd: (name: string, url: string, iconUrl: string | null) => void;
}

export const AddServiceModal: React.FC<AddServiceModalProps> = ({
  open,
  theme,
  onClose,
  onAdd,
}) => {
  const [query, setQuery] = useState("");
  const [customName, setCustomName] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const isLight = theme === "light";
  const filteredPresets = SERVICE_PRESETS.filter((p) =>
    p.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const handlePresetClick = (preset: ServicePreset) => {
    onAdd(preset.name, preset.url, faviconUrlFor(preset.domain));
    setQuery("");
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = customName.trim();
    let normalizedUrl = customUrl.trim();
    if (!trimmedName || !normalizedUrl) {
      setError("Please enter both a service name and URL.");
      return;
    }
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    try {
      const parsed = new URL(normalizedUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        setError("Only http:// and https:// URLs are supported.");
        return;
      }
      onAdd(trimmedName, parsed.toString(), faviconUrlFor(parsed.hostname));
      setCustomName("");
      setCustomUrl("");
      setError(null);
      onClose();
    } catch {
      setError("Please enter a valid URL.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
      <div
        className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl ${
          isLight
            ? "border-slate-200 bg-white text-slate-900"
            : "border-[#232730] bg-[#15181E] text-zinc-100"
        }`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Add Service</h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              <span className="font-medium text-[#10B981]">
                Isolated session
              </span>{" "}
              — each app keeps its own sandboxed cookies &amp; storage.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search apps (WhatsApp, Messenger, Discord, Teams...)"
            className={`w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-[#F59E0B] ${
              isLight
                ? "border-slate-200 bg-slate-50 text-slate-900"
                : "border-[#232730] bg-[#0D0F12] text-zinc-100 placeholder:text-zinc-500"
            }`}
          />
        </div>

        {/* Presets Grid (5 columns so all presets fit cleanly) */}
        <div className="mb-6 grid max-h-72 grid-cols-3 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-5">
          {filteredPresets.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={`group flex flex-col items-center gap-2.5 rounded-xl border p-3.5 text-xs font-medium transition-all ${
                isLight
                  ? "border-slate-200 bg-slate-50 hover:border-amber-500 hover:bg-amber-50/50"
                  : "border-[#232730] bg-[#0D0F12]/70 hover:-translate-y-0.5 hover:border-[#F59E0B]/70 hover:bg-white/[0.05]"
              }`}
            >
              <img
                src={faviconUrlFor(preset.domain)}
                alt={preset.name}
                className="h-7 w-7 rounded-md object-contain"
              />
              <span className="w-full truncate text-center">{preset.name}</span>
            </button>
          ))}
          {filteredPresets.length === 0 && (
            <p className="col-span-full py-4 text-center text-xs text-zinc-500">
              No matching presets. Add it below as a Custom URL.
            </p>
          )}
        </div>

        {/* Custom URL Form */}
        <form
          onSubmit={handleCustomSubmit}
          className={`space-y-3 rounded-xl border p-4 ${
            isLight
              ? "border-slate-200 bg-slate-50"
              : "border-[#232730] bg-[#0D0F12]/60"
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <Globe className="h-3.5 w-3.5 text-[#F59E0B]" />
            Custom URL
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Name (e.g. Linear)"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className={`rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:border-[#F59E0B] ${
                isLight
                  ? "border-slate-300 bg-white text-slate-900"
                  : "border-[#232730] bg-[#15181E] text-zinc-100"
              }`}
            />
            <input
              type="text"
              placeholder="https://linear.app"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className={`rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:border-[#F59E0B] ${
                isLight
                  ? "border-slate-300 bg-white text-slate-900"
                  : "border-[#232730] bg-[#15181E] text-zinc-100"
              }`}
            />
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-[#F59E0B] px-4 py-2 text-xs font-bold text-[#0D0F12] transition-colors hover:bg-amber-400"
            >
              <Plus className="h-4 w-4" />
              Add Custom Service
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
