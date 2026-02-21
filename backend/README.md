# OmniActive Backend API

FastAPI приложение для AWS Lambda с полным набором эндпоинтов для мобильного приложения OmniActive.

## Структура проекта

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # Главный файл FastAPI
│   ├── config.py            # Конфигурация
│   ├── database.py          # Настройка БД
│   ├── models.py             # SQLAlchemy модели
│   ├── schemas.py            # Pydantic схемы
│   ├── auth.py               # Авторизация и JWT
│   └── routers/              # Роутеры для эндпоинтов
│       ├── auth.py
│       ├── workouts.py
│       ├── exercise_results.py
│       ├── dishes.py
│       ├── food_log.py
│       ├── profile.py
│       ├── steps.py
│       ├── workout_sessions.py
│       └── activity_settings.py
├── handler.py                # Lambda handler
├── requirements.txt           # Зависимости
└── README.md
```

## Установка

1. Установите зависимости:
```bash
pip install -r requirements.txt
```

2. Настройте переменные окружения (создайте `.env` файл):
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=10080
CORS_ORIGINS=["*"]
```

## Локальный запуск

### Вариант 1: Docker Compose (рекомендуется)

Самый простой способ запустить всё локально:

```bash
# Запуск всех сервисов (PostgreSQL + API)
docker-compose up -d

# Просмотр логов
docker-compose logs -f api

# Остановка
docker-compose down
```

После запуска:
- API доступен на `http://localhost:8000`
- Документация: `http://localhost:8000/docs`
- PostgreSQL доступен на `localhost:5432`

**Полезные команды:**
```bash
# Пересборка и запуск
docker-compose up -d --build

# Подключение к контейнеру API
docker-compose exec api bash

# Подключение к базе данных
docker-compose exec db psql -U omniactive_user -d omniactive_db

# Инициализация БД (если нужно)
docker-compose exec api python init_db.py

# Остановка и удаление volumes
docker-compose down -v
```

**Использование Makefile (опционально):**
```bash
make start      # Сборка и запуск
make logs       # Просмотр логов API
make shell      # Подключение к контейнеру
make db-shell   # Подключение к БД
make clean      # Остановка и очистка
```

### Вариант 2: Локально без Docker

Для локального тестирования можно использовать uvicorn:

1. Установите PostgreSQL локально
2. Создайте базу данных:
```bash
createdb omniactive_db
```

3. Настройте `.env` файл с правильным DATABASE_URL

4. Установите зависимости:
```bash
pip install -r requirements.txt
```

5. Создайте таблицы:
```bash
python init_db.py
```

6. Запустите сервер:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Деплой в AWS Lambda

1. Упакуйте зависимости (в каталоге `backend`):
```bash
pip install -r requirements.txt -t .
```

2. Создайте ZIP архив (включает `handler.py` и пакет `app`):
```bash
zip -r lambda-deployment.zip . -x "*.git*" "*.env*" "__pycache__/*" "*.pyc" "*.pyo" "deploy.sh" "README.md" "init_db.py"
```

3. В настройках функции Lambda укажите:
   - **Handler:** `handler.handler` (файл `handler.py`, функция `handler`)
   - **Runtime:** Python 3.11 или 3.12
   - **Timeout:** не менее 30 секунд (для запросов к БД)
   - **Переменные окружения:**
     - `DATABASE_URL` — строка подключения к PostgreSQL (RDS/VPC)
     - `SECRET_KEY` — секрет для JWT
     - `ACCESS_TOKEN_EXPIRE_MINUTES` — срок жизни токена (по умолчанию 10080)
     - `CORS_ORIGINS` — JSON-массив разрешённых origins, например `["https://your-app.com"]`
     - `API_GATEWAY_BASE_PATH` — необязательно; укажите, если в URL есть префикс стадии (например `/prod`)

4. Загрузите код в Lambda:
```bash
aws lambda update-function-code \
  --function-name omniactive-api \
  --zip-file fileb://lambda-deployment.zip
```

5. Настройте API Gateway (HTTP API или REST API с proxy integration) так, чтобы все запросы к API шли в эту Lambda. Mangum преобразует события API Gateway в вызовы FastAPI.

В Lambda автоматически используется уменьшенный пул подключений к БД (1–2 соединения и переподключение раз в 60 с), чтобы не исчерпать лимиты RDS при масштабировании.

## Деплой в Yandex Cloud Functions (лимит 4 MB на архив)

Если у облака лимит на размер архива (например 4 MB), зависимости в zip класть не нужно — платформа установит их из `requirements.txt` при сборке.

Соберите **только код** (режим slim):

```bash
./deploy.sh slim
```

В `lambda-deployment.zip` попадут только `handler.py`, каталог `app/` и `requirements.txt`. Загрузите этот архив в функцию; зависимости подтянутся при сборке. Handler укажите как у точки входа (например `handler.handler` для вызова функции `handler` из файла `handler.py`).

