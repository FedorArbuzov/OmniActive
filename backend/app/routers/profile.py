"""
Роутер для профиля пользователя
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserProfile
from app.schemas import UserProfileBase, UserProfileResponse
from app.auth import get_current_user
import uuid

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=UserProfileResponse, response_model_by_alias=True)
async def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить профиль пользователя"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    
    if not profile:
        # Создаём пустой профиль, если его нет
        profile = UserProfile(
            id=uuid.uuid4(),
            user_id=current_user.id,
            height_cm=None,
            weight_kg=None,
            age_years=None
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    return profile


@router.put("", response_model=UserProfileResponse, response_model_by_alias=True)
async def save_user_profile(
    profile_data: UserProfileBase,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Обновить профиль пользователя"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    
    if profile:
        # Обновляем существующий профиль
        profile.height_cm = profile_data.height_cm
        profile.weight_kg = profile_data.weight_kg
        profile.age_years = profile_data.age_years
    else:
        # Создаём новый профиль
        profile = UserProfile(
            id=uuid.uuid4(),
            user_id=current_user.id,
            **profile_data.model_dump()
        )
        db.add(profile)
    
    db.commit()
    db.refresh(profile)
    return profile
