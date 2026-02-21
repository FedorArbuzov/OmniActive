"""
Роутер для сессий тренировок
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.models import User, WorkoutSession
from app.schemas import WorkoutSessionCreate, WorkoutSessionResponse
from app.auth import get_current_user
import uuid

router = APIRouter(prefix="/workout-sessions", tags=["workout-sessions"])


@router.post("", response_model=WorkoutSessionResponse)
async def save_workout_session(
    session_data: WorkoutSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Сохранить сессию тренировки"""
    session = WorkoutSession(
        id=uuid.uuid4(),
        user_id=current_user.id,
        **session_data.model_dump(by_alias=False)
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("", response_model=List[WorkoutSessionResponse])
async def get_workout_sessions(
    date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить сессии тренировок"""
    query = db.query(WorkoutSession).filter(WorkoutSession.user_id == current_user.id)
    
    if date:
        from datetime import date as date_type
        date_obj = date_type.fromisoformat(date)
        query = query.filter(WorkoutSession.date == date_obj)
    
    sessions = query.order_by(WorkoutSession.date.desc(), WorkoutSession.created_at.desc()).all()
    return sessions
