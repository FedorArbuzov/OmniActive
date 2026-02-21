#!/bin/bash
# Деплой в serverless (AWS Lambda, Yandex Cloud Functions и т.п.)
#
# Обычный режим: ./deploy.sh
#   — ставит зависимости в текущий каталог и кладёт в zip код + зависимости (архив большой).
#
# Режим slim (для лимита 4 MB, например Yandex Cloud): ./deploy.sh slim
#   — в zip только handler.py, app/ и requirements.txt; зависимости НЕ включаются.
#   — облако само установит пакеты из requirements.txt при сборке.


zip -r lambda-deployment.zip . \
    -x "*.git*" \
    -x "*.env*" \
    -x "__pycache__/*" \
    -x "*.pyc" \
    -x "*.pyo" \
    -x "*.pyd" \
    -x "*.so" \
    -x "*.egg-info/*" \
    -x "deploy.sh" \
    -x "deploy.ps1" \
    -x "README.md" \
    -x ".gitignore" \
    -x "lambda-deployment.zip" \
    -x "init_db.py"

echo "ZIP архив создан: lambda-deployment.zip"