"""
Миграция для создания таблиц achievements и user_achievements
и заполнения справочника достижений.

Запуск:
    python migrate_achievements.py

Или через Docker:
    docker-compose exec api python migrate_achievements.py

Или через Cloud Function:
    Handler: migrate_achievements_handler.handler
"""
from app.achievements_service import ensure_achievements_seeded
from app.database import SessionLocal, engine
from app.models import Achievement, UserAchievement


def migrate():
    """Создаёт таблицы achievements и user_achievements, заполняет справочник."""
    # Создаём только таблицы достижений (остальные могут уже существовать)
    Achievement.__table__.create(engine, checkfirst=True)
    UserAchievement.__table__.create(engine, checkfirst=True)

    db = SessionLocal()
    try:
        ensure_achievements_seeded(db)
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
    print("Миграция достижений выполнена успешно")
