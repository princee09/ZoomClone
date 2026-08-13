"""Seed script — populates the database with initial data for development.

Run: python seed.py
"""

from datetime import datetime, timedelta

from database import Base, engine, SessionLocal
from models import User, Meeting, Meeting_Participant

# Create all tables
Base.metadata.create_all(bind=engine)


def seed():
    db = SessionLocal()

    # Clear existing data for idempotent re-runs
    db.query(Meeting_Participant).delete()
    db.query(Meeting).delete()
    db.query(User).delete()
    db.commit()

    # ── 1. Default user ──────────────────────────────────────────────────────
    user = User(
        name="Klaus Schwarz",
        email="klaus@example.com",
        avatar_initials="KS",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"[OK] Seeded user: {user.name} ({user.email})")

    now = datetime.utcnow()

    # ── 2. Upcoming scheduled meetings ────────────────────────────────────────
    upcoming_meetings_data = [
        {
            "meeting_code": "1234567890",
            "title": "Weekly Team Standup",
            "description": "Weekly sync with the engineering team to discuss progress and blockers.",
            "scheduled_at": now + timedelta(hours=2),
            "duration_minutes": 30,
        },
        {
            "meeting_code": "2345678901",
            "title": "Product Design Review",
            "description": "Review latest mockups and finalize the Q3 product roadmap.",
            "scheduled_at": now + timedelta(days=1, hours=3),
            "duration_minutes": 60,
        },
        {
            "meeting_code": "3456789012",
            "title": "Client Onboarding Call",
            "description": "Onboarding session with new enterprise client — Acme Corp.",
            "scheduled_at": now + timedelta(days=2, hours=5),
            "duration_minutes": 45,
        },
    ]

    upcoming_meetings = []
    for data in upcoming_meetings_data:
        meeting = Meeting(
            meeting_code=data["meeting_code"],
            title=data["title"],
            description=data["description"],
            host_id=user.id,
            meeting_type="scheduled",
            status="upcoming",
            scheduled_at=data["scheduled_at"],
            duration_minutes=data["duration_minutes"],
            invite_link=f"/join/{data['meeting_code']}",
        )
        db.add(meeting)
        upcoming_meetings.append(meeting)

    db.commit()
    for m in upcoming_meetings:
        db.refresh(m)
        print(f"[OK] Seeded upcoming meeting: {m.title} (code: {m.meeting_code})")

    # ── 3. Recent/past meetings ───────────────────────────────────────────────
    recent_meetings_data = [
        {
            "meeting_code": "4567890123",
            "title": "Sprint Retrospective",
            "description": "End-of-sprint retro for Sprint 14.",
            "meeting_type": "scheduled",
            "scheduled_at": now - timedelta(days=1, hours=4),
            "duration_minutes": 45,
            "created_at": now - timedelta(days=1, hours=5),
            "ended_at": now - timedelta(days=1, hours=3, minutes=15),
        },
        {
            "meeting_code": "5678901234",
            "title": "Klaus Schwarz's Meeting",
            "description": None,
            "meeting_type": "instant",
            "scheduled_at": None,
            "duration_minutes": None,
            "created_at": now - timedelta(days=2, hours=6),
            "ended_at": now - timedelta(days=2, hours=5, minutes=30),
        },
        {
            "meeting_code": "6789012345",
            "title": "Quarterly All-Hands",
            "description": "Company-wide quarterly update and Q&A.",
            "meeting_type": "scheduled",
            "scheduled_at": now - timedelta(days=3),
            "duration_minutes": 90,
            "created_at": now - timedelta(days=4),
            "ended_at": now - timedelta(days=3) + timedelta(minutes=90),
        },
    ]

    recent_meetings = []
    for data in recent_meetings_data:
        meeting = Meeting(
            meeting_code=data["meeting_code"],
            title=data["title"],
            description=data["description"],
            host_id=user.id,
            meeting_type=data["meeting_type"],
            status="ended",
            scheduled_at=data["scheduled_at"],
            duration_minutes=data["duration_minutes"],
            invite_link=f"/join/{data['meeting_code']}",
            created_at=data["created_at"],
            ended_at=data["ended_at"],
        )
        db.add(meeting)
        recent_meetings.append(meeting)

    db.commit()
    for m in recent_meetings:
        db.refresh(m)
        print(f"[OK] Seeded recent meeting: {m.title} (code: {m.meeting_code})")

    # ── 4. Mock participants for the first upcoming meeting ───────────────────
    first_meeting = upcoming_meetings[0]
    participants_data = [
        {"display_name": "Klaus Schwarz", "is_host": True, "is_muted": False, "video_on": True},
        {"display_name": "Alice Johnson", "is_host": False, "is_muted": True, "video_on": False},
        {"display_name": "Bob Chen", "is_host": False, "is_muted": False, "video_on": True},
    ]
    for pdata in participants_data:
        participant = Meeting_Participant(
            meeting_id=first_meeting.id,
            display_name=pdata["display_name"],
            is_host=pdata["is_host"],
            is_muted=pdata["is_muted"],
            video_on=pdata["video_on"],
        )
        db.add(participant)
    db.commit()
    print(f"[OK] Seeded {len(participants_data)} participants for '{first_meeting.title}'")

    # Also add participants to a past meeting for variety
    past_meeting = recent_meetings[0]
    past_participants = [
        {"display_name": "Klaus Schwarz", "is_host": True, "is_muted": False, "video_on": True},
        {"display_name": "Diana Patel", "is_host": False, "is_muted": False, "video_on": True},
    ]
    for pdata in past_participants:
        participant = Meeting_Participant(
            meeting_id=past_meeting.id,
            display_name=pdata["display_name"],
            is_host=pdata["is_host"],
            is_muted=pdata["is_muted"],
            video_on=pdata["video_on"],
        )
        db.add(participant)
    db.commit()
    print(f"[OK] Seeded {len(past_participants)} participants for '{past_meeting.title}'")

    db.close()
    print("\n[DONE] Database seeded successfully!")


if __name__ == "__main__":
    seed()
