"""
Роутер для тренировок
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.models import User, Workout
from app.schemas import WorkoutCreate, WorkoutResponse
from app.auth import get_current_user
from app.utils_id import parse_id
import uuid

router = APIRouter(prefix="/workouts", tags=["workouts"])


@router.get("", response_model=List[WorkoutResponse])
async def get_workouts(
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить все тренировки пользователя"""
    query = db.query(Workout).filter(Workout.user_id == current_user.id)
    
    if category:
        query = query.filter(Workout.category == category)
    
    workouts = query.order_by(Workout.created_at.desc()).all()
    return workouts


@router.get("/{workout_id}", response_model=WorkoutResponse)
async def get_workout(
    workout_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить тренировку по ID (UUID или строка с фронта, например timestamp)"""
    workout_uuid = parse_id("workout", workout_id)
    workout = db.query(Workout).filter(
        Workout.id == workout_uuid,
        Workout.user_id == current_user.id
    ).first()
    
    if not workout:
        raise HTTPException(status_code=404, detail="Тренировка не найдена")
    
    return workout


@router.put("/{workout_id}", response_model=WorkoutResponse)
async def save_workout(
    workout_id: str,
    workout_data: WorkoutCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создать или обновить тренировку (workout_id — UUID или строка с фронта)"""
    workout_uuid = parse_id("workout", workout_id)
    workout = db.query(Workout).filter(
        Workout.id == workout_uuid,
        Workout.user_id == current_user.id
    ).first()
    
    if workout:
        # Обновляем существующую
        workout.name = workout_data.name
        workout.category = workout_data.category
        workout.type = workout_data.type
        workout.exercises = [ex.model_dump() for ex in workout_data.exercises]
    else:
        # Создаём новую
        workout = Workout(
            id=workout_uuid,
            user_id=current_user.id,
            name=workout_data.name,
            category=workout_data.category,
            type=workout_data.type,
            exercises=[ex.model_dump() for ex in workout_data.exercises]
        )
        db.add(workout)
    
    db.commit()
    db.refresh(workout)
    return workout


@router.delete("/{workout_id}")
async def delete_workout(
    workout_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Удалить тренировку (workout_id — UUID или строка с фронта)"""
    workout_uuid = parse_id("workout", workout_id)
    workout = db.query(Workout).filter(
        Workout.id == workout_uuid,
        Workout.user_id == current_user.id
    ).first()
    
    if not workout:
        raise HTTPException(status_code=404, detail="Тренировка не найдена")
    
    db.delete(workout)
    db.commit()
    return {"message": "Тренировка удалена"}
