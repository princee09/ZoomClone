"use client";

import type { Meeting } from "@/lib/api";

function formatMeetingCode(code: string): string {
  if (code.length === 10) {
    return `${code.slice(0, 3)} ${code.slice(3, 6)} ${code.slice(6)}`;
  }
  return code;
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

interface MeetingCardProps {
  meeting: Meeting;
  variant: "upcoming" | "recent";
  onStart?: (meetingCode: string) => void;
}

export default function MeetingCard({ meeting, variant, onStart }: MeetingCardProps) {
  return (
    <div
      className="flex items-center justify-between px-5 py-4 rounded-xl border bg-white transition-all duration-150 hover:shadow-sm"
      style={{ borderColor: "var(--zoom-card-border)", boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Color indicator */}
        <div
          className="w-1 h-10 rounded-full shrink-0"
          style={{
            backgroundColor: variant === "upcoming" ? "var(--zoom-blue)" : "var(--zoom-text-secondary)",
          }}
        />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--foreground)] truncate">
            {meeting.title}
          </h3>
          <div className="flex items-center gap-3 mt-1 text-xs text-[var(--zoom-text-secondary)]">
            <span>{formatDateTime(meeting.scheduled_at || meeting.created_at)}</span>
            {meeting.duration_minutes && (
              <>
                <span className="w-1 h-1 rounded-full bg-[var(--zoom-text-secondary)]" />
                <span>{formatDuration(meeting.duration_minutes)}</span>
              </>
            )}
          </div>
          <p className="text-xs text-[var(--zoom-text-secondary)] mt-0.5 font-mono">
            ID: {formatMeetingCode(meeting.meeting_code)}
          </p>
        </div>
      </div>

      {variant === "upcoming" && onStart && (
        <button
          onClick={() => onStart(meeting.meeting_code)}
          className="ml-4 px-4 py-1.5 text-xs font-semibold rounded-lg text-white transition-all duration-150 hover:opacity-90 active:scale-95 shrink-0"
          style={{ backgroundColor: "var(--zoom-blue)" }}
        >
          Start
        </button>
      )}

      {variant === "recent" && (
        <span className="ml-4 px-3 py-1 text-[10px] font-medium rounded-full bg-[#F0F0F5] text-[var(--zoom-text-secondary)] shrink-0">
          {meeting.meeting_type === "instant" ? "Instant" : "Scheduled"}
        </span>
      )}
    </div>
  );
}
