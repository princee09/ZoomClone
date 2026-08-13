"use client";

import { useState, useEffect, useRef } from "react";
import { scheduleMeeting } from "@/lib/api";

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduled: () => void;
}

export default function ScheduleMeetingModal({ isOpen, onClose, onScheduled }: ScheduleMeetingModalProps) {
  const [title, setTitle] = useState("Klaus Schwarz's Meeting");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setError("");
      // Default to tomorrow, 10:00 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(tomorrow.toISOString().split("T")[0]);
      setTime("10:00");
      if (titleRef.current) titleRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Please enter a meeting topic");
      return;
    }
    if (!date || !time) {
      setError("Please select a date and time");
      return;
    }

    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
    setLoading(true);

    try {
      await scheduleMeeting({
        title: title.trim(),
        description: description.trim() || undefined,
        scheduled_at: scheduledAt,
        duration_minutes: duration,
      });
      onScheduled();
      onClose();
      // Reset form
      setTitle("Klaus Schwarz's Meeting");
      setDescription("");
      setDuration(30);
    } catch {
      setError("Failed to schedule meeting. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const durationOptions = [
    { value: 15, label: "15 min" },
    { value: 30, label: "30 min" },
    { value: 45, label: "45 min" },
    { value: 60, label: "1 hr" },
    { value: 90, label: "1.5 hr" },
    { value: 120, label: "2 hr" },
  ];

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="modal-content bg-white rounded-2xl shadow-2xl w-full max-w-[480px] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Schedule Meeting</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F0F0F5] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-2">
          <div className="space-y-4">
            {/* Topic */}
            <div>
              <label className="block text-xs font-medium text-[var(--zoom-text-secondary)] mb-1.5">
                Topic
              </label>
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Klaus Schwarz's Meeting"
                className="w-full px-4 py-2.5 text-sm border rounded-lg outline-none transition-all focus:border-[var(--zoom-blue)] focus:ring-2 focus:ring-[var(--zoom-blue)]/20"
                style={{ borderColor: "var(--zoom-card-border)" }}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-[var(--zoom-text-secondary)] mb-1.5">
                Description <span className="text-[var(--zoom-text-secondary)]">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                rows={2}
                className="w-full px-4 py-2.5 text-sm border rounded-lg outline-none transition-all focus:border-[var(--zoom-blue)] focus:ring-2 focus:ring-[var(--zoom-blue)]/20 resize-none"
                style={{ borderColor: "var(--zoom-card-border)" }}
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--zoom-text-secondary)] mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border rounded-lg outline-none transition-all focus:border-[var(--zoom-blue)] focus:ring-2 focus:ring-[var(--zoom-blue)]/20"
                  style={{ borderColor: "var(--zoom-card-border)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--zoom-text-secondary)] mb-1.5">
                  Start Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border rounded-lg outline-none transition-all focus:border-[var(--zoom-blue)] focus:ring-2 focus:ring-[var(--zoom-blue)]/20"
                  style={{ borderColor: "var(--zoom-card-border)" }}
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-medium text-[var(--zoom-text-secondary)] mb-1.5">
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-4 py-2.5 text-sm border rounded-lg outline-none transition-all focus:border-[var(--zoom-blue)] focus:ring-2 focus:ring-[var(--zoom-blue)]/20 bg-white"
                style={{ borderColor: "var(--zoom-card-border)" }}
              >
                {durationOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Meeting ID section */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#F7F8FA] rounded-lg">
              <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: "var(--zoom-blue)" }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--zoom-blue)" }} />
              </div>
              <span className="text-sm text-[var(--foreground)]">Generate Automatically</span>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 rounded-lg border border-red-200">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E02828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-semibold text-white rounded-lg transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              style={{ backgroundColor: "var(--zoom-blue)" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Scheduling...
                </span>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
