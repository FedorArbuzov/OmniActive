"""
SQLAlchemy модели для базы данных
"""
from sqlalchemy import Boolean, Column, String, Integer, DateTime, Date, ForeignKey, JSON, Text, UniqueConstraint, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database import Base


class User(Base):
    """Модель пользователя"""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    referral_code = Column(String(20), unique=True, nullable=True, index=True)  # Реферальный код пользователя
    referred_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Кто пригласил
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False)
    workouts = relationship("Workout", back_populates="user", cascade="all, delete-orphan")
    exercise_results = relationship("ExerciseResult", back_populates="user", cascade="all, delete-orphan")
    dishes = relationship("Dish", back_populates="user", cascade="all, delete-orphan")
    food_log_entries = relationship("FoodLogEntry", back_populates="user", cascade="all, delete-orphan")
    steps_entries = relationship("StepsEntry", back_populates="user", cascade="all, delete-orphan")
    workout_sessions = relationship("WorkoutSession", back_populates="user", cascade="all, delete-orphan")
    activity_settings = relationship("ActivitySettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    user_achievements = relationship("UserAchievement", back_populates="user", cascade="all, delete-orphan")
    custom_workout_plans = relationship("CustomWorkoutPlan", back_populates="user", cascade="all, delete-orphan")
    plan_enrollments = relationship("UserPlanEnrollment", back_populates="user", cascade="all, delete-orphan")
    
    # Реферальные связи (self-referential)
    # referred_by: кто меня пригласил (Many-to-One)
    # referrals: кого я пригласил (One-to-Many)
    referred_by = relationship(
        "User",
        remote_side=[id],
        foreign_keys=[referred_by_id],
        back_populates="referrals",
    )
    referrals = relationship(
        "User",
        foreign_keys=[referred_by_id],
        back_populates="referred_by",
    )


class UserProfile(Base):
    """Профиль пользователя"""
    __tablename__ = "user_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    height_cm = Column(Integer, nullable=True)
    weight_kg = Column(Numeric(5, 2), nullable=True)
    age_years = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="profile")


class Workout(Base):
    """Модель тренировки"""
    __tablename__ = "workouts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(20), nullable=False, index=True)  # index, basketball, football, hockey
    type = Column(String(20), nullable=False)  # strength, basketball, hockey
    exercises = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="workouts")
    exercise_results = relationship("ExerciseResult", back_populates="workout")
    sessions = relationship("WorkoutSession", back_populates="workout")


class CustomWorkoutPlan(Base):
    """Пользовательский план тренировок: название, описание, расписание, приватность и код."""
    __tablename__ = "custom_workout_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    schedule = Column(JSON, default=list)
    is_public = Column(Boolean, default=False, nullable=False)
    code = Column(String(12), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="custom_workout_plans")
    enrollments = relationship("UserPlanEnrollment", back_populates="plan", cascade="all, delete-orphan")


class UserPlanEnrollment(Base):
    """Связка пользователя с планом тренировок (enroll)"""
    __tablename__ = "user_plan_enrollments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("custom_workout_plans.id"), nullable=False, index=True)
    enrolled_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="plan_enrollments")
    plan = relationship("CustomWorkoutPlan", back_populates="enrollments")

    __table_args__ = (
        UniqueConstraint("user_id", "plan_id", name="unique_user_plan_enrollment"),
    )


class ExerciseResult(Base):
    """Результат выполнения упражнения"""
    __tablename__ = "exercise_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    exercise_id = Column(String(100), nullable=False, index=True)
    exercise_name = Column(String(255), nullable=False)
    date = Column(DateTime, nullable=False, index=True)
    workout_id = Column(UUID(as_uuid=True), ForeignKey("workouts.id"), nullable=True)
    session_id = Column(String(100), nullable=True, index=True)
    
    # Для силовых тренировок
    weight = Column(Numeric(6, 2), nullable=True)
    reps = Column(Integer, nullable=True)
    
    # Для баскетбола и хоккея
    hits = Column(Integer, nullable=True)
    misses = Column(Integer, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="exercise_results")
    workout = relationship("Workout", back_populates="exercise_results")


class Dish(Base):
    """Модель блюда"""
    __tablename__ = "dishes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    calories = Column(Numeric(7, 2), nullable=False)
    protein = Column(Numeric(7, 2), default=0)
    fats = Column(Numeric(7, 2), default=0)
    carbs = Column(Numeric(7, 2), default=0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="dishes")
    food_log_entries = relationship("FoodLogEntry", back_populates="dish")


class FoodLogEntry(Base):
    """Запись в дневнике питания"""
    __tablename__ = "food_log_entries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    dish_id = Column(UUID(as_uuid=True), ForeignKey("dishes.id"), nullable=False)
    dish_name = Column(String(255), nullable=False)
    date = Column(Date, nullable=False, index=True)
    calories = Column(Numeric(7, 2), nullable=False)
    protein = Column(Numeric(7, 2), default=0)
    fats = Column(Numeric(7, 2), default=0)
    carbs = Column(Numeric(7, 2), default=0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    user = relationship("User", back_populates="food_log_entries")
    dish = relationship("Dish", back_populates="food_log_entries")


class StepsEntry(Base):
    """Запись количества шагов"""
    __tablename__ = "steps_entries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    steps = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="steps_entries")
    
    __table_args__ = (
        UniqueConstraint('user_id', 'date', name='unique_user_date'),
    )


class WorkoutSession(Base):
    """Сессия тренировки"""
    __tablename__ = "workout_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    workout_id = Column(UUID(as_uuid=True), ForeignKey("workouts.id"), nullable=True)
    workout_name = Column(String(255), nullable=True)
    workout_type = Column(String(20), nullable=False)
    date = Column(Date, nullable=False, index=True)
    duration_seconds = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    user = relationship("User", back_populates="workout_sessions")
    workout = relationship("Workout", back_populates="sessions")


class Achievement(Base):
    """Определение достижения (справочник)"""
    __tablename__ = "achievements"
    
    id = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=False)
    type = Column(String(30), nullable=False)  # total_reps, max_reps, streak
    exercise_id = Column(String(100), nullable=True)
    target = Column(Integer, nullable=False)
    
    user_achievements = relationship("UserAchievement", back_populates="achievement")


class UserAchievement(Base):
    """Связь пользователя с достижением: когда получил и отправлен ли пуш"""
    __tablename__ = "user_achievements"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    achievement_id = Column(String(50), ForeignKey("achievements.id"), nullable=False, index=True)
    achieved_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    push_notified = Column(Boolean, default=False, nullable=False)
    
    user = relationship("User", back_populates="user_achievements")
    achievement = relationship("Achievement", back_populates="user_achievements")
    
    __table_args__ = (
        UniqueConstraint("user_id", "achievement_id", name="unique_user_achievement"),
    )


class ActivitySettings(Base):
    """Настройки активности"""
    __tablename__ = "activity_settings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    mode = Column(String(20), nullable=True)  # fixed, daily, steps_workouts
    fixed_pal = Column(Numeric(3, 2), nullable=True)
    daily_activity_log = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="activity_settings")
