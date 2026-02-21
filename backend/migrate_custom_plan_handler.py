"""
Handler для Cloud Function — миграция таблицы custom_workout_plans.
Создаёт таблицу, добавляет is_public и code, заполняет код.

Handler: migrate_custom_plan_handler.handler
Переменные окружения: DATABASE_URL.
Вызовите функцию один раз — миграция выполнится.
"""
from migrate_custom_plan import migrate


def handler(event: dict, context) -> dict:
    try:
        migrate()
        return {
            "statusCode": 200,
            "body": {"status": "ok", "message": "Миграция custom_workout_plans выполнена"},
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": {"status": "error", "message": str(e)},
        }
