"""
Конфигурация приложения
"""
import os
from pydantic_settings import BaseSettings
from typing import Optional, Union
import json


def _is_lambda() -> bool:
    """Проверка, что приложение запущено в AWS Lambda."""
    return bool(os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))


class Settings(BaseSettings):
    """Настройки приложения"""
    
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost/omniactive"
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 дней
    
    # AWS Lambda / API Gateway
    AWS_REGION: Optional[str] = None
    # Базовый путь API Gateway, если используется (например "/prod"). Оставьте пустым, если пути без префикса.
    API_GATEWAY_BASE_PATH: Optional[str] = None

    # CORS — при allow_credentials=True только явные origins. Для выложенного фронта задайте в env:
    # CORS_ORIGINS=https://ваш-фронт.vercel.app  или  CORS_ORIGINS=["https://...","http://localhost:8080"]
    CORS_ORIGINS: Union[str, list[str]] = [
        "http://localhost:8080",
        "http://localhost:8000",
        "http://localhost:19006",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:19006",
    ]
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Парсим CORS_ORIGINS если это JSON строка
        if isinstance(self.CORS_ORIGINS, str):
            try:
                self.CORS_ORIGINS = json.loads(self.CORS_ORIGINS)
            except (json.JSONDecodeError, TypeError):
                # Если не JSON, используем как есть (для простых случаев)
                self.CORS_ORIGINS = [self.CORS_ORIGINS] if self.CORS_ORIGINS else ["*"]


settings = Settings()
IS_LAMBDA = _is_lambda()