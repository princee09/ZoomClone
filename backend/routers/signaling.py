"""Socket.IO signaling server for WebRTC mesh conferencing.

In-memory room state is ephemeral — SQLite remains the source of truth
for meeting metadata (title, participants list, status).

Room state structure:
    rooms: Dict[meeting_code, Dict[socket_id, ParticipantInfo]]
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# In-memory room state
# ---------------------------------------------------------------------------

# { meeting_code: { socket_id: participant_info } }
rooms: dict[str, dict[str, dict[str, Any]]] = {}


def register_handlers(sio: Any) -> None:
    """Attach all Socket.IO event handlers to the server instance."""

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    @sio.event
    async def connect(sid: str, environ: dict[str, Any]) -> None:
        logger.info("Socket connected: %s", sid)

    @sio.event
    async def disconnect(sid: str) -> None:
        logger.info("Socket disconnected: %s", sid)
        # Remove from all rooms and notify remaining peers
        for meeting_code, participants in list(rooms.items()):
            if sid in participants:
                info = participants.pop(sid)
                display_name = info.get("display_name", "Unknown")
                logger.info(
                    "Removing %s (%s) from room %s", display_name, sid, meeting_code
                )
                # Notify remaining peers
                await sio.emit(
                    "user-left",
                    {"socket_id": sid, "display_name": display_name},
                    room=meeting_code,
                    skip_sid=sid,
                )
                # Clean up empty rooms
                if not participants:
                    del rooms[meeting_code]

    # ------------------------------------------------------------------
    # Room management
    # ------------------------------------------------------------------

    @sio.event
    async def join_room(
        sid: str,
        data: dict[str, Any],
    ) -> None:
        """Join a meeting signaling room.

        data = {
            meeting_code: str,
            display_name: str,
            is_host: bool,
            participant_id: int,  # SQLite participant row id
        }
        """
        meeting_code: str = data["meeting_code"]
        display_name: str = data["display_name"]
        is_host: bool = data.get("is_host", False)
        participant_id: int = data.get("participant_id", -1)

        # Join the Socket.IO room
        await sio.enter_room(sid, meeting_code)

        # Initialise room dict
        if meeting_code not in rooms:
            rooms[meeting_code] = {}

        participant_info = {
            "socket_id": sid,
            "display_name": display_name,
            "is_host": is_host,
            "participant_id": participant_id,
            "is_muted": False,
            "video_on": True,
            "is_screen_sharing": False,
        }

        # Build existing participants list BEFORE adding self
        existing_participants = [
            info for info in rooms[meeting_code].values()
        ]

        # Add to room
        rooms[meeting_code][sid] = participant_info

        # Send existing participants to newcomer so they can initiate offers
        await sio.emit(
            "existing-participants",
            {"participants": existing_participants},
            to=sid,
        )

        # Notify others about the new peer
        await sio.emit(
            "user-joined",
            participant_info,
            room=meeting_code,
            skip_sid=sid,
        )

        logger.info(
            "%s (%s) joined room %s. Room size: %d",
            display_name,
            sid,
            meeting_code,
            len(rooms[meeting_code]),
        )

    # ------------------------------------------------------------------
    # WebRTC signaling relay — forward to target_sid only
    # ------------------------------------------------------------------

    @sio.event
    async def offer(sid: str, data: dict[str, Any]) -> None:
        """Relay an SDP offer to a specific peer.

        data = { target_sid, sdp, meeting_code }
        """
        target_sid: str = data["target_sid"]
        await sio.emit(
            "offer",
            {
                "sdp": data["sdp"],
                "from_sid": sid,
                "meeting_code": data.get("meeting_code"),
            },
            to=target_sid,
        )

    @sio.event
    async def answer(sid: str, data: dict[str, Any]) -> None:
        """Relay an SDP answer to a specific peer.

        data = { target_sid, sdp, meeting_code }
        """
        target_sid: str = data["target_sid"]
        await sio.emit(
            "answer",
            {
                "sdp": data["sdp"],
                "from_sid": sid,
                "meeting_code": data.get("meeting_code"),
            },
            to=target_sid,
        )

    @sio.event
    async def ice_candidate(sid: str, data: dict[str, Any]) -> None:
        """Relay an ICE candidate to a specific peer.

        data = { target_sid, candidate, meeting_code }
        """
        target_sid: str = data["target_sid"]
        await sio.emit(
            "ice-candidate",
            {
                "candidate": data["candidate"],
                "from_sid": sid,
            },
            to=target_sid,
        )

    # ------------------------------------------------------------------
    # Media state broadcast
    # ------------------------------------------------------------------

    @sio.event
    async def media_state_changed(sid: str, data: dict[str, Any]) -> None:
        """Broadcast mute/video state change to all peers in the room.

        data = { meeting_code, is_muted, video_on }
        """
        meeting_code: str = data["meeting_code"]

        # Update in-memory state
        if meeting_code in rooms and sid in rooms[meeting_code]:
            rooms[meeting_code][sid]["is_muted"] = data.get("is_muted", False)
            rooms[meeting_code][sid]["video_on"] = data.get("video_on", True)

        await sio.emit(
            "media-state-changed",
            {
                "socket_id": sid,
                "is_muted": data.get("is_muted", False),
                "video_on": data.get("video_on", True),
            },
            room=meeting_code,
            skip_sid=sid,
        )

    @sio.event
    async def screen_share_state(sid: str, data: dict[str, Any]) -> None:
        """Broadcast screen sharing state to all peers in the room.

        data = { meeting_code, is_sharing }
        """
        meeting_code: str = data["meeting_code"]

        if meeting_code in rooms and sid in rooms[meeting_code]:
            rooms[meeting_code][sid]["is_screen_sharing"] = data.get("is_sharing", False)

        await sio.emit(
            "screen-share-state",
            {
                "socket_id": sid,
                "is_sharing": data.get("is_sharing", False),
            },
            room=meeting_code,
            skip_sid=sid,
        )

    # ------------------------------------------------------------------
    # Host controls
    # ------------------------------------------------------------------

    @sio.event
    async def remove_participant(sid: str, data: dict[str, Any]) -> None:
        """Host removes a participant from the room.

        data = { meeting_code, target_sid }
        The REST DELETE is called separately by the frontend.
        This event forces the target to disconnect from the WebRTC session.
        """
        meeting_code: str = data["meeting_code"]
        target_sid: str = data["target_sid"]

        # Verify the requester is host
        if (
            meeting_code in rooms
            and sid in rooms[meeting_code]
            and rooms[meeting_code][sid].get("is_host")
        ):
            # Tell the target to leave
            await sio.emit("force-leave", {"reason": "removed_by_host"}, to=target_sid)
            logger.info("Host %s removed %s from room %s", sid, target_sid, meeting_code)
