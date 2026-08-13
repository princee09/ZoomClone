"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMeeting, joinMeeting } from "@/lib/api";

interface JoinMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillCode?: string;
}

export default function JoinMeetingModal({ isOpen, onClose, prefillCode }: JoinMeetingModalProps) {
  const router = useRouter();
  const [meetingId, setMeetingId] = useState(prefillCode || "");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dontConnectAudio, setDontConnectAudio] = useState(false);
  const [turnOffVideo, setTurnOffVideo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (isOpen) {
      setError("");
      if (prefillCode) setMeetingId(prefillCode);
    }
  }, [isOpen, prefillCode]);

  if (!isOpen) return null;

  const extractMeetingCode = (input: string): string => {
    // Strip whitespace and dashes
    let cleaned = input.replace(/[\s-]/g, "");
    // Check if it's a URL with /join/ path
    const urlMatch = cleaned.match(/\/join\/(\d+)/);
    if (urlMatch) return urlMatch[1];
    // Check if it's just digits
    const digitMatch = cleaned.match(/^(\d{9,11})$/);
    if (digitMatch) return digitMatch[1];
    return cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!meetingId.trim()) {
      setError("Please enter a meeting ID or link");
      return;
    }
    if (!displayName.trim()) {
      setError("Please enter your name");
      return;
    }

    const code = extractMeetingCode(meetingId);
    setLoading(true);

    try {
      await getMeeting(code);
      await joinMeeting(code, displayName.trim());
      onClose();
      router.push(`/meeting/${code}?name=${encodeURIComponent(displayName.trim())}`);
    } catch {
      setError("Invalid meeting ID or this meeting has ended");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="modal-content bg-white rounded-2xl shadow-2xl w-full max-w-[440px] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Join Meeting</h2>
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
            <div>
              <label className="block text-xs font-medium text-[var(--zoom-text-secondary)] mb-1.5">
                Meeting ID or Personal Link Name
              </label>
              <input
                ref={inputRef}
                type="text"
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
                placeholder="Enter meeting ID or link"
                className="w-full px-4 py-2.5 text-sm border rounded-lg outline-none transition-all focus:border-[var(--zoom-blue)] focus:ring-2 focus:ring-[var(--zoom-blue)]/20"
                style={{ borderColor: "var(--zoom-card-border)" }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--zoom-text-secondary)] mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-2.5 text-sm border rounded-lg outline-none transition-all focus:border-[var(--zoom-blue)] focus:ring-2 focus:ring-[var(--zoom-blue)]/20"
                style={{ borderColor: "var(--zoom-card-border)" }}
              />
            </div>

            {/* Inert checkboxes */}
            <div className="flex flex-col gap-2 pt-1">
              <label className="flex items-center gap-2 text-sm text-[var(--zoom-text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={dontConnectAudio}
                  onChange={(e) => setDontConnectAudio(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--zoom-blue)]"
                />
                Don&apos;t connect to audio
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--zoom-text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={turnOffVideo}
                  onChange={(e) => setTurnOffVideo(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--zoom-blue)]"
                />
                Turn off my video
              </label>
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
                  Joining...
                </span>
              ) : (
                "Join"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
