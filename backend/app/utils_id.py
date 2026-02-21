"""
Преобразование строковых ID с фронта (UUID или timestamp) в UUID для БД.
"""
import uuid
from uuid import UUID


def parse_id(namespace: str, value: str) -> UUID:
    """
    Принимает id с фронта: валидный UUID или строка (например timestamp).
    Возвращает UUID для использования в БД.
    """
    try:
        return UUID(value)
    except (ValueError, TypeError):
        return uuid.uuid5(uuid.NAMESPACE_DNS, f"{namespace}.{value}")
