"""
Роутер для шагов
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date as date_type
from app.database import get_db
from app.models import User, StepsEntry
from app.schemas import StepsEntryCreate, StepsEntryResponse
from app.auth import get_current_user
import uuid

router = APIRouter(prefix="/steps", tags=["steps"])


@router.post("", response_model=StepsEntryResponse)
async def save_steps_entry(
    entry_data: StepsEntryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Сохранить количество шагов за день"""
    # Проверяем, есть ли уже запись за эту дату
    existing = db.query(StepsEntry).filter(
        StepsEntry.user_id == current_user.id,
        StepsEntry.date == entry_data.date
    ).first()
    
    if existing:
        # Обновляем существующую запись
        existing.steps = entry_data.steps
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Создаём новую запись
        entry = StepsEntry(
            id=uuid.uuid4(),
            user_id=current_user.id,
            **entry_data.dict()
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry


@router.get("", response_model=List[StepsEntryResponse])
async def get_steps_log(
    date: Optional[str] = Query(None),
    limit: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить записи шагов"""
    query = db.query(StepsEntry).filter(StepsEntry.user_id == current_user.id)
    
    if date:
        date_obj = date_type.fromisoformat(date)
        entry = query.filter(StepsEntry.date == date_obj).first()
        return [entry] if entry else []
    
    query = query.order_by(StepsEntry.date.desc())
    
    if limit:
        query = query.limit(limit)
    
    entries = query.all()
    return entries
