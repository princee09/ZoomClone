"""Pydantic v2 schemas for request/response validation."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


# ── User ──────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    avatar_initials: Optional[str] = None
    created_at: datetime


# ── Meeting ───────────────────────────────────────────────────────────────────

class InstantMeetingRequest(BaseModel):
    title: Optional[str] = None


class ScheduledMeetingRequest(BaseModel):
    title: str
    description: Optional[str] = None
    scheduled_at: datetime
    duration_minutes: int


class MeetingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_code: str
    title: str
    description: Optional[str] = None
    host_id: int
    meeting_type: str
    status: str
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    invite_link: str
    created_at: datetime
    ended_at: Optional[datetime] = None


# ── Participant ───────────────────────────────────────────────────────────────

class JoinMeetingRequest(BaseModel):
    display_name: str


class ParticipantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_id: int
    display_name: str
    is_host: bool
    is_muted: bool
    video_on: bool
    joined_at: datetime
    left_at: Optional[datetime] = None


class JoinMeetingResponse(BaseModel):
    participant_id: int
    meeting: MeetingOut


class UpdateParticipantRequest(BaseModel):
    is_muted: bool
