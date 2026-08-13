"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import VideoTile from "@/components/meeting/VideoTile";
import ControlBar from "@/components/meeting/ControlBar";
import ParticipantsPanel from "@/components/meeting/ParticipantsPanel";
import { getMeeting, getParticipants, endMeeting, updateParticipant, removeParticipant } from "@/lib/api";
import type { Meeting, Participant } from "@/lib/api";
import { useWebRTC } from "@/hooks/useWebRTC";
import { getSocket } from "@/hooks/useSocket";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMeetingCode(code: string): string {
  if (code.length === 10) {
    return `${code.slice(0, 3)} ${code.slice(3, 6)} ${code.slice(6)}`;
  }
  return code;
}

// ---------------------------------------------------------------------------
// Inner component — needs access to searchParams inside Suspense boundary
// ---------------------------------------------------------------------------

function MeetingRoomInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const meetingCode = params.meetingCode as string;
  const displayName = searchParams.get("name") || "Guest";

  // REST data
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

  // Derive host & participant_id from REST data
  const localParticipant = participants.find((p) => p.is_host);
  const isHost = localParticipant?.is_host ?? false;
  const participantId = localParticipant?.id ?? -1;

  // WebRTC hook
  const {
    localStream,
    isMuted,
    isVideoOn,
    isScreenSharing,
    remotePeers,
    permissionError,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    cleanup,
  } = useWebRTC(meetingCode, displayName, isHost, participantId);

  // ---------------------------------------------------------------------------
  // Fetch meeting + participants from REST
  // ---------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    try {
      const [meetingData, participantsData] = await Promise.all([
        getMeeting(meetingCode),
        getParticipants(meetingCode),
      ]);
      setMeeting(meetingData);
      setParticipants(participantsData);
    } catch (err) {
      console.error("Failed to load meeting:", err);
    } finally {
      setLoading(false);
    }
  }, [meetingCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleLeave = useCallback(async () => {
    cleanup();
    try {
      if (isHost) await endMeeting(meetingCode);
    } catch {
      // meeting may already be ended
    }
    router.push("/");
  }, [cleanup, isHost, meetingCode, router]);

  const handleMuteToggle = useCallback(
    async (participantDbId: number, muted: boolean) => {
      try {
        await updateParticipant(participantDbId, { is_muted: muted });
        setParticipants((prev) =>
          prev.map((p) => (p.id === participantDbId ? { ...p, is_muted: muted } : p))
        );
      } catch (err) {
        console.error("Failed to update participant:", err);
      }
    },
    []
  );

  const handleRemove = useCallback(
    async (participantDbId: number) => {
      try {
        await removeParticipant(participantDbId);
        setParticipants((prev) => prev.filter((p) => p.id !== participantDbId));
      } catch (err) {
        console.error("Failed to remove participant:", err);
      }
    },
    []
  );

  const handleCopyInvite = useCallback(() => {
    const url = `${window.location.origin}/join/${meetingCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [meetingCode]);

  const handleToggleScreenShare = useCallback(() => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  // ---------------------------------------------------------------------------
  // Build remoteMediaStates map for ParticipantsPanel
  // ---------------------------------------------------------------------------
  const remoteMediaStates = new Map(
    Array.from(remotePeers.entries()).map(([sid, peer]) => [
      sid,
      {
        isMuted: peer.isMuted,
        videoOn: peer.videoOn,
        isScreenSharing: peer.isScreenSharing,
        isConnecting: peer.isConnecting,
      },
    ])
  );

  // ---------------------------------------------------------------------------
  // Total participants = local + remote
  // ---------------------------------------------------------------------------
  const totalParticipantCount = 1 + remotePeers.size;

  // ---------------------------------------------------------------------------
  // Video grid layout
  // ---------------------------------------------------------------------------

  // Who is screen sharing? Pick the first screen sharer (local or remote).
  const screenSharerId = isScreenSharing
    ? "local"
    : Array.from(remotePeers.values()).find((p) => p.isScreenSharing)?.socketId;

  const isAnyoneSharing = !!screenSharerId;

  // Grid class for the thumbnail row
  const thumbnailGridCols = totalParticipantCount <= 4 ? "grid-cols-2" : "grid-cols-3";

  // ---------------------------------------------------------------------------
  // Loading / Error states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#1C1C1E" }}>
        <div
          className="w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin"
          style={{ borderColor: "var(--zoom-blue) transparent transparent transparent" }}
        />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: "#1C1C1E" }}>
        <p className="text-white text-lg">Meeting not found</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-2 text-sm font-semibold text-white rounded-lg"
          style={{ backgroundColor: "var(--zoom-blue)" }}
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (permissionError) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6 px-8 text-center"
        style={{ backgroundColor: "#1C1C1E" }}
      >
        <div className="w-16 h-16 rounded-full bg-[#E02828]/20 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E02828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
        <div>
          <h2 className="text-white font-semibold text-lg mb-2">Camera/Mic Permission Required</h2>
          <p className="text-[#999] text-sm max-w-md">{permissionError}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 text-sm font-semibold text-white rounded-lg"
            style={{ backgroundColor: "var(--zoom-blue)" }}
          >
            Try Again
          </button>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 text-sm font-semibold text-white rounded-lg bg-[#3A3A3E] hover:bg-[#4A4A4E]"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#1C1C1E" }}>
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 py-3 z-30 shrink-0">
        <div>
          <h2 className="text-white text-sm font-semibold">{meeting.title}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[#999] text-xs font-mono">
              ID: {formatMeetingCode(meeting.meeting_code)}
            </span>
            <button
              onClick={handleCopyInvite}
              className="flex items-center gap-1 text-[10px] text-[var(--zoom-blue)] hover:text-[var(--zoom-blue-hover)] transition-colors"
              title="Copy invite link"
            >
              {copied ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Video area ── */}
      <div
        className={`flex-1 flex flex-col items-center justify-center px-4 pb-20 transition-all duration-300 ${
          showParticipants ? "pr-[336px]" : ""
        }`}
      >
        {isAnyoneSharing ? (
          /* ── Screen-share layout: large featured tile + row of thumbnails ── */
          <div className="w-full max-w-[1400px] flex flex-col gap-3">
            {/* Featured (sharer) */}
            <div className="w-full">
              {screenSharerId === "local" ? (
                <VideoTile
                  displayName={displayName}
                  isMuted={isMuted}
                  videoOn={isVideoOn}
                  isHost={isHost}
                  stream={localStream}
                  isLocal
                  size="featured"
                  isScreenSharing
                />
              ) : (
                (() => {
                  const sharer = remotePeers.get(screenSharerId!);
                  return sharer ? (
                    <VideoTile
                      displayName={sharer.displayName}
                      isMuted={sharer.isMuted}
                      videoOn={sharer.videoOn}
                      isHost={sharer.isHost}
                      stream={sharer.stream}
                      size="featured"
                      isScreenSharing
                    />
                  ) : null;
                })()
              )}
            </div>

            {/* Thumbnails strip */}
            <div className={`grid ${thumbnailGridCols} gap-2 w-full`}>
              {/* Local thumb (only if not the sharer) */}
              {screenSharerId !== "local" && (
                <VideoTile
                  displayName={displayName}
                  isMuted={isMuted}
                  videoOn={isVideoOn}
                  isHost={isHost}
                  stream={localStream}
                  isLocal
                  size="normal"
                />
              )}
              {Array.from(remotePeers.values())
                .filter((p) => p.socketId !== screenSharerId)
                .map((peer) => (
                  <VideoTile
                    key={peer.socketId}
                    displayName={peer.displayName}
                    isMuted={peer.isMuted}
                    videoOn={peer.videoOn}
                    isHost={peer.isHost}
                    stream={peer.stream}
                    size="normal"
                    isConnecting={peer.isConnecting}
                    isScreenSharing={peer.isScreenSharing}
                  />
                ))}
            </div>
          </div>
        ) : (
          /* ── Normal grid layout ── */
          <div
            className={`grid gap-3 w-full mx-auto ${
              totalParticipantCount <= 1
                ? "grid-cols-1 max-w-[640px]"
                : totalParticipantCount <= 2
                  ? "grid-cols-1 md:grid-cols-2 max-w-[900px]"
                  : totalParticipantCount <= 4
                    ? "grid-cols-1 sm:grid-cols-2 max-w-[900px]"
                    : totalParticipantCount <= 6
                      ? "grid-cols-2 md:grid-cols-3 max-w-[1200px]"
                      : "grid-cols-2 md:grid-cols-4 max-w-[1400px]"
            }`}
          >
            {/* Local tile */}
            <VideoTile
              displayName={displayName}
              isMuted={isMuted}
              videoOn={isVideoOn}
              isHost={isHost}
              stream={localStream}
              isLocal
              size={totalParticipantCount <= 2 ? "large" : "normal"}
              isScreenSharing={isScreenSharing}
            />

            {/* Remote tiles */}
            {Array.from(remotePeers.values()).map((peer) => (
              <VideoTile
                key={peer.socketId}
                displayName={peer.displayName}
                isMuted={peer.isMuted}
                videoOn={peer.videoOn}
                isHost={peer.isHost}
                stream={peer.stream}
                size={totalParticipantCount <= 2 ? "large" : "normal"}
                isConnecting={peer.isConnecting}
                isScreenSharing={peer.isScreenSharing}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Control bar ── */}
      <ControlBar
        isMuted={isMuted}
        isVideoOn={isVideoOn}
        isScreenSharing={isScreenSharing}
        participantCount={totalParticipantCount}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleParticipants={() => setShowParticipants((v) => !v)}
        onToggleScreenShare={handleToggleScreenShare}
        onLeave={handleLeave}
        showParticipants={showParticipants}
      />

      {/* ── Participants panel ── */}
      <ParticipantsPanel
        participants={participants}
        remoteMediaStates={remoteMediaStates}
        localSocketId={getSocket().id}
        meetingCode={meetingCode}
        isOpen={showParticipants}
        onClose={() => setShowParticipants(false)}
        onMuteToggle={handleMuteToggle}
        onRemove={handleRemove}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page export — wrapped in Suspense for useSearchParams
// ---------------------------------------------------------------------------

export default function MeetingRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#1C1C1E" }}>
          <div
            className="w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin"
            style={{ borderColor: "var(--zoom-blue) transparent transparent transparent" }}
          />
        </div>
      }
    >
      <MeetingRoomInner />
    </Suspense>
  );
}
