# PowerShell скрипт для деплоя в AWS Lambda (Windows)

Write-Host "Установка зависимостей..." -ForegroundColor Green
pip install -r requirements.txt -t .

Write-Host "Создание ZIP архива..." -ForegroundColor Green
Compress-Archive -Path * -DestinationPath lambda-deployment.zip -Force

Write-Host "ZIP архив создан: lambda-deployment.zip" -ForegroundColor Green
Write-Host ""
Write-Host "Для загрузки в Lambda выполните:" -ForegroundColor Yellow
Write-Host "aws lambda update-function-code --function-name omniactive-api --zip-file fileb://lambda-deployment.zip" -ForegroundColor Cyan