## Создание таблиц в Yandex Cloud (отдельная функция)

Если в БД нет таблиц (ошибка `relation "users" does not exist`), разверните **вторую** Cloud Function с тем же кодом (тот же zip, что и у API):

1. Создайте новую функцию в том же каталоге.
2. Загрузите тот же `lambda-deployment.zip` (собранный `./deploy.sh slim`).
3. Укажите **Handler:** `init_db_handler.handler`.
4. Задайте те же переменные окружения, что и у основной функции (обязательно **DATABASE_URL**).
5. Один раз вызовите функцию (вкладка «Тестирование» → «Запустить тест» или HTTP-триггер).

Функция выполнит `Base.metadata.create_all()` и создаст все таблицы. После этого основная API-функция сможет работать с БД.

## Миграция реферальных полей

Для добавления реферальных полей (`referral_code` и `referred_by_id`) в таблицу `users` и генерации кодов для существующих пользователей:

### Локально:

```bash
python migrate_referral_fields.py
```

Или через Docker:

```bash
docker-compose exec api python migrate_referral_fields.py
```

### В Yandex Cloud:

1. Создайте новую Cloud Function с тем же кодом (тот же zip, что и у API).
2. Загрузите `lambda-deployment.zip` (собранный `./deploy.sh slim`).
3. Укажите **Handler:** `migrate_referral_handler.handler`.
4. Задайте те же переменные окружения, что и у основной функции (обязательно **DATABASE_URL**).
5. Один раз вызовите функцию (вкладка «Тестирование» → «Запустить тест» или HTTP-триггер).

Миграция:
- Добавит колонки `referral_code` и `referred_by_id` если их нет
- Сгенерирует уникальные реферальные коды для всех пользователей без кода
- Безопасна для повторного запуска (idempотентна)

## Эндпоинты

### Авторизация
- `POST /auth/register` - Регистрация
- `POST /auth/login` - Вход

### Тренировки
- `GET /workouts` - Список тренировок
- `GET /workouts/{id}` - Получить тренировку
- `PUT /workouts/{id}` - Создать/обновить тренировку
- `DELETE /workouts/{id}` - Удалить тренировку

### Результаты упражнений
- `POST /exercise-results` - Сохранить результат
- `GET /exercise-results` - Список результатов

### Блюда
- `GET /dishes` - Список блюд
- `GET /dishes/{id}` - Получить блюдо
- `PUT /dishes/{id}` - Создать/обновить блюдо
- `DELETE /dishes/{id}` - Удалить блюдо

### Дневник питания
- `POST /food-log` - Добавить запись
- `GET /food-log` - Список записей
- `DELETE /food-log/{id}` - Удалить запись

### Профиль
- `GET /profile` - Получить профиль
- `PUT /profile` - Обновить профиль

### Шаги
- `POST /steps` - Сохранить шаги
- `GET /steps` - Список записей шагов

### Сессии тренировок
- `POST /workout-sessions` - Сохранить сессию
- `GET /workout-sessions` - Список сессий

### Настройки активности
- `GET /activity-settings/mode` - Получить режим
- `PUT /activity-settings/mode` - Установить режим
- `GET /activity-settings/fixed-pal` - Получить фиксированный PAL
- `PUT /activity-settings/fixed-pal` - Установить фиксированный PAL
- `GET /activity-settings/daily-log` - Получить лог активности
- `POST /activity-settings/daily-log` - Сохранить активность за дату
- `GET /activity-settings/daily-pal` - Получить PAL за дату

## Авторизация

Все эндпоинты (кроме `/auth/*`) требуют JWT токен в заголовке:
```
Authorization: Bearer <token>
```

## База данных

Приложение использует PostgreSQL. Убедитесь, что:
1. База данных создана
2. Таблицы созданы через миграции или вручную по моделям из `app/models.py`
3. DATABASE_URL настроен правильно

## Документация API

После запуска приложения документация доступна по адресу:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Тестирование API

После запуска через Docker Compose:

1. Откройте документацию: `http://localhost:8000/docs`
2. Зарегистрируйте пользователя через `/auth/register`
3. Войдите через `/auth/login` и скопируйте токен
4. Используйте токен для авторизации в других запросах

Или используйте файл `test_api.http` с примерами запросов (требуется расширение REST Client для VS Code).

## Hot Reload

При использовании Docker Compose в режиме разработки изменения в коде автоматически применяются благодаря volume mount (`./app:/app/app`). Просто сохраните файл и изменения применятся автоматически.

## Переменные окружения для Docker

Все переменные окружения настраиваются в `docker-compose.yml`. Для production используйте `docker-compose.prod.yml` и настройте переменные через `.env` файл или переменные окружения системы.
