"""
Роутер для достижений
"""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.achievements_service import check_and_award_achievements, ensure_achievements_seeded
from app.auth import get_current_user
from app.database import get_db
from app.models import Achievement, User, UserAchievement

router = APIRouter(prefix="/achievements", tags=["achievements"])


@router.get("")
async def get_achievements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Все достижения с отметкой achieved, achieved_at, push_notified."""
    ensure_achievements_seeded(db)

    achievements = db.query(Achievement).order_by(Achievement.id).all()
    user_achievements = {
        ua.achievement_id: ua
        for ua in db.query(UserAchievement)
        .filter(UserAchievement.user_id == current_user.id)
        .all()
    }

    out = []
    for a in achievements:
        ua = user_achievements.get(a.id)
        out.append({
            "id": a.id,
            "name": a.name,
            "type": a.type,
            "target": a.target,
            "achieved": ua is not None,
            "achieved_at": ua.achieved_at.isoformat() if ua and ua.achieved_at else None,
            "push_notified": ua.push_notified if ua else False,
        })

    return out


@router.post("/check")
async def check_achievements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Проверяет, заработал ли пользователь новые достижения.
    Выдаёт их и возвращает список только что полученных (для пуш-уведомлений).
    """
    newly = check_and_award_achievements(current_user, db)
    result = []
    for ua in newly:
        a = db.query(Achievement).filter(Achievement.id == ua.achievement_id).first()
        result.append({
            "id": ua.achievement_id,
            "name": a.name if a else ua.achievement_id,
            "achieved_at": ua.achieved_at.isoformat(),
        })
    return {"newly_awarded": result}


@router.patch("/{achievement_id}/push-notified")
async def mark_push_notified(
    achievement_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Отметить, что пуш-уведомление по достижению отправлено."""
    ua = (
        db.query(UserAchievement)
        .filter(
            UserAchievement.user_id == current_user.id,
            UserAchievement.achievement_id == achievement_id,
        )
        .first()
    )
    if not ua:
        return {"success": False, "message": "Achievement not found for user"}
    ua.push_notified = True
    db.commit()
    db.refresh(ua)
    return {"success": True}
