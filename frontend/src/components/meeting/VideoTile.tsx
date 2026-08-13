"use client";

import { useEffect, useRef } from "react";

interface VideoTileProps {
  displayName: string;
  isMuted: boolean;
  videoOn: boolean;
  isHost: boolean;
  /** If provided, renders a live <video> element instead of a placeholder */
  stream?: MediaStream | null;
  /** Mute the element to avoid local audio feedback */
  isLocal?: boolean;
  size?: "normal" | "large" | "featured";
  /** True while WebRTC connection is being established */
  isConnecting?: boolean;
  /** True if this peer is screen sharing */
  isScreenSharing?: boolean;
}

export default function VideoTile({
  displayName,
  isMuted,
  videoOn,
  isHost,
  stream,
  isLocal = false,
  size = "normal",
  isConnecting = false,
  isScreenSharing = false,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Attach the stream to the video element whenever it changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const minHeight =
    size === "featured" ? "min-h-[400px]" : size === "large" ? "min-h-[280px]" : "min-h-[180px]";

  const showVideo = !!stream && videoOn;

  return (
    <div
      className={`relative rounded-xl overflow-hidden flex items-center justify-center ${minHeight} w-full`}
      style={{ backgroundColor: "#2A2A2E" }}
    >
      {/* ── Live video element ── */}
      {showVideo && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* ── No-stream / video-off: show initials avatar ── */}
      {!showVideo && (
        <div className="relative flex items-center justify-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-semibold"
            style={{ backgroundColor: "#3B82F6" }}
          >
            {initials}
          </div>

          {/* Connecting spinner overlay on avatar */}
          {isConnecting && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border-2 border-[var(--zoom-blue)] border-t-transparent animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* ── "Connecting..." text shown while PC negotiating ── */}
      {isConnecting && !showVideo && (
        <p className="absolute bottom-10 left-0 right-0 text-center text-xs text-[#999]">
          Connecting…
        </p>
      )}

      {/* ── Screen share badge ── */}
      {isScreenSharing && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--zoom-blue)]/80 text-white text-[10px] font-semibold">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Sharing
        </div>
      )}

      {/* ── Name + mute overlay (always visible, identical to original) ── */}
      <div className="absolute bottom-2 left-3 flex items-center gap-1.5 z-10">
        {isMuted && (
          <div className="w-5 h-5 rounded-full bg-red-500/80 flex items-center justify-center">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
        )}
        <span className="text-white text-xs font-medium px-2 py-0.5 rounded bg-black/40 backdrop-blur-sm">
          {displayName}
          {isHost && (
            <span className="ml-1 text-[10px] text-yellow-400">(Host)</span>
          )}
          {isLocal && (
            <span className="ml-1 text-[10px] text-[#aaa]">(You)</span>
          )}
        </span>
      </div>
    </div>
  );
}
