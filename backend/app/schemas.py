"""
Pydantic схемы для валидации данных
"""
import uuid
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID


# ==================== АВТОРИЗАЦИЯ ====================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=1000)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=1000, description="Пароль от 6 символов")
    referral_code: Optional[str] = Field(None, max_length=20, description="Реферальный код (опционально)")


class UserResponse(BaseModel):
    id: UUID
    email: str
    
    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    token: str
    user: UserResponse


class ReferralCodeResponse(BaseModel):
    referral_code: str


class ReferralUser(BaseModel):
    """Информация о реферале"""
    id: UUID
    email: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class ReferralsListResponse(BaseModel):
    """Список рефералов пользователя"""
    referrals: List[ReferralUser]
    total_count: int


class UserMeResponse(BaseModel):
    """Информация о текущем пользователе (дата регистрации)"""
    created_at: datetime


# ==================== ПРОФИЛЬ ====================

class UserProfileBase(BaseModel):
    """Принимает snake_case и camelCase с фронта (heightCm, weightKg, ageYears)."""
    model_config = ConfigDict(populate_by_name=True)

    height_cm: Optional[int] = Field(None, ge=50, le=250, alias="heightCm")
    weight_kg: Optional[float] = Field(None, ge=20, le=300, alias="weightKg")
    age_years: Optional[int] = Field(None, ge=1, le=150, alias="ageYears")


