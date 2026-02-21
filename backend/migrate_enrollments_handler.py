"""
Handler для Cloud Function — миграция таблицы user_plan_enrollments.

Entry point: migrate_enrollments_handler.handler
"""
import json

from migrate_enrollments import migrate


def handler(event, context):
    try:
        migrate()
        return {
            "statusCode": 200,
            "body": {"status": "ok", "message": "Миграция user_plan_enrollments выполнена"},
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": {"status": "error", "message": str(e)},
        }
