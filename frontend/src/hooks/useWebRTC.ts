/**
 * useWebRTC.ts — Core WebRTC mesh conferencing hook.
 *
 * Manages:
 *  - Local MediaStream from getUserMedia / getDisplayMedia
 *  - Map of RTCPeerConnection objects (one per remote peer socket ID)
 *  - Map of remote MediaStream objects keyed by socket ID
 *  - All Socket.IO signaling events
 *  - Media controls: mute, video, screen share
 *  - Cleanup on unmount
 *
 * STUN config: Google public STUN servers (works on localhost without TURN).
 * TURN: Add credentials to backend/.env and extend ICE_SERVERS for production.
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket, disconnectSocket } from "./useSocket";
import type { ParticipantInfo } from "./useSocket";

// ---------------------------------------------------------------------------
// ICE server config
// ---------------------------------------------------------------------------

/**
 * STUN-only config — works for localhost testing.
 * For production (NAT traversal), add TURN servers:
 *
 * { urls: "turn:your.turn.server:3478", username: "...", credential: "..." }
 *
 * Recommended providers: Twilio Network Traversal Service, Xirsys, or
 * self-hosted Coturn (https://github.com/coturn/coturn).
 */
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RemotePeer {
  socketId: string;
  displayName: string;
  isHost: boolean;
  participantId: number;
  stream: MediaStream | null;
  isMuted: boolean;
  videoOn: boolean;
  isScreenSharing: boolean;
  isConnecting: boolean; // true while PC is in connecting/new state
}

export interface UseWebRTCReturn {
  /** Local camera/screen stream */
  localStream: MediaStream | null;
  /** Whether local audio track is muted */
  isMuted: boolean;
  /** Whether local video track is on */
  isVideoOn: boolean;
  /** Whether screen share is active */
  isScreenSharing: boolean;
  /** Map of remote peers keyed by socket ID */
  remotePeers: Map<string, RemotePeer>;
  /** Set to a string if getUserMedia was denied */
  permissionError: string | null;
  /** Toggle local mic */
  toggleMute: () => void;
  /** Toggle local camera */
  toggleVideo: () => void;
  /** Start screen share */
  startScreenShare: () => Promise<void>;
  /** Stop screen share and restore camera */
  stopScreenShare: () => void;
  /** Call before navigating away */
  cleanup: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWebRTC(
  meetingCode: string,
  displayName: string,
  isHost: boolean,
  participantId: number
): UseWebRTCReturn {
  const socketRef = useRef(getSocket());

  // Local media
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null); // saved camera track for restoring after screen share
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Remote peers
  const [remotePeers, setRemotePeers] = useState<Map<string, RemotePeer>>(new Map());
  const remotePeersRef = useRef<Map<string, RemotePeer>>(new Map());

  // RTCPeerConnection map: socket_id -> RTCPeerConnection
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Pending ICE candidates received before remote description is set
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const updateRemotePeer = useCallback(
    (socketId: string, updates: Partial<RemotePeer>) => {
      setRemotePeers((prev) => {
        const next = new Map(prev);
        const existing = next.get(socketId);
        if (existing) {
          next.set(socketId, { ...existing, ...updates });
        }
        return next;
      });
      // Keep ref in sync for use inside event handlers
      const existing = remotePeersRef.current.get(socketId);
      if (existing) {
        remotePeersRef.current.set(socketId, { ...existing, ...updates });
      }
    },
    []
  );

  const addRemotePeer = useCallback((info: ParticipantInfo) => {
    const peer: RemotePeer = {
      socketId: info.socket_id,
      displayName: info.display_name,
      isHost: info.is_host,
      participantId: info.participant_id,
      stream: null,
      isMuted: info.is_muted,
      videoOn: info.video_on,
      isScreenSharing: info.is_screen_sharing,
      isConnecting: true,
    };
    setRemotePeers((prev) => new Map(prev).set(info.socket_id, peer));
    remotePeersRef.current.set(info.socket_id, peer);
  }, []);