class UserProfileResponse(UserProfileBase):
    """Ответ в camelCase для фронта (heightCm, weightKg, ageYears)."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ==================== ТРЕНИРОВКИ ====================

class Exercise(BaseModel):
    id: str
    name: str


class WorkoutBase(BaseModel):
    name: str
    category: str  # index, basketball, football, hockey
    type: str  # strength, basketball, hockey
    exercises: List[Exercise]


class WorkoutCreate(WorkoutBase):
    pass


class WorkoutResponse(WorkoutBase):
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# ==================== РЕЗУЛЬТАТЫ УПРАЖНЕНИЙ ====================

class ExerciseResultBase(BaseModel):
    """Принимает camelCase с фронта (exerciseId, exerciseName и т.д.)"""
    model_config = ConfigDict(populate_by_name=True)

    exercise_id: str = Field(..., alias="exerciseId")
    exercise_name: str = Field(..., alias="exerciseName")
    date: datetime
    workout_id: Optional[UUID] = Field(None, alias="workoutId")
    session_id: Optional[str] = Field(None, alias="sessionId")
    weight: Optional[float] = None
    reps: Optional[int] = None
    hits: Optional[int] = None
    misses: Optional[int] = None


class ExerciseResultCreate(ExerciseResultBase):
    pass


class ExerciseResultResponse(ExerciseResultBase):
    id: UUID
    
    class Config:
        from_attributes = True


class ExerciseStatsItem(BaseModel):
    """Сводка по упражнению: всего повторений и количество записей (camelCase для фронта)."""
    model_config = ConfigDict(populate_by_name=True)

    exercise_id: str = Field(..., alias="exerciseId")
    exercise_name: str = Field(..., alias="exerciseName")
    total_reps: int = Field(0, alias="totalReps")
    sessions_count: int = Field(0, alias="sessionsCount")


# ==================== БЛЮДА ====================

class DishBase(BaseModel):
    name: str
    calories: float = Field(..., ge=0)
    protein: float = Field(0, ge=0)
    fats: float = Field(0, ge=0)
    carbs: float = Field(0, ge=0)


class DishCreate(DishBase):
    pass


class DishResponse(DishBase):
    id: UUID
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ==================== ДНЕВНИК ПИТАНИЯ ====================

def _str_to_dish_uuid(value: str) -> UUID:
    """Строку с фронта (UUID или timestamp) в UUID для блюда."""
    try:
        return UUID(value)
    except (ValueError, TypeError):
        return uuid.uuid5(uuid.NAMESPACE_DNS, f"dish.{value}")


class FoodLogEntryBase(BaseModel):
    """Принимает camelCase с фронта (dishId, dishName)."""
    model_config = ConfigDict(populate_by_name=True)

    dish_id: UUID = Field(..., alias="dishId")
    dish_name: str = Field(..., alias="dishName")
    calories: float = Field(..., ge=0)
    protein: float = Field(0, ge=0)
    fats: float = Field(0, ge=0)
    carbs: float = Field(0, ge=0)
    date: datetime

    @field_validator("dish_id", mode="before")
    @classmethod
    def parse_dish_id(cls, v: Any) -> UUID:
        if isinstance(v, UUID):
            return v
        if isinstance(v, str):
            return _str_to_dish_uuid(v)
        raise ValueError("dish_id must be UUID or string")


class FoodLogEntryCreate(FoodLogEntryBase):
    pass


class FoodLogEntryResponse(FoodLogEntryBase):
    id: UUID
    
    class Config:
        from_attributes = True


# ==================== ШАГИ ====================

class StepsEntryBase(BaseModel):
    date: date
    steps: int = Field(..., ge=0)


class StepsEntryCreate(StepsEntryBase):
    pass


class StepsEntryResponse(StepsEntryBase):
    id: UUID
    
    class Config:
        from_attributes = True


# ==================== СЕССИИ ТРЕНИРОВОК ====================

def _str_to_workout_uuid(value: str) -> UUID:
    """Строку с фронта (UUID или timestamp) в UUID для тренировки."""
    try:
        return UUID(value)
    except (ValueError, TypeError):
        return uuid.uuid5(uuid.NAMESPACE_DNS, f"workout.{value}")


class WorkoutSessionBase(BaseModel):
    """Принимает camelCase с фронта (workoutId, workoutName, workoutType, durationSeconds)."""
    model_config = ConfigDict(populate_by_name=True)

    workout_id: Optional[UUID] = Field(None, alias="workoutId")
    workout_name: Optional[str] = Field(None, alias="workoutName")
    workout_type: str = Field(..., alias="workoutType")
    date: date
    duration_seconds: int = Field(..., ge=1, alias="durationSeconds")

    @field_validator("workout_id", mode="before")
    @classmethod
    def parse_workout_id(cls, v: Any) -> Optional[UUID]:
        if v is None or v == "":
            return None
        if isinstance(v, UUID):
            return v
        if isinstance(v, str):
            return _str_to_workout_uuid(v)
        raise ValueError("workout_id must be UUID or string")


class WorkoutSessionCreate(WorkoutSessionBase):
    pass


class WorkoutSessionResponse(WorkoutSessionBase):
    id: UUID
    
    class Config:
        from_attributes = True


# ==================== НАСТРОЙКИ АКТИВНОСТИ ====================

class ActivityModeUpdate(BaseModel):
    mode: Optional[str] = None  # fixed, daily, steps_workouts


class FixedPalUpdate(BaseModel):
    pal: float = Field(..., ge=1.0, le=2.5)


class DailyActivityLogUpdate(BaseModel):
    date: date
    pal: float = Field(..., ge=1.0, le=2.5)


class ActivitySettingsResponse(BaseModel):
    mode: Optional[str] = None
    fixed_pal: Optional[float] = None
    daily_activity_log: Dict[str, float] = {}
    
    class Config:
        from_attributes = True


# ==================== ПОЛЬЗОВАТЕЛЬСКИЕ ПЛАНЫ ТРЕНИРОВОК ====================

class PlanSlotBase(BaseModel):
    """Слот в расписании: день недели, время, тренировка."""
    model_config = ConfigDict(populate_by_name=True)

    day_of_week: int = Field(..., ge=0, le=6, alias="dayOfWeek")
    time: str = Field(..., pattern=r"^\d{1,2}:\d{2}$")
    workout_id: str = Field(..., alias="workoutId")
    workout_name: str = Field(..., alias="workoutName")


class CustomWorkoutPlanBase(BaseModel):
    title: str
    description: Optional[str] = None
    schedule: List[Dict[str, Any]] = Field(default_factory=list)
    is_public: bool = False


class CustomWorkoutPlanCreate(CustomWorkoutPlanBase):
    pass


class CustomWorkoutPlanUpdate(CustomWorkoutPlanBase):
    pass


class CustomWorkoutPlanResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    schedule: List[Dict[str, Any]] = []
    is_public: bool = False
    code: str = ""
    created_at: datetime

    @field_validator("code", mode="before")
    @classmethod
    def code_default(cls, v: Any) -> str:
        return v if isinstance(v, str) and v else ""

    @field_validator("is_public", mode="before")
    @classmethod
    def is_public_default(cls, v: Any) -> bool:
        return bool(v) if v is not None else False

    class Config:
        from_attributes = True


class UserPlanEnrollmentResponse(BaseModel):
    id: UUID
    user_id: UUID
    plan_id: UUID
    enrolled_at: datetime

    class Config:
        from_attributes = True
