"use client";

import { useState } from "react";

export default function EmailCopyButton({ email }: { email: string }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative inline-block">
      {/* Desktop tooltip — hover with crossfade */}
      <div
        className={`pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 hidden desktop:flex items-center justify-center rounded-full px-4 pt-[7px] pb-[5px] whitespace-nowrap bg-pistachio text-primary transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
      >
        <span className="text-sub uppercase invisible">Click to copy</span>
        <span
          className={`text-sub uppercase absolute transition-opacity duration-300 ${copied ? "opacity-0" : "opacity-100"}`}
        >
          Click to copy
        </span>
        <span
          className={`text-sub uppercase absolute transition-opacity duration-300 ${copied ? "opacity-100" : "opacity-0"}`}
        >
          Copied
        </span>
      </div>
      {/* Mobile tooltip — click only, shows "Copied" */}
      <div
        className={`pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 flex desktop:hidden items-center justify-center rounded-full px-4 pt-[7px] pb-[5px] whitespace-nowrap bg-pistachio text-primary transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${copied ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
      >
        <span className="text-sub uppercase">Copied</span>
      </div>
      {/* Email is the clickable element */}
      <button
        data-animate
        onClick={handleCopy}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        aria-label="Copy email address"
        className="link-underline text-sub uppercase text-primary cursor-pointer"
      >
        Email
      </button>
    </div>
  );
}
