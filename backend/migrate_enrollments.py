"""
Миграция таблицы user_plan_enrollments.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text


def migrate():
    from app.database import engine, Base
    from app.models import UserPlanEnrollment  # noqa: F401

    Base.metadata.tables["user_plan_enrollments"].create(engine, checkfirst=True)
    print("Миграция user_plan_enrollments выполнена.")


if __name__ == "__main__":
    migrate()
