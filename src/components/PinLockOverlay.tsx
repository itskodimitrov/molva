import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";
import logoImg from "../assets/logo.png";

interface PinLockOverlayProps {
  open: boolean;
  pinHash: string;
  onUnlock: () => void;
}

export const PinLockOverlay: React.FC<PinLockOverlayProps> = ({
  open,
  pinHash,
  onUnlock,
}) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const encoded = new TextEncoder().encode(pin.trim());
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (hashHex === pinHash) {
      setPin("");
      setError(false);
      onUnlock();
    } else {
      setError(true);
      setPin("");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0D0F12]/90 backdrop-blur-2xl">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col items-center rounded-3xl border border-[#232730] bg-[#15181E] p-8 text-center shadow-2xl"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#232730] bg-[#0D0F12] p-3 shadow-lg shadow-amber-500/10">
          <img
            src={logoImg}
            alt="Molva"
            className="h-full w-full object-contain"
          />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-100">
          Vault Locked
        </h2>
        <p className="mt-1.5 text-xs text-zinc-400">
          Enter your PIN to unlock your workspaces.
        </p>

        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            if (error) setError(false);
          }}
          placeholder="Enter PIN"
          className={`mt-5 w-full rounded-xl border bg-[#0D0F12] px-4 py-3 text-center text-base tracking-widest text-zinc-100 outline-none focus:border-[#F59E0B] ${
            error ? "border-rose-500" : "border-[#232730]"
          }`}
        />

        {error && (
          <p className="mt-2 text-xs text-rose-400">
            Incorrect PIN. Please try again.
          </p>
        )}

        <button
          type="submit"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F59E0B] px-5 py-3 text-sm font-bold text-[#0D0F12] shadow-lg shadow-amber-500/15 transition-colors hover:bg-amber-400"
        >
          <ShieldCheck className="h-4 w-4" />
          Unlock Vault
        </button>
      </form>
    </div>
  );
};
