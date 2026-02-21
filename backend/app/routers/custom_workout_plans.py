"""
Роутер для пользовательских планов тренировок
"""
import random
import string

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User, CustomWorkoutPlan, UserPlanEnrollment
from app.schemas import CustomWorkoutPlanCreate, CustomWorkoutPlanUpdate, CustomWorkoutPlanResponse, UserPlanEnrollmentResponse
from app.auth import get_current_user
from app.utils_id import parse_id

router = APIRouter(prefix="/custom-workout-plans", tags=["custom-workout-plans"])

_CHARS = string.ascii_uppercase + string.digits


def _generate_plan_code(db: Session, length: int = 8) -> str:
    for _ in range(50):
        code = "".join(random.choices(_CHARS, k=length))
        if not db.query(CustomWorkoutPlan).filter(CustomWorkoutPlan.code == code).first():
            return code
    return "".join(random.choices(_CHARS, k=length))  # fallback


@router.get("", response_model=List[CustomWorkoutPlanResponse])
async def get_plans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить все планы тренировок пользователя"""
    plans = db.query(CustomWorkoutPlan).filter(
        CustomWorkoutPlan.user_id == current_user.id
    ).order_by(CustomWorkoutPlan.created_at.desc()).all()
    return plans


@router.get("/public", response_model=List[CustomWorkoutPlanResponse])
async def get_public_plans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить все публичные планы тренировок"""
    plans = db.query(CustomWorkoutPlan).filter(
        CustomWorkoutPlan.is_public == True
    ).order_by(CustomWorkoutPlan.created_at.desc()).all()
    return plans


@router.get("/public/{plan_id}", response_model=CustomWorkoutPlanResponse)
async def get_public_plan(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить публичный план по ID"""
    plan_uuid = parse_id("plan", plan_id)
    plan = db.query(CustomWorkoutPlan).filter(
        CustomWorkoutPlan.id == plan_uuid,
        CustomWorkoutPlan.is_public == True
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="План не найден")
    return plan


@router.get("/by-code/{code}", response_model=CustomWorkoutPlanResponse)
async def get_plan_by_code(
    code: str,
    db: Session = Depends(get_db)
):
    """Получить приватный план по коду (без авторизации). Искать можно только приватные планы."""
    plan = db.query(CustomWorkoutPlan).filter(
        CustomWorkoutPlan.code == code.upper().strip(),
        CustomWorkoutPlan.is_public == False
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="План не найден или он публичный")
    return plan


@router.get("/enrolled", response_model=List[CustomWorkoutPlanResponse])
async def get_enrolled_plans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить планы, на которые записан пользователь"""
    enrollments = db.query(UserPlanEnrollment).filter(
        UserPlanEnrollment.user_id == current_user.id
    ).all()
    plan_ids = [e.plan_id for e in enrollments]
    if not plan_ids:
        return []
    plans = db.query(CustomWorkoutPlan).filter(
        CustomWorkoutPlan.id.in_(plan_ids)
    ).order_by(CustomWorkoutPlan.created_at.desc()).all()
    return plans


@router.get("/{plan_id}", response_model=CustomWorkoutPlanResponse)
async def get_plan(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить план по ID"""
    plan_uuid = parse_id("plan", plan_id)
    plan = db.query(CustomWorkoutPlan).filter(
        CustomWorkoutPlan.id == plan_uuid,
        CustomWorkoutPlan.user_id == current_user.id
    ).first()

    if not plan:
        raise HTTPException(status_code=404, detail="План не найден")

    return plan


@router.post("", response_model=CustomWorkoutPlanResponse)
async def create_plan(
    data: CustomWorkoutPlanCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создать план тренировок"""
    code = _generate_plan_code(db)
    plan = CustomWorkoutPlan(
        user_id=current_user.id,
        title=data.title,
        description=data.description,
        schedule=data.schedule or [],
        is_public=data.is_public,
        code=code
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.put("/{plan_id}", response_model=CustomWorkoutPlanResponse)
async def update_plan(
    plan_id: str,
    data: CustomWorkoutPlanUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Обновить план тренировок"""
    plan_uuid = parse_id("plan", plan_id)
    plan = db.query(CustomWorkoutPlan).filter(
        CustomWorkoutPlan.id == plan_uuid,
        CustomWorkoutPlan.user_id == current_user.id
    ).first()

    if not plan:
        raise HTTPException(status_code=404, detail="План не найден")

    plan.title = data.title
    plan.description = data.description
    plan.schedule = data.schedule or []
    plan.is_public = data.is_public

    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/{plan_id}")
async def delete_plan(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Удалить план тренировок"""
    plan_uuid = parse_id("plan", plan_id)
    plan = db.query(CustomWorkoutPlan).filter(
        CustomWorkoutPlan.id == plan_uuid,
        CustomWorkoutPlan.user_id == current_user.id
    ).first()

    if not plan:
        raise HTTPException(status_code=404, detail="План не найден")

    db.delete(plan)
    db.commit()
    return {"message": "План удалён"}


# ==================== ENROLL ====================

@router.post("/{plan_id}/enroll", response_model=UserPlanEnrollmentResponse)
async def enroll_plan(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Записаться на план тренировок (enroll)"""
    plan_uuid = parse_id("plan", plan_id)
    plan = db.query(CustomWorkoutPlan).filter(
        CustomWorkoutPlan.id == plan_uuid,
        CustomWorkoutPlan.is_public == True
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Публичный план не найден")

    existing = db.query(UserPlanEnrollment).filter(
        UserPlanEnrollment.user_id == current_user.id,
        UserPlanEnrollment.plan_id == plan_uuid
    ).first()
    if existing:
        return existing

    enrollment = UserPlanEnrollment(
        user_id=current_user.id,
        plan_id=plan_uuid
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.delete("/{plan_id}/enroll")
async def unenroll_plan(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Отписаться от плана тренировок"""
    plan_uuid = parse_id("plan", plan_id)
    enrollment = db.query(UserPlanEnrollment).filter(
        UserPlanEnrollment.user_id == current_user.id,
        UserPlanEnrollment.plan_id == plan_uuid
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Вы не записаны на этот план")

    db.delete(enrollment)
    db.commit()
    return {"message": "Вы отписались от плана"}
