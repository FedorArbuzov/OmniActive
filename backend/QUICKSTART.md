# Быстрый старт с Docker

## Требования

- Docker Desktop (Windows/Mac) или Docker + Docker Compose (Linux)
- Минимум 2GB свободной RAM

## Запуск

### Windows (PowerShell)
```powershell
.\docker-start.ps1
```

### Linux/Mac (Bash)
```bash
chmod +x docker-start.sh
./docker-start.sh
```

### Или вручную
```bash
docker-compose up -d --build
```

## Проверка работы

1. Откройте браузер: http://localhost:8000
2. Документация API: http://localhost:8000/docs
3. Проверка здоровья: http://localhost:8000/health

## Первые шаги

1. **Зарегистрируйте пользователя:**
   ```bash
   curl -X POST http://localhost:8000/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "password": "password123"}'
   ```

2. **Войдите в систему:**
   ```bash
   curl -X POST http://localhost:8000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "password": "password123"}'
   ```

3. **Скопируйте токен из ответа и используйте его в заголовке:**
   ```bash
   curl -X GET http://localhost:8000/workouts \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

## Полезные команды

```bash
# Просмотр логов
docker-compose logs -f api

# Остановка
docker-compose down

# Перезапуск
docker-compose restart

# Подключение к контейнеру
docker-compose exec api bash

# Подключение к БД
docker-compose exec db psql -U omniactive_user -d omniactive_db
```

## Остановка и очистка

```bash
# Остановка контейнеров
docker-compose down

# Остановка и удаление данных БД
docker-compose down -v
```

## Troubleshooting

**Порт 8000 занят?**
Измените порт в `docker-compose.yml`:
```yaml
ports:
  - "8001:8000"  # Используйте другой порт
```

**Ошибка подключения к БД?**
Убедитесь, что контейнер БД запущен:
```bash
docker-compose ps
```

**Нужно пересоздать БД?**
```bash
docker-compose down -v
docker-compose up -d
```
