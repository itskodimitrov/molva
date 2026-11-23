import React, { useEffect, useState } from "react";
import { Clock, X } from "lucide-react";
import { QuietHoursConfig, ServiceConfig, ThemeMode } from "../types/app";

interface QuietHoursModalProps {
  service: ServiceConfig | null;
  theme: ThemeMode;
  onClose: () => void;
  onSave: (serviceId: string, quietHours: QuietHoursConfig) => void;
}

export const QuietHoursModal: React.FC<QuietHoursModalProps> = ({
  service,
  theme,
  onClose,
  onSave,
}) => {
  const [enabled, setEnabled] = useState(false);
  const [startTime, setStartTime] = useState("18:30");
  const [endTime, setEndTime] = useState("09:00");
  const [weekends, setWeekends] = useState(true);

  useEffect(() => {
    if (!service) return;
    setEnabled(service.quietHours?.enabled ?? false);
    setStartTime(service.quietHours?.startTime ?? "18:30");
    setEndTime(service.quietHours?.endTime ?? "09:00");
    setWeekends(service.quietHours?.weekends ?? true);
  }, [service]);

  if (!service) return null;

  const isLight = theme === "light";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(service.id, { enabled, startTime, endTime, weekends });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${
          isLight
            ? "border-slate-200 bg-white text-slate-900"
            : "border-[#232730] bg-[#15181E] text-zinc-100"
        }`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#232730] bg-[#0D0F12] text-[#F59E0B]">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Quiet Hours — {service.name}
              </h2>
              <p className="text-xs text-zinc-400">
                Auto-mute audio &amp; hide badges outside your work hours.
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

        <div className="space-y-4">
          <label
            className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 ${
              isLight
                ? "border-slate-200 bg-slate-50"
                : "border-[#232730] bg-[#0D0F12]/60"
            }`}
          >
            <span className="text-xs font-semibold">
              Enable Quiet Hours for {service.name}
            </span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 accent-[#F59E0B]"
            />
          </label>

          <div
            className={`grid grid-cols-2 gap-3 rounded-xl border p-3.5 transition-opacity ${
              !enabled ? "pointer-events-none opacity-45" : ""
            } ${
              isLight
                ? "border-slate-200 bg-slate-50"
                : "border-[#232730] bg-[#0D0F12]/60"
            }`}
          >
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Mute From
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2 text-xs outline-none focus:border-[#F59E0B] ${
                  isLight
                    ? "border-slate-300 bg-white"
                    : "border-[#232730] bg-[#15181E]"
                }`}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Until
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2 text-xs outline-none focus:border-[#F59E0B] ${
                  isLight
                    ? "border-slate-300 bg-white"
                    : "border-[#232730] bg-[#15181E]"
                }`}
              />
            </div>
          </div>

          <label
            className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-opacity ${
              !enabled ? "pointer-events-none opacity-45" : ""
            } ${
              isLight
                ? "border-slate-200 bg-slate-50"
                : "border-[#232730] bg-[#0D0F12]/60"
            }`}
          >
            <span className="text-xs">Mute all day on weekends (Sat &amp; Sun)</span>
            <input
              type="checkbox"
              checked={weekends}
              onChange={(e) => setWeekends(e.target.checked)}
              className="h-4 w-4 accent-[#F59E0B]"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#232730] px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl bg-[#F59E0B] px-5 py-2 text-xs font-bold text-[#0D0F12] hover:bg-amber-400"
          >
            Save Schedule
          </button>
        </div>
      </form>
    </div>
  );
};
