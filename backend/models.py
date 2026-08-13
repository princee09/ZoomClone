"""SQLAlchemy ORM models for users, meetings, and participants."""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, Text, DateTime, Boolean, ForeignKey, String
)
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(Text, nullable=False)
    email = Column(Text, unique=True, nullable=False)
    avatar_initials = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    meetings = relationship("Meeting", back_populates="host")


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_code = Column(String(20), unique=True, nullable=False)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    host_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    meeting_type = Column(String(20), nullable=False)  # "instant" or "scheduled"
    status = Column(String(20), nullable=False, default="upcoming")  # "upcoming", "live", "ended"
    scheduled_at = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    invite_link = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)

    host = relationship("User", back_populates="meetings")
    participants = relationship("Meeting_Participant", back_populates="meeting", cascade="all, delete-orphan")


class Meeting_Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    display_name = Column(Text, nullable=False)
    is_host = Column(Boolean, default=False)
    is_muted = Column(Boolean, default=False)
    video_on = Column(Boolean, default=False)
    joined_at = Column(DateTime, default=datetime.utcnow)
    left_at = Column(DateTime, nullable=True)

    meeting = relationship("Meeting", back_populates="participants")
