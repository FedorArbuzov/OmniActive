"""
Django модели для OmniActive API

Этот файл содержит все модели данных для бэкенда приложения OmniActive.
Используйте эти модели в вашем Django проекте.
"""

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class User(AbstractUser):
    """
    Расширенная модель пользователя Django
    Можно использовать стандартную User, если не нужны дополнительные поля
    """
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'

    def __str__(self):
        return self.email


class UserProfile(models.Model):
    """
    Профиль пользователя для расчёта калорий
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile',
        verbose_name='Пользователь'
    )
    height_cm = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(50), MaxValueValidator(250)],
        verbose_name='Рост (см)'
    )
    weight_kg = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(20), MaxValueValidator(300)],
        verbose_name='Вес (кг)'
    )
    age_years = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(150)],
        verbose_name='Возраст (лет)'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_profiles'
        verbose_name = 'Профиль пользователя'
        verbose_name_plural = 'Профили пользователей'

    def __str__(self):
        return f'Профиль {self.user.email}'


class Workout(models.Model):
    """
    Модель тренировки
    """
    WORKOUT_CATEGORIES = [
        ('index', 'Тренировки в зале'),
        ('basketball', 'Баскетбол'),
        ('football', 'Футбол'),
        ('hockey', 'Хоккей'),
    ]

    WORKOUT_TYPES = [
        ('strength', 'Силовая тренировка'),
        ('basketball', 'Баскетбол'),
        ('hockey', 'Хоккей'),
    ]

    id = models.UUIDField(primary_key=True, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='workouts',
        verbose_name='Пользователь'
    )
    name = models.CharField(max_length=255, verbose_name='Название тренировки')
    category = models.CharField(
        max_length=20,
        choices=WORKOUT_CATEGORIES,
        default='index',
        verbose_name='Категория'
    )
    type = models.CharField(
        max_length=20,
        choices=WORKOUT_TYPES,
        default='strength',
        verbose_name='Тип тренировки'
    )
    exercises = models.JSONField(
        default=list,
        verbose_name='Упражнения',
        help_text='Список упражнений в формате [{"id": "1", "name": "Приседания"}]'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workouts'
        verbose_name = 'Тренировка'
        verbose_name_plural = 'Тренировки'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'category']),
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        return f'{self.name} ({self.get_category_display()})'


class ExerciseResult(models.Model):
    """
    Результат выполнения упражнения
    Поддерживает как силовые тренировки (weight, reps), так и баскетбол/хоккей (hits, misses)
    """
    id = models.UUIDField(primary_key=True, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='exercise_results',
        verbose_name='Пользователь'
    )
    exercise_id = models.CharField(max_length=100, verbose_name='ID упражнения')
    exercise_name = models.CharField(max_length=255, verbose_name='Название упражнения')
    date = models.DateTimeField(verbose_name='Дата выполнения')
    
    # Связи
    workout = models.ForeignKey(
        Workout,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='exercise_results',
        verbose_name='Тренировка'
    )
    session_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        verbose_name='ID сессии тренировки'
    )
    
    # Для силовых тренировок
    weight = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name='Вес (кг)'
    )
    reps = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='Количество повторений'
    )
    
    # Для баскетбола и хоккея
    hits = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='Попадания'
    )
    misses = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='Промахи'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'exercise_results'
        verbose_name = 'Результат упражнения'
        verbose_name_plural = 'Результаты упражнений'
        ordering = ['-date']
        indexes = [
            models.Index(fields=['user', 'exercise_id']),
            models.Index(fields=['user', 'date']),
            models.Index(fields=['session_id']),
        ]

    def __str__(self):
        if self.weight and self.reps:
            return f'{self.exercise_name}: {self.weight}кг × {self.reps}'
        elif self.hits is not None and self.misses is not None:
            return f'{self.exercise_name}: {self.hits} попаданий, {self.misses} промахов'
        return f'{self.exercise_name} - {self.date}'


class Dish(models.Model):
    """
    Модель блюда с БЖУ
    """
    id = models.UUIDField(primary_key=True, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='dishes',
        verbose_name='Пользователь'
    )
    name = models.CharField(max_length=255, verbose_name='Название блюда')
    calories = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name='Калории (ккал)'
    )
    protein = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Белки (г)'
    )
    fats = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Жиры (г)'
    )
    carbs = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Углеводы (г)'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'dishes'
        verbose_name = 'Блюдо'
        verbose_name_plural = 'Блюда'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['user', 'name']),
        ]

    def __str__(self):
        return f'{self.name} ({self.calories} ккал)'


class FoodLogEntry(models.Model):
    """
    Запись в дневнике питания
    """
    id = models.UUIDField(primary_key=True, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='food_log_entries',
        verbose_name='Пользователь'
    )
    dish = models.ForeignKey(
        Dish,
        on_delete=models.CASCADE,
        related_name='food_log_entries',
        verbose_name='Блюдо'
    )
    dish_name = models.CharField(max_length=255, verbose_name='Название блюда (копия)')
    date = models.DateField(verbose_name='Дата')
    
    # Копия данных из блюда на момент добавления
    calories = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name='Калории (ккал)'
    )
    protein = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Белки (г)'
    )
    fats = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Жиры (г)'
    )
    carbs = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Углеводы (г)'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'food_log_entries'
        verbose_name = 'Запись дневника питания'
        verbose_name_plural = 'Записи дневника питания'
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        return f'{self.dish_name} - {self.date} ({self.calories} ккал)'


class StepsEntry(models.Model):
    """
    Запись количества шагов за день
    """
    id = models.UUIDField(primary_key=True, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='steps_entries',
        verbose_name='Пользователь'
    )
    date = models.DateField(verbose_name='Дата')
    steps = models.PositiveIntegerField(
        validators=[MinValueValidator(0)],
        verbose_name='Количество шагов'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'steps_entries'
        verbose_name = 'Запись шагов'
        verbose_name_plural = 'Записи шагов'
        unique_together = [['user', 'date']]
        ordering = ['-date']
        indexes = [
            models.Index(fields=['user', 'date']),
        ]

    def __str__(self):
        return f'{self.user.email} - {self.date}: {self.steps} шагов'


class WorkoutSession(models.Model):
    """
    Сессия завершённой тренировки для расчёта калорий по MET
    """
    WORKOUT_TYPES = [
        ('strength', 'Силовая тренировка'),
        ('basketball', 'Баскетбол'),
        ('hockey', 'Хоккей'),
    ]

    id = models.UUIDField(primary_key=True, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='workout_sessions',
        verbose_name='Пользователь'
    )
    workout = models.ForeignKey(
        Workout,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sessions',
        verbose_name='Тренировка'
    )
    workout_name = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name='Название тренировки (копия)'
    )
    workout_type = models.CharField(
        max_length=20,
        choices=WORKOUT_TYPES,
        default='strength',
        verbose_name='Тип тренировки'
    )
    date = models.DateField(verbose_name='Дата')
    duration_seconds = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        verbose_name='Длительность (секунды)'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'workout_sessions'
        verbose_name = 'Сессия тренировки'
        verbose_name_plural = 'Сессии тренировок'
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        duration_min = self.duration_seconds // 60
        return f'{self.workout_name or "Тренировка"} - {self.date} ({duration_min} мин)'

    @property
    def duration_minutes(self):
        """Возвращает длительность в минутах"""
        return self.duration_seconds // 60


class ActivitySettings(models.Model):
    """
    Настройки учёта активности пользователя
    """
    ACTIVITY_MODES = [
        ('fixed', 'Один коэффициент'),
        ('daily', 'Выбор в конце дня'),
        ('steps_workouts', 'Шаги и тренировки'),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='activity_settings',
        verbose_name='Пользователь'
    )
    mode = models.CharField(
        max_length=20,
        choices=ACTIVITY_MODES,
        null=True,
        blank=True,
        verbose_name='Режим учёта активности'
    )
    fixed_pal = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(1.0), MaxValueValidator(2.5)],
        verbose_name='Фиксированный коэффициент PAL',
        help_text='Коэффициент активности от 1.0 до 2.5'
    )
    daily_activity_log = models.JSONField(
        default=dict,
        verbose_name='Лог ежедневной активности',
        help_text='Словарь {дата: PAL}, например {"2024-01-15": 1.4}'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'activity_settings'
        verbose_name = 'Настройки активности'
        verbose_name_plural = 'Настройки активности'

    def __str__(self):
        return f'Настройки активности для {self.user.email}'

    def get_daily_pal(self, date_key: str) -> float | None:
        """
        Получает коэффициент PAL за дату или вчерашний, если за день нет
        """
        if date_key in self.daily_activity_log:
            return float(self.daily_activity_log[date_key])
        
        # Попытка получить вчерашний
        from datetime import datetime, timedelta
        try:
            date_obj = datetime.strptime(date_key, '%Y-%m-%d')
            yesterday = date_obj - timedelta(days=1)
            yesterday_key = yesterday.strftime('%Y-%m-%d')
            if yesterday_key in self.daily_activity_log:
                return float(self.daily_activity_log[yesterday_key])
        except ValueError:
            pass
        
        return None
