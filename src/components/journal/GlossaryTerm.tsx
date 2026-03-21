"use client";

import { useState, useRef, useEffect } from "react";

interface GlossaryTermProps {
  explanation: string;
  children: React.ReactNode;
}

export default function GlossaryTerm({
  explanation,
  children,
}: GlossaryTermProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Auto-hide on mobile after 3s
  const handleClick = () => {
    setVisible((prev) => !prev);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(false), 6000);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <span className="relative inline">
      {/* Tooltip — fixed centered on mobile, absolute on desktop */}
      <span
        className={`pointer-events-none fixed bottom-auto left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 desktop:absolute desktop:bottom-full desktop:top-auto desktop:translate-y-0 desktop:-translate-x-1/2 mb-0 flex flex-col items-center transition-all duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] z-50 ${visible ? "opacity-100" : "opacity-0 desktop:translate-y-1"}`}
      >
        <span className="rounded-2xl px-4 py-2 whitespace-normal max-w-[300px] w-max bg-pistachio text-primary text-sub text-left text-center desktop:text-left">
          {explanation}
        </span>
        <span className="hidden desktop:block w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-pistachio" />
      </span>
      {/* Highlighted term */}
      <span
        onClick={handleClick}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => {
          setVisible(false);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }}
        className="bg-lightpistachio cursor-pointer"
      >
        {children}
      </span>
    </span>
  );
}
