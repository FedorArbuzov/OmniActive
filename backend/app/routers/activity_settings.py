"""
Роутер для настроек активности
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date, timedelta
from app.database import get_db
from app.models import User, ActivitySettings
from app.schemas import (
    ActivityModeUpdate,
    FixedPalUpdate,
    DailyActivityLogUpdate,
    ActivitySettingsResponse
)
from app.auth import get_current_user
import uuid

router = APIRouter(prefix="/activity-settings", tags=["activity-settings"])


def get_or_create_activity_settings(user_id: uuid.UUID, db: Session) -> ActivitySettings:
    """Получить или создать настройки активности"""
    settings = db.query(ActivitySettings).filter(ActivitySettings.user_id == user_id).first()
    
    if not settings:
        settings = ActivitySettings(
            id=uuid.uuid4(),
            user_id=user_id,
            mode=None,
            fixed_pal=None,
            daily_activity_log={}
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return settings


@router.get("/mode")
async def get_run_activity_mode(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить режим учёта активности"""
    settings = get_or_create_activity_settings(current_user.id, db)
    return settings.mode


@router.put("/mode")
async def set_run_activity_mode(
    mode_data: ActivityModeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Сохранить режим учёта активности"""
    settings = get_or_create_activity_settings(current_user.id, db)
    settings.mode = mode_data.mode
    db.commit()
    return {"message": "Режим активности сохранён"}


@router.get("/fixed-pal")
async def get_run_fixed_pal(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить фиксированный коэффициент PAL"""
    settings = get_or_create_activity_settings(current_user.id, db)
    return float(settings.fixed_pal) if settings.fixed_pal else None


@router.put("/fixed-pal")
async def set_run_fixed_pal(
    pal_data: FixedPalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Сохранить фиксированный коэффициент PAL"""
    settings = get_or_create_activity_settings(current_user.id, db)
    settings.fixed_pal = pal_data.pal
    db.commit()
    return {"message": "Фиксированный PAL сохранён"}


@router.get("/daily-log")
async def get_run_daily_activity_log(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить лог ежедневной активности"""
    settings = get_or_create_activity_settings(current_user.id, db)
    return settings.daily_activity_log or {}


@router.post("/daily-log")
async def set_run_daily_activity_for_date(
    log_data: DailyActivityLogUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Сохранить коэффициент PAL за дату"""
    settings = get_or_create_activity_settings(current_user.id, db)
    
    if settings.daily_activity_log is None:
        settings.daily_activity_log = {}
    
    date_str = log_data.date.isoformat()
    settings.daily_activity_log[date_str] = log_data.pal
    db.commit()
    return {"message": "Ежедневная активность сохранена"}


@router.get("/daily-pal")
async def get_run_daily_pal_for_date(
    date: str = Query(..., description="Дата в формате YYYY-MM-DD"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить коэффициент PAL за дату (или вчерашний, если за день нет)"""
    settings = get_or_create_activity_settings(current_user.id, db)
    
    if settings.daily_activity_log is None:
        return None
    
    # Пытаемся получить за указанную дату
    if date in settings.daily_activity_log:
        return float(settings.daily_activity_log[date])
    
    # Пытаемся получить за вчера
    try:
        date_obj = date.fromisoformat(date)
        yesterday = date_obj - timedelta(days=1)
        yesterday_str = yesterday.isoformat()
        
        if yesterday_str in settings.daily_activity_log:
            return float(settings.daily_activity_log[yesterday_str])
    except ValueError:
        pass
    
    return None
