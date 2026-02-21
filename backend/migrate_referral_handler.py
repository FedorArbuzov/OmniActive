"""
Handler для Cloud Function для выполнения миграции реферальных полей.
Используется в Yandex Cloud Functions.

В Yandex Cloud: создайте функцию с тем же кодом (тот же zip),
Handler: migrate_referral_handler.handler
Переменные окружения: те же (обязательно DATABASE_URL).
Вызовите функцию один раз (через консоль или HTTP-триггер) — миграция выполнится.
"""
from migrate_referral_fields import migrate


def handler(event: dict, context) -> dict:
    """
    Handler для Cloud Function
    """
    try:
        migrate()
        return {
            "statusCode": 200,
            "body": {"status": "ok", "message": "Миграция реферальных полей выполнена успешно"},
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": {"status": "error", "message": str(e)},
        }
