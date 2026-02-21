.PHONY: build up down restart logs shell db-shell init-db test clean

# Сборка и запуск контейнеров
build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

restart:
	docker-compose restart

# Просмотр логов
logs:
	docker-compose logs -f api

logs-db:
	docker-compose logs -f db

# Подключение к контейнеру API
shell:
	docker-compose exec api bash

# Подключение к базе данных
db-shell:
	docker-compose exec db psql -U omniactive_user -d omniactive_db

# Инициализация базы данных
init-db:
	docker-compose exec api python init_db.py

# Запуск всех сервисов
start: build up
	@echo "Ожидание готовности сервисов..."
	@sleep 5
	@echo "API доступен на http://localhost:8000"
	@echo "Документация: http://localhost:8000/docs"

# Остановка и удаление контейнеров и volumes
clean:
	docker-compose down -v
	docker system prune -f

# Перезапуск с пересборкой
rebuild: down build up

# Просмотр статуса
status:
	docker-compose ps
