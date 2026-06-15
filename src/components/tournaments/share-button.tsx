"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

export function ShareButton({
  className = "",
  text,
  title,
}: {
  className?: string;
  text: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);

  async function shareTournament() {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }

      await copyToClipboard(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Cancelling the native share sheet should not surface as an app error.
    }
  }

  return (
    <button
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-black transition hover:brightness-95 ${className}`}
      onClick={shareTournament}
      type="button"
    >
      {copied ? <Check size={16} /> : <Share2 size={16} />}
      {copied ? "Copied link" : "Share"}
    </button>
  );
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}
