"""Participants API router — host controls for mute/remove."""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from database import get_db
from models import Meeting_Participant
from schemas import ParticipantOut, UpdateParticipantRequest

router = APIRouter(prefix="/api/participants", tags=["participants"])


@router.patch("/{participant_id}", response_model=ParticipantOut)
def update_participant(
    participant_id: int,
    body: UpdateParticipantRequest,
    db: Session = Depends(get_db),
):
    """Update a participant's is_muted state (host mute control)."""
    participant = db.query(Meeting_Participant).filter(Meeting_Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participant not found.")

    participant.is_muted = body.is_muted
    db.commit()
    db.refresh(participant)
    return participant


@router.delete("/{participant_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_participant(
    participant_id: int,
    db: Session = Depends(get_db),
):
    """Remove a participant from a meeting (host remove control)."""
    participant = db.query(Meeting_Participant).filter(Meeting_Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participant not found.")

    db.delete(participant)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
