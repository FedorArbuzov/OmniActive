"""
Настройка подключения к базе данных
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings, IS_LAMBDA

# Параметры пула: в Lambda меньше соединений и переподключение, чтобы не исчерпать RDS и не держать «мёртвые» соединения
_engine_kwargs: dict = {
    "pool_pre_ping": True,
    "echo": False,
}
if IS_LAMBDA:
    _engine_kwargs["pool_size"] = 1
    _engine_kwargs["max_overflow"] = 2
    _engine_kwargs["pool_recycle"] = 60  # переподключение раз в минуту
else:
    _engine_kwargs["pool_size"] = 5
    _engine_kwargs["max_overflow"] = 10

# Yandex Cloud и др. часто отдают postgres:// — SQLAlchemy 2.x ожидает postgresql://
_db_url = settings.DATABASE_URL
if _db_url and _db_url.startswith("postgres://"):
    _db_url = "postgresql://" + _db_url[11:]

engine = create_engine(_db_url, **_engine_kwargs)

# Создаём фабрику сессий
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Базовый класс для моделей
Base = declarative_base()


def get_db():
    """
    Dependency для получения сессии БД
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
