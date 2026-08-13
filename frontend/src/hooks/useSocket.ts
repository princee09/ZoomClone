/**
 * useSocket.ts — Singleton Socket.IO client for WebRTC signaling.
 *
 * Design choice: module-level singleton (not React Context) to avoid
 * double-connect issues with React StrictMode and ensure a single
 * stable socket identity across hook re-renders.
 *
 * The socket connects lazily when `getSocket()` is first called inside
 * the meeting room. It disconnects via `disconnectSocket()` on leave.
 */

import { io, Socket } from "socket.io-client";

// ---------------------------------------------------------------------------
// Types for our signaling protocol
// ---------------------------------------------------------------------------

export interface ParticipantInfo {
  socket_id: string;
  display_name: string;
  is_host: boolean;
  participant_id: number;
  is_muted: boolean;
  video_on: boolean;
  is_screen_sharing: boolean;
}

export interface ServerToClientEvents {
  "existing-participants": (data: { participants: ParticipantInfo[] }) => void;
  "user-joined": (data: ParticipantInfo) => void;
  "user-left": (data: { socket_id: string; display_name: string }) => void;
  offer: (data: { sdp: RTCSessionDescriptionInit; from_sid: string }) => void;
  answer: (data: { sdp: RTCSessionDescriptionInit; from_sid: string }) => void;
  "ice-candidate": (data: { candidate: RTCIceCandidateInit; from_sid: string }) => void;
  "media-state-changed": (data: {
    socket_id: string;
    is_muted: boolean;
    video_on: boolean;
  }) => void;
  "screen-share-state": (data: { socket_id: string; is_sharing: boolean }) => void;
  "force-leave": (data: { reason: string }) => void;
}

export interface ClientToServerEvents {
  join_room: (data: {
    meeting_code: string;
    display_name: string;
    is_host: boolean;
    participant_id: number;
  }) => void;
  offer: (data: { target_sid: string; sdp: RTCSessionDescriptionInit; meeting_code: string }) => void;
  answer: (data: { target_sid: string; sdp: RTCSessionDescriptionInit; meeting_code: string }) => void;
  ice_candidate: (data: { target_sid: string; candidate: RTCIceCandidateInit; meeting_code: string }) => void;
  media_state_changed: (data: {
    meeting_code: string;
    is_muted: boolean;
    video_on: boolean;
  }) => void;
  screen_share_state: (data: { meeting_code: string; is_sharing: boolean }) => void;
  remove_participant: (data: { meeting_code: string; target_sid: string }) => void;
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let socketInstance: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

/**
 * Returns the singleton Socket.IO client, creating it on first call.
 * Connects immediately if not already connected.
 */
export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socketInstance) {
    const url =
      process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:8000";

    socketInstance = io(url, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on("connect", () => {
      console.log("[Socket] Connected:", socketInstance?.id);
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
    });

    socketInstance.on("connect_error", (err) => {
      console.error("[Socket] Connection error:", err.message);
    });
  }

  if (!socketInstance.connected) {
    socketInstance.connect();
  }

  return socketInstance;
}

/**
 * Gracefully disconnect and destroy the singleton socket.
 * Call this when the user leaves the meeting room.
 */
export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
