"""
Миграция таблицы custom_workout_plans.
Создаёт таблицу если не существует, добавляет is_public и code, заполняет код для существующих записей.
"""
import random
import string
from sqlalchemy import text
from app.database import engine, Base
from app.config import settings


def generate_code():
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


def migrate():
    from app.models import CustomWorkoutPlan  # noqa: F401

    is_postgres = "postgresql" in (settings.DATABASE_URL or "")

    with engine.connect() as conn:
        # 1. Создать таблицу если не существует
        Base.metadata.tables["custom_workout_plans"].create(engine, checkfirst=True)
        conn.commit()

        # 2. Получить список колонок
        cols = []
        if is_postgres:
            r = conn.execute(
                text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name = 'custom_workout_plans'"
                )
            )
            cols = [row[0] for row in r.fetchall()]
        else:
            r = conn.execute(text("PRAGMA table_info(custom_workout_plans)"))
            cols = [row[1] for row in r.fetchall()]

        # 3. Добавить is_public если нет
        if "is_public" not in cols:
            if is_postgres:
                conn.execute(text("ALTER TABLE custom_workout_plans ADD COLUMN is_public BOOLEAN DEFAULT FALSE"))
            else:
                conn.execute(text("ALTER TABLE custom_workout_plans ADD COLUMN is_public INTEGER DEFAULT 0"))
            conn.commit()

        # 4. Добавить code если нет и заполнить
        if "code" not in cols:
            if is_postgres:
                conn.execute(text("ALTER TABLE custom_workout_plans ADD COLUMN code VARCHAR(12) DEFAULT NULL"))
            else:
                conn.execute(text("ALTER TABLE custom_workout_plans ADD COLUMN code VARCHAR(12)"))
            conn.commit()

        # 5. Backfill code для записей без кода
        if is_postgres:
            r = conn.execute(text("SELECT id FROM custom_workout_plans WHERE code IS NULL OR code = ''"))
        else:
            r = conn.execute(text("SELECT id FROM custom_workout_plans WHERE code IS NULL OR code = ''"))
        ids = [row[0] for row in r.fetchall()]
        used = set()
        for uid in ids:
            while True:
                code = generate_code()
                if code not in used:
                    used.add(code)
                    break
            conn.execute(text("UPDATE custom_workout_plans SET code = :c WHERE id = :id"), {"c": code, "id": str(uid)})
        conn.commit()


if __name__ == "__main__":
    migrate()
    print("Миграция custom_workout_plans выполнена.")
