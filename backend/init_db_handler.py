"""
Handler для отдельной Cloud Function «миграции».
Вызов этой функции создаёт все таблицы в БД (аналог init_db.py).

В Yandex Cloud: создайте вторую функцию с тем же кодом (тот же zip),
Handler: init_db_handler.handler
Переменные окружения: те же (обязательно DATABASE_URL).
Вызовите функцию один раз (через консоль или HTTP-триггер) — таблицы создадутся.
"""


def handler(event: dict, context) -> dict:
    from app.database import engine, Base
    from app.models import (  # noqa: F401 — нужны для регистрации в Base.metadata
        User,
        UserProfile,
        Workout,
        CustomWorkoutPlan,
        ExerciseResult,
        Dish,
        FoodLogEntry,
        StepsEntry,
        WorkoutSession,
        ActivitySettings,
        Achievement,
        UserAchievement,
    )

    Base.metadata.create_all(bind=engine)
    return {
        "statusCode": 200,
        "body": {"status": "ok", "message": "Таблицы созданы"},
    }
