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

  return (
    <span className="relative inline-block">
      {/* Desktop: floating tooltip above */}
      <span
        className={`pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden desktop:flex items-center justify-center rounded-full px-4 pt-[7px] pb-[5px] whitespace-nowrap bg-pistachio text-primary transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${hovered || copied ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
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

      <button
        data-animate
        onClick={handleCopy}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={`Copy ${label.toLowerCase()}`}
        className={`relative inline-block border-0 m-0 p-0 bg-transparent appearance-none focus:outline-none align-baseline ${className}`}
      >
        {/* Pill background — absolute, extends outside button bounds (negative insets)
            so it doesn't affect the button's own size, which keeps alignment with
            sibling links stable. Only visible on mobile when copied. */}
        <span
          aria-hidden
          className={`pointer-events-none absolute -left-3 -right-3 -top-[3px] -bottom-[3px] rounded-full transition-colors duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] desktop:!bg-transparent ${
            copied ? "bg-pistachio" : "bg-transparent"
          }`}
        />
        <span className="relative">
          {copied ? (
            <>
              <span className="desktop:hidden">{copiedLabel}</span>
              <span className="hidden desktop:inline">{label}</span>
            </>
          ) : (
            label
          )}
        </span>
      </button>
    </span>
  );
}
