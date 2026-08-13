"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createInstantMeeting } from "@/lib/api";

interface HomeActionButtonsProps {
  onJoinClick: () => void;
  onScheduleClick: () => void;
}

export default function HomeActionButtons({ onJoinClick, onScheduleClick }: HomeActionButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleNewMeeting = async () => {
    setLoading(true);
    try {
      const meeting = await createInstantMeeting();
      router.push(`/meeting/${meeting.meeting_code}?name=Klaus+Schwarz`);
    } catch (err) {
      console.error("Failed to create meeting:", err);
      setLoading(false);
    }
  };

  const handleShareScreen = () => {
    alert("Join or start a meeting to share your screen");
  };

  const buttons = [
    {
      label: "New Meeting",
      color: "#F26D21",
      onClick: handleNewMeeting,
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      ),
    },
    {
      label: "Join",
      color: "#2D8CFF",
      onClick: onJoinClick,
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <line x1="20" y1="8" x2="20" y2="14" />
          <line x1="23" y1="11" x2="17" y2="11" />
        </svg>
      ),
    },
    {
      label: "Schedule",
      color: "#2D8CFF",
      onClick: onScheduleClick,
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      label: "Share Screen",
      color: "#00A85E",
      onClick: handleShareScreen,
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex gap-6 mb-10">
      {buttons.map((btn) => (
        <button
          key={btn.label}
          onClick={btn.onClick}
          disabled={loading && btn.label === "New Meeting"}
          className="flex flex-col items-center gap-2 group"
        >
          <div
            className="w-[56px] h-[56px] rounded-full flex items-center justify-center transition-all duration-200 shadow-md group-hover:shadow-lg group-hover:scale-105 group-active:scale-95"
            style={{ backgroundColor: btn.color }}
          >
            {loading && btn.label === "New Meeting" ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              btn.icon
            )}
          </div>
          <span className="text-xs font-medium text-[var(--foreground)]">
            {btn.label}
          </span>
        </button>
      ))}
    </div>
  );
}
