"""
Авторизация и аутентификация
"""
import hashlib
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import User
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)


def _get_token_from_headers(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_access_token: Optional[str] = Header(None, alias="X-Access-Token"),
) -> Optional[str]:
    """Токен из Authorization: Bearer или X-Access-Token (обход блокировки Authorization на Yandex Cloud)."""
    if x_access_token and x_access_token.strip():
        return x_access_token.strip()
    if credentials and credentials.credentials:
        return credentials.credentials
    return None


def _password_to_bcrypt_input(password: str) -> str:
    """
    Преобразует пароль любой длины в строку ≤72 байт для bcrypt.
    Используем SHA-256: полная энтропия сохраняется, ограничение bcrypt соблюдается.
    Обрезать пароль нельзя — два разных длинных пароля могли бы дать один хеш.
    """
    return hashlib.sha256(password.encode("utf-8")).hexdigest()  # 64 символа


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверка пароля."""
    bcrypt_input = _password_to_bcrypt_input(plain_password)
    return pwd_context.verify(bcrypt_input, hashed_password)


def get_password_hash(password: str) -> str:
    """Хеширование пароля. Пароль любой длины сначала приводится к фиксированной строке через SHA-256."""
    bcrypt_input = _password_to_bcrypt_input(password)
    return pwd_context.hash(bcrypt_input)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Создание JWT токена"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Декодирование JWT токена"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


async def get_current_user(
    token: Optional[str] = Depends(_get_token_from_headers),
    db: Session = Depends(get_db),
) -> User:
    """Получение текущего пользователя из токена (Authorization или X-Access-Token)."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Токен не передан",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный токен авторизации",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный токен авторизации",
        )
    
    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
        )
    
    return user
