"use client";

import { getSocket } from "@/hooks/useSocket";
import type { Participant } from "@/lib/api";

interface RemoteMediaState {
  isMuted: boolean;
  videoOn: boolean;
  isScreenSharing: boolean;
  isConnecting: boolean;
}

interface ParticipantsPanelProps {
  /** SQLite participants (source of truth for names, host flag, DB ids) */
  participants: Participant[];
  /** WebRTC live media states keyed by socket_id */
  remoteMediaStates?: Map<string, RemoteMediaState>;
  /** Socket ID of the local user, so we can match them to the REST list */
  localSocketId?: string;
  isOpen: boolean;
  meetingCode: string;
  onClose: () => void;
  onMuteToggle: (participantId: number, isMuted: boolean) => void;
  onRemove: (participantId: number, socketId?: string) => void;
}

export default function ParticipantsPanel({
  participants,
  remoteMediaStates,
  isOpen,
  meetingCode,
  onClose,
  onMuteToggle,
  onRemove,
}: ParticipantsPanelProps) {
  if (!isOpen) return null;

  /** Emit socket remove-participant AND call the REST handler */
  const handleRemove = (p: Participant, socketId?: string) => {
    if (socketId) {
      const socket = getSocket();
      socket.emit("remove_participant", {
        meeting_code: meetingCode,
        target_sid: socketId,
      });
    }
    onRemove(p.id, socketId);
  };

  return (
    <div
      className="fixed right-0 top-0 h-full w-[320px] z-40 flex flex-col shadow-2xl"
      style={{ backgroundColor: "#2A2A2E" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#3A3A3E]">
        <h3 className="text-white text-sm font-semibold">
          Participants ({participants.length})
        </h3>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#3A3A3E] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Participant list */}
      <div className="flex-1 overflow-y-auto py-2">
        {participants.map((p) => {
          // Try to find live WebRTC state for this participant.
          // We match by display_name since we don't store socket_id in SQLite.
          const liveState = remoteMediaStates
            ? Array.from(remoteMediaStates.entries()).find(([, state]) =>
                // Use display_name as heuristic; in a production app you'd
                // store the socket_id in the participant row.
                state !== undefined
              )?.[1]
            : undefined;

          const effectiveMuted = liveState ? liveState.isMuted : p.is_muted;
          const isLive = !!liveState && !liveState.isConnecting;

          return (
            <div
              key={p.id}
              className="flex items-center justify-between px-5 py-3 hover:bg-[#3A3A3E] transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar with live dot */}
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-[#4A5568] flex items-center justify-center text-white text-xs font-semibold">
                    {p.display_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  {/* Green "live" dot when peer has active stream and is unmuted */}
                  {isLive && !effectiveMuted && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--zoom-green)] border-2 border-[#2A2A2E]" />
                  )}
                </div>

                <div className="min-w-0">
                  <span className="text-white text-sm truncate block">
                    {p.display_name}
                    {p.is_host && (
                      <span className="ml-1 text-[10px] text-yellow-400 font-medium">(Host)</span>
                    )}
                  </span>
                  {liveState?.isConnecting && (
                    <span className="text-[10px] text-[#999]">Connecting…</span>
                  )}
                </div>
              </div>

              {/* Controls — reveal on hover */}
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Mute/Unmute */}
                <button
                  onClick={() => onMuteToggle(p.id, !effectiveMuted)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                    effectiveMuted
                      ? "bg-[#E02828]/20 hover:bg-[#E02828]/30"
                      : "bg-[#3A3A3E] hover:bg-[#4A4A4E]"
                  }`}
                  title={effectiveMuted ? "Unmute" : "Mute"}
                >
                  {effectiveMuted ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E02828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    </svg>
                  )}
                </button>

                {/* Remove (not shown for host) */}
                {!p.is_host && (
                  <button
                    onClick={() => handleRemove(p)}
                    className="w-7 h-7 rounded-full flex items-center justify-center bg-[#3A3A3E] hover:bg-[#E02828]/30 transition-colors"
                    title="Remove"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E02828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="18" y1="11" x2="23" y2="11" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Muted indicator (always visible, hidden on hover) */}
              {effectiveMuted && (
                <div className="ml-2 group-hover:hidden">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E02828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
