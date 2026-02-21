"""
Роутер для результатов упражнений
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.models import User, ExerciseResult
from app.schemas import ExerciseResultCreate, ExerciseResultResponse, ExerciseStatsItem
from app.auth import get_current_user
import uuid

router = APIRouter(prefix="/exercise-results", tags=["exercise-results"])


@router.post("", response_model=ExerciseResultResponse)
async def save_exercise_result(
    result_data: ExerciseResultCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Сохранить результат упражнения"""
    result = ExerciseResult(
        id=uuid.uuid4(),
        user_id=current_user.id,
        **result_data.model_dump(by_alias=False)
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return result


@router.get("", response_model=List[ExerciseResultResponse])
async def get_exercise_results(
    exercise_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить результаты упражнений"""
    query = db.query(ExerciseResult).filter(ExerciseResult.user_id == current_user.id)
    
    if exercise_id:
        query = query.filter(ExerciseResult.exercise_id == exercise_id)
    
    results = query.order_by(ExerciseResult.date.desc()).all()
    return results


@router.get("/stats", response_model=List[ExerciseStatsItem], response_model_by_alias=True)
async def get_exercise_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Статистика по всем упражнениям: сумма повторений и количество записей по каждому упражнению."""
    rows = (
        db.query(
            ExerciseResult.exercise_id,
            ExerciseResult.exercise_name,
            func.coalesce(func.sum(ExerciseResult.reps), 0).label("total_reps"),
            func.count(ExerciseResult.id).label("sessions_count"),
        )
        .filter(ExerciseResult.user_id == current_user.id)
        .group_by(ExerciseResult.exercise_id, ExerciseResult.exercise_name)
        .all()
    )
    return [
        ExerciseStatsItem(
            exercise_id=r.exercise_id,
            exercise_name=r.exercise_name,
            total_reps=int(r.total_reps),
            sessions_count=int(r.sessions_count),
        )
        for r in rows
    ]
