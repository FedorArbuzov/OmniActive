"""
Роутер для дневника питания
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from app.database import get_db
from app.models import User, FoodLogEntry
from app.schemas import FoodLogEntryCreate, FoodLogEntryResponse
from app.auth import get_current_user
from app.utils_id import parse_id
import uuid

router = APIRouter(prefix="/food-log", tags=["food-log"])


@router.post("", response_model=FoodLogEntryResponse)
async def add_food_log_entry(
    entry_data: FoodLogEntryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Добавить запись в дневник питания"""
    entry = FoodLogEntry(
        id=uuid.uuid4(),
        user_id=current_user.id,
        **entry_data.model_dump(by_alias=False)
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("", response_model=List[FoodLogEntryResponse])
async def get_food_log(
    date: Optional[str] = Query(None),
    limit: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить записи дневника питания"""
    query = db.query(FoodLogEntry).filter(FoodLogEntry.user_id == current_user.id)
    
    if date:
        date_obj = datetime.fromisoformat(date.replace('Z', '+00:00')).date()
        query = query.filter(FoodLogEntry.date == date_obj)
    
    query = query.order_by(FoodLogEntry.date.desc(), FoodLogEntry.created_at.desc())
    
    if limit:
        query = query.limit(limit)
    
    entries = query.all()
    return entries


@router.delete("/{entry_id}")
async def delete_food_log_entry(
    entry_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Удалить запись из дневника питания (entry_id — UUID или строка с фронта)"""
    entry_uuid = parse_id("food_log_entry", entry_id)
    entry = db.query(FoodLogEntry).filter(
        FoodLogEntry.id == entry_uuid,
        FoodLogEntry.user_id == current_user.id
    ).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    
    db.delete(entry)
    db.commit()
    return {"message": "Запись удалена"}
