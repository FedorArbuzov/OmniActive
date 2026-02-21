#!/bin/bash
# Bash скрипт для быстрого запуска Docker Compose

echo "Запуск OmniActive Backend с Docker Compose..."
echo ""

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "Ошибка: Docker не установлен!"
    echo "Установите Docker: https://www.docker.com/get-started"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Ошибка: Docker Compose не установлен!"
    exit 1
fi

# Запуск контейнеров
echo "Сборка и запуск контейнеров..."
docker-compose up -d --build

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Контейнеры успешно запущены!"
    echo ""
    echo "API доступен на: http://localhost:8000"
    echo "Документация: http://localhost:8000/docs"
    echo ""
    echo "Полезные команды:"
    echo "  docker-compose logs -f api    - Просмотр логов API"
    echo "  docker-compose down           - Остановка контейнеров"
    echo "  docker-compose exec api bash  - Подключение к контейнеру"
    echo ""
    echo "Просмотр логов..."
    sleep 2
    docker-compose logs -f api
else
    echo ""
    echo "✗ Ошибка при запуске контейнеров!"
    echo "Проверьте логи: docker-compose logs"
fi
