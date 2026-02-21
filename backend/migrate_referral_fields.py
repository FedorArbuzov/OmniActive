"""
Миграция для добавления реферальных полей в таблицу users
и генерации реферальных кодов для существующих пользователей.

Запуск:
    python migrate_referral_fields.py

Или через Docker:
    docker-compose exec api python migrate_referral_fields.py
"""
import sys
from sqlalchemy import text, inspect
from sqlalchemy.exc import OperationalError
from app.database import engine, SessionLocal
from app.models import User
import secrets
import string
import uuid


def generate_referral_code(db, length: int = 8) -> str:
    """
    Генерирует уникальный реферальный код.
    Использует буквы и цифры, исключая похожие символы (0, O, 1, I, l).
    """
    alphabet = string.ascii_uppercase.replace('O', '').replace('I', '') + string.digits.replace('0', '').replace('1', '')
    
    max_attempts = 100
    for _ in range(max_attempts):
        code = ''.join(secrets.choice(alphabet) for _ in range(length))
        # Проверяем уникальность
        existing = db.query(User).filter(User.referral_code == code).first()
        if not existing:
            return code
    
    # Если не удалось сгенерировать за 100 попыток, используем UUID
    return str(uuid.uuid4())[:length].upper().replace('-', '')


def column_exists(conn, table_name: str, column_name: str) -> bool:
    """Проверяет существование колонки в таблице"""
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def index_exists(conn, table_name: str, index_name: str) -> bool:
    """Проверяет существование индекса"""
    inspector = inspect(conn)
    indexes = inspector.get_indexes(table_name)
    return any(idx['name'] == index_name for idx in indexes)


def add_column_if_not_exists(conn, table_name: str, column_name: str, column_type: str, **kwargs):
    """Добавляет колонку если её нет"""
    if column_exists(conn, table_name, column_name):
        print(f"  Колонка {column_name} уже существует, пропускаем")
        return False
    
    # Формируем SQL для добавления колонки
    sql_parts = [f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"]
    
    if 'nullable' in kwargs and not kwargs['nullable']:
        sql_parts.append("NOT NULL")
    elif 'nullable' not in kwargs or kwargs['nullable']:
        sql_parts.append("NULL")
    
    if 'unique' in kwargs and kwargs['unique']:
        sql_parts.append("UNIQUE")
    
    sql = " ".join(sql_parts)
    
    try:
        # Добавляем колонку
        conn.execute(text(sql))
        
        # Создаём индекс отдельно, если требуется
        if 'index' in kwargs and kwargs['index']:
            index_name = f"ix_{table_name}_{column_name}"
            if not index_exists(conn, table_name, index_name):
                index_sql = f"CREATE INDEX {index_name} ON {table_name} ({column_name})"
                try:
                    conn.execute(text(index_sql))
                    print(f"  ✓ Индекс {index_name} создан")
                except Exception as idx_error:
                    print(f"  Предупреждение: не удалось создать индекс {index_name}: {idx_error}")
            else:
                print(f"  Индекс {index_name} уже существует, пропускаем")
        
        # commit выполняется в вызывающем коде через транзакцию
        print(f"  ✓ Колонка {column_name} добавлена")
        return True
    except Exception as e:
        print(f"  ✗ Ошибка при добавлении колонки {column_name}: {e}")
        raise


def add_foreign_key_if_not_exists(conn, table_name: str, column_name: str, referenced_table: str, referenced_column: str):
    """Добавляет внешний ключ если его нет"""
    # Проверяем существование внешнего ключа
    inspector = inspect(conn)
    foreign_keys = inspector.get_foreign_keys(table_name)
    
    fk_exists = any(
        fk['constrained_columns'] == [column_name] and 
        fk['referred_table'] == referenced_table and
        fk['referred_columns'] == [referenced_column]
        for fk in foreign_keys
    )
    
    if fk_exists:
        print(f"  Внешний ключ для {column_name} уже существует, пропускаем")
        return False
    
    constraint_name = f"fk_{table_name}_{column_name}_{referenced_table}"
    sql = f"""
    ALTER TABLE {table_name} 
    ADD CONSTRAINT {constraint_name} 
    FOREIGN KEY ({column_name}) 
    REFERENCES {referenced_table}({referenced_column})
    """
    
    try:
        conn.execute(text(sql))
        # commit выполняется в вызывающем коде через транзакцию
        print(f"  ✓ Внешний ключ для {column_name} добавлен")
        return True
    except Exception as e:
        print(f"  ✗ Ошибка при добавлении внешнего ключа для {column_name}: {e}")
        raise


def migrate():
    """Выполняет миграцию"""
    print("=" * 60)
    print("Миграция: Добавление реферальных полей")
    print("=" * 60)
    
    # Используем connection для DDL операций
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # Шаг 1: Добавление колонки referral_code
            print("\n1. Проверка и добавление колонки referral_code...")
            add_column_if_not_exists(
                conn, 
                "users", 
                "referral_code", 
                "VARCHAR(20)",
                nullable=True,
                unique=True,
                index=True
            )
            
            # Шаг 2: Добавление колонки referred_by_id
            print("\n2. Проверка и добавление колонки referred_by_id...")
            add_column_if_not_exists(
                conn,
                "users",
                "referred_by_id",
                "UUID",
                nullable=True
            )
            
            # Шаг 3: Добавление внешнего ключа для referred_by_id
            print("\n3. Проверка и добавление внешнего ключа для referred_by_id...")
            add_foreign_key_if_not_exists(conn, "users", "referred_by_id", "users", "id")
            
            trans.commit()
        except Exception as e:
            trans.rollback()
            print(f"\n✗ Ошибка при выполнении DDL операций: {e}")
            raise
    
    # Используем сессию для ORM операций
    db = SessionLocal()
    try:
        # Шаг 4: Генерация реферальных кодов для существующих пользователей
        print("\n4. Генерация реферальных кодов для существующих пользователей...")
        users_without_code = db.query(User).filter(User.referral_code.is_(None)).all()
        
        if not users_without_code:
            print("  Все пользователи уже имеют реферальные коды")
        else:
            print(f"  Найдено пользователей без кода: {len(users_without_code)}")
            updated_count = 0
            
            for user in users_without_code:
                try:
                    code = generate_referral_code(db)
                    user.referral_code = code
                    db.commit()
                    updated_count += 1
                    if updated_count % 10 == 0:
                        print(f"  Обработано: {updated_count}/{len(users_without_code)}")
                except Exception as e:
                    db.rollback()
                    print(f"  ✗ Ошибка при генерации кода для пользователя {user.id}: {e}")
            
            print(f"  ✓ Сгенерировано реферальных кодов: {updated_count}")
        
        # Шаг 5: Статистика
        print("\n5. Статистика:")
        total_users = db.query(User).count()
        users_with_code = db.query(User).filter(User.referral_code.isnot(None)).count()
        users_with_referrer = db.query(User).filter(User.referred_by_id.isnot(None)).count()
        
        print(f"  Всего пользователей: {total_users}")
        print(f"  Пользователей с реферальным кодом: {users_with_code}")
        print(f"  Пользователей с реферером: {users_with_referrer}")
        
        print("\n" + "=" * 60)
        print("Миграция успешно завершена!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Ошибка при выполнении миграции: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
