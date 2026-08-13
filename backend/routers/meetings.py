"""Meetings API router — all meeting CRUD endpoints."""

import random
import string
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from database import get_db
from models import Meeting, Meeting_Participant, User
from schemas import (
    InstantMeetingRequest,
    JoinMeetingRequest,
    JoinMeetingResponse,
    MeetingOut,
    ParticipantOut,
    ScheduledMeetingRequest,
)

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


def _generate_meeting_code(db: Session) -> str:
    """Generate a unique random 10-digit numeric meeting code."""
    while True:
        code = "".join(random.choices(string.digits, k=10))
        existing = db.query(Meeting).filter(Meeting.meeting_code == code).first()
        if not existing:
            return code


def _get_default_user(db: Session) -> User:
    """Retrieve the single seeded default user."""
    user = db.query(User).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No default user found. Run the seed script first.",
        )
    return user


# ── Static path endpoints MUST come before dynamic /{meeting_code} ───────────


@router.post("/instant", response_model=MeetingOut, status_code=status.HTTP_201_CREATED)
def create_instant_meeting(
    body: InstantMeetingRequest = InstantMeetingRequest(),
    db: Session = Depends(get_db),
):
    """Create and start an instant meeting for the default host user."""
    user = _get_default_user(db)
    code = _generate_meeting_code(db)
    title = body.title if body.title else f"{user.name}'s Meeting"

    meeting = Meeting(
        meeting_code=code,
        title=title,
        host_id=user.id,
        meeting_type="instant",
        status="live",
        invite_link=f"/join/{code}",
        created_at=datetime.utcnow(),
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    # Auto-add host as participant
    host_participant = Meeting_Participant(
        meeting_id=meeting.id,
        display_name=user.name,
        is_host=True,
        is_muted=False,
        video_on=True,
        joined_at=datetime.utcnow(),
    )
    db.add(host_participant)
    db.commit()

    return meeting


@router.post("/scheduled", response_model=MeetingOut, status_code=status.HTTP_201_CREATED)
def create_scheduled_meeting(
    body: ScheduledMeetingRequest,
    db: Session = Depends(get_db),
):
    """Create a scheduled meeting."""
    user = _get_default_user(db)
    code = _generate_meeting_code(db)

    meeting = Meeting(
        meeting_code=code,
        title=body.title,
        description=body.description,
        host_id=user.id,
        meeting_type="scheduled",
        status="upcoming",
        scheduled_at=body.scheduled_at,
        duration_minutes=body.duration_minutes,
        invite_link=f"/join/{code}",
        created_at=datetime.utcnow(),
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


@router.get("/upcoming", response_model=List[MeetingOut])
def list_upcoming_meetings(db: Session = Depends(get_db)):
    """List meetings with status = 'upcoming', sorted by scheduled_at ascending."""
    meetings = (
        db.query(Meeting)
        .filter(Meeting.status == "upcoming")
        .order_by(asc(Meeting.scheduled_at))
        .all()
    )
    return meetings


@router.get("/recent", response_model=List[MeetingOut])
def list_recent_meetings(db: Session = Depends(get_db)):
    """List ended meetings or past instant meetings, sorted descending."""
    meetings = (
        db.query(Meeting)
        .filter(Meeting.status == "ended")
        .order_by(desc(Meeting.created_at))
        .all()
    )
    return meetings


# ── Dynamic path endpoints ───────────────────────────────────────────────────


@router.get("/{meeting_code}", response_model=MeetingOut)
def get_meeting(meeting_code: str, db: Session = Depends(get_db)):
    """Fetch a meeting by its code — used for Join validation and Meeting Room load."""
    meeting = db.query(Meeting).filter(Meeting.meeting_code == meeting_code).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found.",
        )
    return meeting


@router.post("/{meeting_code}/join", response_model=JoinMeetingResponse)
def join_meeting(
    meeting_code: str,
    body: JoinMeetingRequest,
    db: Session = Depends(get_db),
):
    """Register a participant joining a meeting."""
    meeting = db.query(Meeting).filter(Meeting.meeting_code == meeting_code).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid meeting ID or this meeting has ended.",
        )
    if meeting.status == "ended":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid meeting ID or this meeting has ended.",
        )

    # If meeting is upcoming (scheduled), transition to live
    if meeting.status == "upcoming":
        meeting.status = "live"

    participant = Meeting_Participant(
        meeting_id=meeting.id,
        display_name=body.display_name,
        is_host=False,
        is_muted=False,
        video_on=False,
        joined_at=datetime.utcnow(),
    )
    db.add(participant)
    db.commit()
    db.refresh(participant)
    db.refresh(meeting)

    return JoinMeetingResponse(participant_id=participant.id, meeting=MeetingOut.model_validate(meeting))


@router.post("/{meeting_code}/end", response_model=MeetingOut)
def end_meeting(meeting_code: str, db: Session = Depends(get_db)):
    """Mark a meeting as ended."""
    meeting = db.query(Meeting).filter(Meeting.meeting_code == meeting_code).first()
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found.")

    meeting.status = "ended"
    meeting.ended_at = datetime.utcnow()
    db.commit()
    db.refresh(meeting)
    return meeting


@router.get("/{meeting_code}/participants", response_model=List[ParticipantOut])
def list_participants(meeting_code: str, db: Session = Depends(get_db)):
    """List participants of a meeting."""
    meeting = db.query(Meeting).filter(Meeting.meeting_code == meeting_code).first()
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found.")
    participants = (
        db.query(Meeting_Participant)
        .filter(Meeting_Participant.meeting_id == meeting.id, Meeting_Participant.left_at.is_(None))
        .all()
    )
    return participants
