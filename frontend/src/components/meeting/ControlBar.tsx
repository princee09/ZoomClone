"use client";

interface ControlBarProps {
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  participantCount: number;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleParticipants: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
  showParticipants: boolean;
}

export default function ControlBar({
  isMuted,
  isVideoOn,
  isScreenSharing,
  participantCount,
  onToggleMute,
  onToggleVideo,
  onToggleParticipants,
  onToggleScreenShare,
  onLeave,
  showParticipants,
}: ControlBarProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center py-3 px-6"
      style={{ backgroundColor: "#1C1C1E" }}
    >
      <div className="flex items-center gap-2">
        {/* ── Mute ── */}
        <button
          onClick={onToggleMute}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-150 ${
            isMuted
              ? "bg-[#E02828]/20 hover:bg-[#E02828]/30"
              : "bg-[#3A3A3E] hover:bg-[#4A4A4E]"
          }`}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E02828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
          <span className={`text-[10px] font-medium ${isMuted ? "text-[#E02828]" : "text-white"}`}>
            {isMuted ? "Unmute" : "Mute"}
          </span>
        </button>

        {/* ── Video ── */}
        <button
          onClick={onToggleVideo}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-150 ${
            !isVideoOn
              ? "bg-[#E02828]/20 hover:bg-[#E02828]/30"
              : "bg-[#3A3A3E] hover:bg-[#4A4A4E]"
          }`}
          title={isVideoOn ? "Stop Video" : "Start Video"}
        >
          {!isVideoOn ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E02828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M21 7.5l-5 3.5 5 3.5V7.5z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          )}
          <span className={`text-[10px] font-medium ${!isVideoOn ? "text-[#E02828]" : "text-white"}`}>
            {isVideoOn ? "Stop Video" : "Start Video"}
          </span>
        </button>

        {/* ── Participants ── */}
        <button
          onClick={onToggleParticipants}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-150 ${
            showParticipants
              ? "bg-[var(--zoom-blue)]/20 hover:bg-[var(--zoom-blue)]/30"
              : "bg-[#3A3A3E] hover:bg-[#4A4A4E]"
          }`}
        >
          <div className="relative">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-[var(--zoom-blue)] rounded-full flex items-center justify-center">
              {participantCount}
            </span>
          </div>
          <span className="text-[10px] font-medium text-white">Participants</span>
        </button>



        {/* ── Share Screen (wired to real screen share) ── */}
        <button
          onClick={onToggleScreenShare}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-150 ${
            isScreenSharing
              ? "bg-[var(--zoom-blue)]/20 hover:bg-[var(--zoom-blue)]/30"
              : "bg-[#3A3A3E] hover:bg-[#4A4A4E]"
          }`}
          title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isScreenSharing ? "var(--zoom-blue)" : "white"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          <span className={`text-[10px] font-medium ${isScreenSharing ? "text-[var(--zoom-blue)]" : "text-white"}`}>
            {isScreenSharing ? "Stop Share" : "Share Screen"}
          </span>
        </button>

        {/* ── Record (inert) ── */}
        <button
          onClick={() => alert("Recording is not available in this demo")}
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-[#3A3A3E] hover:bg-[#4A4A4E] transition-all duration-150"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" fill="#E02828" stroke="#E02828" />
          </svg>
          <span className="text-[10px] font-medium text-white">Record</span>
        </button>

        {/* Spacer */}
        <div className="w-4" />

        {/* ── Leave ── */}
        <button
          onClick={onLeave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition-all duration-150 hover:bg-red-700 active:scale-95"
          style={{ backgroundColor: "var(--zoom-red)" }}
        >
          Leave
        </button>
      </div>
    </div>
  );
}
