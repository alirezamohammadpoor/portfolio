"use client";

import { useState } from "react";

interface CopyButtonProps {
  value: string;
  label: string;
  copiedLabel?: string;
  hoverLabel?: string;
  className?: string;
}

const DEFAULT_CLASS = "link-underline text-sub uppercase text-primary cursor-pointer";

export default function CopyButton({
  value,
  label,
  copiedLabel = "Copied",
  hoverLabel = "Click to copy",
  className = DEFAULT_CLASS,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);

    try {
      navigator.clipboard?.writeText(value).catch(() => {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
        } catch {}
        document.body.removeChild(ta);
      });
    } catch {}
  };

  const longerLabel = label.length > copiedLabel.length ? label : copiedLabel;

  return (
    <span className="relative inline-flex items-center">
      {/* Desktop: floating tooltip above — hover shows "Click to copy", flips to "Copied" on click */}
      <span
        className={`pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden desktop:flex items-center justify-center rounded-full px-4 pt-[7px] pb-[5px] whitespace-nowrap bg-pistachio text-primary transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.33,1,0.68,1)] ${hovered || copied ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
      >
        <span className="text-sub uppercase invisible">
          {hoverLabel.length > copiedLabel.length ? hoverLabel : copiedLabel}
        </span>
        <span
          className={`text-sub uppercase absolute transition-opacity duration-300 ${copied ? "opacity-0" : "opacity-100"}`}
        >
          {hoverLabel}
        </span>
        <span
          className={`text-sub uppercase absolute transition-opacity duration-300 ${copied ? "opacity-100" : "opacity-0"}`}
        >
          {copiedLabel}
        </span>
      </span>

      {/* Mobile pill — lives in the wrapper, not the button, so SplitText
          running on [data-animate] inside the button can't clip it with
          its line masks. Extends past the button via negative insets. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute -left-3 -right-3 -top-[5px] -bottom-[5px] rounded-full transition-colors duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] desktop:!bg-transparent ${
          copied ? "bg-pistachio" : "bg-transparent"
        }`}
      />

      <button
        onClick={handleCopy}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={`Copy ${label.toLowerCase()}`}
        className={`relative inline-flex items-center justify-center border-0 m-0 p-0 bg-transparent appearance-none focus:outline-none transition-transform duration-150 ease-out active:scale-[0.97] ${className}`}
      >
        {/* Spacer sized to the longer label so the mobile swap doesn't
            reflow siblings. */}
        <span aria-hidden className="invisible">
          {longerLabel}
        </span>
        {/* Animated label layer — data-animate so useInlineAnimation picks
            it up for the entrance SplitText. Text content never changes, so
            SplitText's DOM stays valid across copied state changes. */}
        <span
          data-animate
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${copied ? "desktop:opacity-100 opacity-0" : "opacity-100"}`}
        >
          {label}
        </span>
        {/* Mobile-only "Copied" overlay — cross-fades with the label.
            Separate element so SplitText never sees this text. */}
        <span
          aria-hidden
          className={`desktop:hidden absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${copied ? "opacity-100" : "opacity-0"}`}
        >
          {copiedLabel}
        </span>
      </button>
    </span>
  );
}
