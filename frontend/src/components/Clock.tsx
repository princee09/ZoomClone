"use client";

import { useState, useEffect } from "react";

export default function Clock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!time) {
    return (
      <div className="mb-10">
        <h1 className="text-[56px] font-semibold tracking-tight leading-none text-transparent select-none">
          00:00 PM
        </h1>
        <p className="text-[15px] mt-1 text-transparent select-none font-medium">
          Loading date...
        </p>
      </div>
    );
  }

  const formattedTime = time.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const formattedDate = time.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mb-10">
      <h1
        className="text-[56px] font-semibold tracking-tight leading-none text-[var(--foreground)]"
        suppressHydrationWarning
      >
        {formattedTime}
      </h1>
      <p
        className="text-[15px] mt-1 text-[var(--zoom-text-secondary)] font-medium"
        suppressHydrationWarning
      >
        {formattedDate}
      </p>
    </div>
  );
}