# PowerShell скрипт для быстрого запуска Docker Compose

Write-Host "Запуск OmniActive Backend с Docker Compose..." -ForegroundColor Green
Write-Host ""

# Проверка наличия Docker
try {
    docker --version | Out-Null
    docker-compose --version | Out-Null
} catch {
    Write-Host "Ошибка: Docker или Docker Compose не установлены!" -ForegroundColor Red
    Write-Host "Установите Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Запуск контейнеров
Write-Host "Сборка и запуск контейнеров..." -ForegroundColor Cyan
docker-compose up -d --build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Контейнеры успешно запущены!" -ForegroundColor Green
    Write-Host ""
    Write-Host "API доступен на: http://localhost:8000" -ForegroundColor Yellow
    Write-Host "Документация: http://localhost:8000/docs" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Полезные команды:" -ForegroundColor Cyan
    Write-Host "  docker-compose logs -f api    - Просмотр логов API" -ForegroundColor White
    Write-Host "  docker-compose down           - Остановка контейнеров" -ForegroundColor White
    Write-Host "  docker-compose exec api bash  - Подключение к контейнеру" -ForegroundColor White
    Write-Host ""
    Write-Host "Просмотр логов..." -ForegroundColor Cyan
    Start-Sleep -Seconds 2
    docker-compose logs -f api
} else {
    Write-Host ""
    Write-Host "✗ Ошибка при запуске контейнеров!" -ForegroundColor Red
    Write-Host "Проверьте логи: docker-compose logs" -ForegroundColor Yellow
}