  const removeRemotePeer = useCallback((socketId: string) => {
    setRemotePeers((prev) => {
      const next = new Map(prev);
      next.delete(socketId);
      return next;
    });
    remotePeersRef.current.delete(socketId);
  }, []);

  // ---------------------------------------------------------------------------
  // Peer Connection factory
  // ---------------------------------------------------------------------------

  const createPeerConnection = useCallback(
    (remoteSocketId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      // Add local tracks to the PC
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Receive remote tracks
      const remoteStream = new MediaStream();
      pc.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });
        updateRemotePeer(remoteSocketId, {
          stream: remoteStream,
          isConnecting: false,
        });
      };

      // ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit("ice_candidate", {
            target_sid: remoteSocketId,
            candidate: event.candidate.toJSON(),
            meeting_code: meetingCode,
          });
        }
      };

      // Connection state monitoring
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === "connected") {
          updateRemotePeer(remoteSocketId, { isConnecting: false });
        } else if (state === "failed" || state === "disconnected") {
          updateRemotePeer(remoteSocketId, { isConnecting: true, stream: null });
        }
      };

      peerConnectionsRef.current.set(remoteSocketId, pc);
      return pc;
    },
    [meetingCode, updateRemotePeer]
  );

  // ---------------------------------------------------------------------------
  // Flush pending ICE candidates
  // ---------------------------------------------------------------------------

  const flushPendingCandidates = useCallback(
    async (remoteSocketId: string) => {
      const pc = peerConnectionsRef.current.get(remoteSocketId);
      const pending = pendingCandidatesRef.current.get(remoteSocketId);
      if (!pc || !pending) return;

      for (const candidate of pending) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn("[WebRTC] Failed to add buffered ICE candidate:", err);
        }
      }
      pendingCandidatesRef.current.delete(remoteSocketId);
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Initialise local media
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let mounted = true;

    async function initMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        cameraTrackRef.current = stream.getVideoTracks()[0] ?? null;
        setLocalStream(stream);
        setIsVideoOn(true);
        setIsMuted(false);
      } catch (err) {
        if (!mounted) return;
        const error = err as DOMException;
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          setPermissionError("Camera and microphone permission denied. Please allow access and reload.");
        } else if (error.name === "NotFoundError") {
          setPermissionError("No camera or microphone found on this device.");
        } else {
          setPermissionError(`Media error: ${error.message}`);
        }
        console.error("[WebRTC] getUserMedia failed:", err);
      }
    }

    initMedia();
    return () => {
      mounted = false;
    };
  }, []); // runs once on mount

  // ---------------------------------------------------------------------------
  // Socket.IO signaling
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // Wait for local stream before joining (so we can add tracks to PCs)
    if (!localStream) return;

    const socket = socketRef.current;

    // Join the signaling room
    socket.emit("join_room", {
      meeting_code: meetingCode,
      display_name: displayName,
      is_host: isHost,
      participant_id: participantId,
    });

    // ------------------------------------------------------------------
    // existing-participants: sent to newcomer with list of current peers
    // ------------------------------------------------------------------
    const onExistingParticipants = async (data: { participants: ParticipantInfo[] }) => {
      for (const participant of data.participants) {
        if (participant.socket_id === socket.id) continue;

        addRemotePeer(participant);
        const pc = createPeerConnection(participant.socket_id);

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("offer", {
            target_sid: participant.socket_id,
            sdp: offer,
            meeting_code: meetingCode,
          });
        } catch (err) {
          console.error("[WebRTC] Failed to create offer:", err);
        }
      }
    };

    // ------------------------------------------------------------------
    // user-joined: a new peer entered; we create PC and they will offer
    // ------------------------------------------------------------------
    const onUserJoined = (data: ParticipantInfo) => {
      if (data.socket_id === socket.id) return;
      addRemotePeer(data);
      // The newcomer initiates offers; we just prepare the PC here
      createPeerConnection(data.socket_id);
    };

    // ------------------------------------------------------------------
    // offer: create PC (if needed), set remote desc, send answer
    // ------------------------------------------------------------------
    const onOffer = async (data: { sdp: RTCSessionDescriptionInit; from_sid: string }) => {
      const { sdp, from_sid } = data;

      let pc = peerConnectionsRef.current.get(from_sid);
      if (!pc) {
        // Peer may have joined just as we were setting up
        pc = createPeerConnection(from_sid);
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await flushPendingCandidates(from_sid);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", {
          target_sid: from_sid,
          sdp: answer,
          meeting_code: meetingCode,
        });
      } catch (err) {
        console.error("[WebRTC] Failed to handle offer:", err);
      }
    };

    // ------------------------------------------------------------------
    // answer: set remote description on the PC we offered to
    // ------------------------------------------------------------------
    const onAnswer = async (data: { sdp: RTCSessionDescriptionInit; from_sid: string }) => {
      const { sdp, from_sid } = data;
      const pc = peerConnectionsRef.current.get(from_sid);
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await flushPendingCandidates(from_sid);
      } catch (err) {
        console.error("[WebRTC] Failed to handle answer:", err);
      }
    };

    // ------------------------------------------------------------------
    // ice-candidate: add to the correct PC (buffer if not ready)
    // ------------------------------------------------------------------
    const onIceCandidate = async (data: { candidate: RTCIceCandidateInit; from_sid: string }) => {
      const { candidate, from_sid } = data;
      const pc = peerConnectionsRef.current.get(from_sid);

      if (!pc || !pc.remoteDescription) {
        // Buffer until remote description is set
        const pending = pendingCandidatesRef.current.get(from_sid) ?? [];
        pending.push(candidate);
        pendingCandidatesRef.current.set(from_sid, pending);
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("[WebRTC] Failed to add ICE candidate:", err);
      }
    };

    // ------------------------------------------------------------------
    // user-left: clean up PC and remote stream
    // ------------------------------------------------------------------
    const onUserLeft = (data: { socket_id: string; display_name: string }) => {
      const { socket_id } = data;
      const pc = peerConnectionsRef.current.get(socket_id);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(socket_id);
      }
      pendingCandidatesRef.current.delete(socket_id);
      removeRemotePeer(socket_id);
    };

    // ------------------------------------------------------------------
    // media-state-changed: update remote peer UI state
    // ------------------------------------------------------------------
    const onMediaStateChanged = (data: {
      socket_id: string;
      is_muted: boolean;
      video_on: boolean;
    }) => {
      updateRemotePeer(data.socket_id, {
        isMuted: data.is_muted,
        videoOn: data.video_on,
      });
    };

    // ------------------------------------------------------------------
    // screen-share-state: update remote peer screen share flag
    // ------------------------------------------------------------------
    const onScreenShareState = (data: { socket_id: string; is_sharing: boolean }) => {
      updateRemotePeer(data.socket_id, { isScreenSharing: data.is_sharing });
    };

    // ------------------------------------------------------------------
    // force-leave: host removed this user
    // ------------------------------------------------------------------
    const onForceLeave = () => {
      // Redirect to home — cleanup is triggered by the page's beforeUnload
      window.location.href = "/";
    };

    socket.on("existing-participants", onExistingParticipants);
    socket.on("user-joined", onUserJoined);
    socket.on("offer", onOffer);
    socket.on("answer", onAnswer);
    socket.on("ice-candidate", onIceCandidate);
    socket.on("user-left", onUserLeft);
    socket.on("media-state-changed", onMediaStateChanged);
    socket.on("screen-share-state", onScreenShareState);
    socket.on("force-leave", onForceLeave);

    return () => {
      socket.off("existing-participants", onExistingParticipants);
      socket.off("user-joined", onUserJoined);
      socket.off("offer", onOffer);
      socket.off("answer", onAnswer);
      socket.off("ice-candidate", onIceCandidate);
      socket.off("user-left", onUserLeft);
      socket.off("media-state-changed", onMediaStateChanged);
      socket.off("screen-share-state", onScreenShareState);
      socket.off("force-leave", onForceLeave);
    };
  }, [
    localStream,
    meetingCode,
    displayName,
    isHost,
    participantId,
    addRemotePeer,
    removeRemotePeer,
    createPeerConnection,
    flushPendingCandidates,
    updateRemotePeer,
  ]);

  // ---------------------------------------------------------------------------
  // Media controls
  // ---------------------------------------------------------------------------

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    const newMuted = !isMuted;
    audioTrack.enabled = !newMuted; // enabled=false means muted
    setIsMuted(newMuted);

    socketRef.current.emit("media_state_changed", {
      meeting_code: meetingCode,
      is_muted: newMuted,
      video_on: isVideoOn,
    });
  }, [isMuted, isVideoOn, meetingCode]);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    const newVideoOn = !isVideoOn;
    videoTrack.enabled = newVideoOn;
    setIsVideoOn(newVideoOn);

    // When turning video back ON, force a fresh stream reference so the
    // <video> element re-attaches srcObject and starts rendering frames again.
    // Simply flipping track.enabled is not enough — the video element may
    // stay black because it cached the "no frames" state.
    if (newVideoOn) {
      const refreshed = new MediaStream(stream.getTracks());
      localStreamRef.current = refreshed;
      setLocalStream(refreshed);
    }

    socketRef.current.emit("media_state_changed", {
      meeting_code: meetingCode,
      is_muted: isMuted,
      video_on: newVideoOn,
    });
  }, [isVideoOn, isMuted, meetingCode]);

  const startScreenShare = useCallback(async () => {
    if (isScreenSharing) return;

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) return;

      // Replace video track in all peer connections
      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      });

      // Save camera track for restoration later
      const localVideo = localStreamRef.current?.getVideoTracks()[0];
      if (localVideo) cameraTrackRef.current = localVideo;

      // Swap the local stream's video track for preview
      if (localStreamRef.current && localVideo) {
        localStreamRef.current.removeTrack(localVideo);
        localStreamRef.current.addTrack(screenTrack);
      }

      setIsScreenSharing(true);

      // When the user stops screen share via browser UI
      screenTrack.onended = () => {
        stopScreenShare();
      };

      socketRef.current.emit("screen_share_state", {
        meeting_code: meetingCode,
        is_sharing: true,
      });
    } catch (err) {
      if ((err as DOMException).name !== "NotAllowedError") {
        console.error("[WebRTC] getDisplayMedia failed:", err);
      }
    }
  }, [isScreenSharing, meetingCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopScreenShare = useCallback(() => {
    const cameraTrack = cameraTrackRef.current;
    if (!cameraTrack) return;

    // Restore camera track in all peer connections
    peerConnectionsRef.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) {
        sender.replaceTrack(cameraTrack);
      }
    });

    // Restore local stream
    if (localStreamRef.current) {
      const screenTrack = localStreamRef.current.getVideoTracks()[0];
      if (screenTrack) {
        screenTrack.stop();
        localStreamRef.current.removeTrack(screenTrack);
      }
      cameraTrack.enabled = isVideoOn;
      localStreamRef.current.addTrack(cameraTrack);
    }

    setIsScreenSharing(false);

    socketRef.current.emit("screen_share_state", {
      meeting_code: meetingCode,
      is_sharing: false,
    });
  }, [isVideoOn, meetingCode]);

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  const cleanup = useCallback(() => {
    // Stop all local tracks
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    // Disconnect socket
    disconnectSocket();

    setRemotePeers(new Map());
    remotePeersRef.current.clear();
  }, []);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
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
  };
}
