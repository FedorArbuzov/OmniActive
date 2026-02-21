"""
Сервис достижений: вычисление заработанных достижений и выдача наград.
"""
from collections import defaultdict
from datetime import datetime
from typing import Any, List

from sqlalchemy.orm import Session

from app.models import Achievement, ExerciseResult, User, UserAchievement

# Определения для сидирования
ACHIEVEMENT_DEFS: List[dict[str, Any]] = [
    {"id": "pushups_100", "name": "Отжаться сто раз", "type": "total_reps", "exercise_id": "quick_pushups", "target": 100},
    {"id": "pushups_1000", "name": "Отжаться тысячу раз", "type": "total_reps", "exercise_id": "quick_pushups", "target": 1000},
    {"id": "pullups_100", "name": "Подтянуться сто раз", "type": "total_reps", "exercise_id": "quick_pullups", "target": 100},
    {"id": "pullups_1000", "name": "Подтянуться тысячу раз", "type": "total_reps", "exercise_id": "quick_pullups", "target": 1000},
    {"id": "squats_100", "name": "Присесть сто раз", "type": "total_reps", "exercise_id": "quick_squats", "target": 100},
    {"id": "squats_1000", "name": "Присесть тысячу раз", "type": "total_reps", "exercise_id": "quick_squats", "target": 1000},
    {"id": "pushups_max_10", "name": "Отжаться 10 раз за раз", "type": "max_reps", "exercise_id": "quick_pushups", "target": 10},
    {"id": "pushups_max_20", "name": "Отжаться 20 раз за раз", "type": "max_reps", "exercise_id": "quick_pushups", "target": 20},
    {"id": "pushups_max_50", "name": "Отжаться 50 раз за раз", "type": "max_reps", "exercise_id": "quick_pushups", "target": 50},
    {"id": "pullups_max_5", "name": "Подтянуться 5 раз за раз", "type": "max_reps", "exercise_id": "quick_pullups", "target": 5},
    {"id": "pullups_max_10", "name": "Подтянуться 10 раз за раз", "type": "max_reps", "exercise_id": "quick_pullups", "target": 10},
    {"id": "pullups_max_20", "name": "Подтянуться 20 раз за раз", "type": "max_reps", "exercise_id": "quick_pullups", "target": 20},
    {"id": "squats_max_20", "name": "Присесть 20 раз за раз", "type": "max_reps", "exercise_id": "quick_squats", "target": 20},
    {"id": "squats_max_50", "name": "Присесть 50 раз за раз", "type": "max_reps", "exercise_id": "quick_squats", "target": 50},
    {"id": "squats_max_100", "name": "Присесть 100 раз за раз", "type": "max_reps", "exercise_id": "quick_squats", "target": 100},
    {"id": "plank_60", "name": "Стоять в планке 60 секунд", "type": "max_reps", "exercise_id": "quick_plank", "target": 60},
    {"id": "plank_120", "name": "Стоять в планке 2 минуты", "type": "max_reps", "exercise_id": "quick_plank", "target": 120},
    {"id": "plank_180", "name": "Стоять в планке 3 минуты", "type": "max_reps", "exercise_id": "quick_plank", "target": 180},
    {"id": "streak_3", "name": "Заниматься 3 дня подряд", "type": "streak", "exercise_id": None, "target": 3},
    {"id": "streak_5", "name": "Заниматься 5 дней подряд", "type": "streak", "exercise_id": None, "target": 5},
    {"id": "streak_7", "name": "Заниматься неделю подряд", "type": "streak", "exercise_id": None, "target": 7},
    {"id": "streak_14", "name": "Заниматься 2 недели подряд", "type": "streak", "exercise_id": None, "target": 14},
    {"id": "streak_30", "name": "Заниматься месяц подряд", "type": "streak", "exercise_id": None, "target": 30},
]


def _date_key(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d") if hasattr(dt, "strftime") else str(dt)[:10]


def _parse_date(s: str) -> datetime:
    return datetime.strptime(s[:10], "%Y-%m-%d")


def _max_streak(dates: List[str]) -> int:
    if not dates:
        return 0
    unique = sorted(set(dates))
    max_s = 1
    curr = 1
    for i in range(1, len(unique)):
        prev = _parse_date(unique[i - 1])
        curr_d = _parse_date(unique[i])
        if (curr_d - prev).days == 1:
            curr += 1
        else:
            max_s = max(max_s, curr)
            curr = 1
    return max(max_s, curr)


def ensure_achievements_seeded(db: Session) -> None:
    """Создаёт записи в справочнике achievements, если их ещё нет."""
    count = db.query(Achievement).count()
    if count > 0:
        return
    for d in ACHIEVEMENT_DEFS:
        a = Achievement(
            id=d["id"],
            name=d["name"],
            type=d["type"],
            exercise_id=d.get("exercise_id"),
            target=d["target"],
        )
        db.add(a)
    db.commit()


def compute_earned_achievement_ids(results: List[ExerciseResult], achievements: List[Achievement]) -> List[str]:
    """
    Вычисляет, какие достижения пользователь уже заработал по результатам упражнений.
    Возвращает список achievement_id.
    """
    by_exercise: dict[str, List[ExerciseResult]] = defaultdict(list)
    all_dates: List[str] = []

    for r in results:
        d = r.date
        key = d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else str(d)[:10]
        all_dates.append(key)
        by_exercise[r.exercise_id or ""].append(r)

    def total_reps(exercise_id: str) -> int:
        return sum(r.reps or 0 for r in by_exercise.get(exercise_id, []))

    def max_reps(exercise_id: str) -> int:
        ress = by_exercise.get(exercise_id, [])
        if not ress:
            return 0
        return max(r.reps or 0 for r in ress)

    streak = _max_streak(all_dates)
    earned: List[str] = []

    for a in achievements:
        if a.type == "total_reps":
            if total_reps(a.exercise_id or "") >= a.target:
                earned.append(a.id)
        elif a.type == "max_reps":
            if max_reps(a.exercise_id or "") >= a.target:
                earned.append(a.id)
        elif a.type == "streak":
            if streak >= a.target:
                earned.append(a.id)

    return earned


def check_and_award_achievements(user: User, db: Session) -> List[UserAchievement]:
    """
    Проверяет, заработал ли пользователь какие-либо достижения, и выдаёт новые.
    Возвращает список только что выданных UserAchievement (для пуш-уведомлений).
    """
    ensure_achievements_seeded(db)

    results = (
        db.query(ExerciseResult)
        .filter(ExerciseResult.user_id == user.id)
        .all()
    )
    achievements = db.query(Achievement).all()
    earned_ids = compute_earned_achievement_ids(results, achievements)

    existing = {
        ua.achievement_id
        for ua in db.query(UserAchievement).filter(UserAchievement.user_id == user.id).all()
    }

    newly_awarded: List[UserAchievement] = []
    for aid in earned_ids:
        if aid in existing:
            continue
        ua = UserAchievement(
            user_id=user.id,
            achievement_id=aid,
            achieved_at=datetime.utcnow(),
            push_notified=False,
        )
        db.add(ua)
        newly_awarded.append(ua)
        existing.add(aid)

    if newly_awarded:
        db.commit()
        for ua in newly_awarded:
            db.refresh(ua)

    return newly_awarded
