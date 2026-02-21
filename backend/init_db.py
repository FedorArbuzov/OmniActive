"""
Скрипт для инициализации базы данных
Создаёт все таблицы на основе моделей SQLAlchemy
"""
from app.database import engine, Base
from app.models import (
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
    CustomWorkoutPlan,
)

if __name__ == "__main__":
    print("Создание таблиц в базе данных...")
    Base.metadata.create_all(bind=engine)
    print("Таблицы успешно созданы!")
