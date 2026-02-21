"""
Главный файл FastAPI приложения
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from app.config import settings
from app.routers import (
    auth,
    workouts,
    exercise_results,
    dishes,
    food_log,
    profile,
    steps,
    workout_sessions,
    activity_settings,
    achievements,
    custom_workout_plans,
)

# Создаём приложение FastAPI
app = FastAPI(
    title="OmniActive API",
    description="API для приложения OmniActive",
    version="1.0.0"
)

# Настройка CORS (явные origins обязательны при allow_credentials=True — иначе браузер блокирует запрос после OPTIONS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Подключаем роутеры
app.include_router(auth.router)
app.include_router(workouts.router)
app.include_router(exercise_results.router)
app.include_router(dishes.router)
app.include_router(food_log.router)
app.include_router(profile.router)
app.include_router(steps.router)
app.include_router(workout_sessions.router)
app.include_router(activity_settings.router)
app.include_router(achievements.router)
app.include_router(custom_workout_plans.router)


# Swagger UI по ?page=docs (когда путь /docs не проксируется, напр. Yandex Cloud)
SWAGGER_HTML = """
<!DOCTYPE html>
<html>
<head>
  <title>OmniActive API — Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: "?openapi=json",
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset]
    });
  </script>
</body>
</html>
"""


@app.get("/")
async def root(request: Request):
    """Корневой эндпоинт. ?page=docs — Swagger UI, ?openapi=json — схема OpenAPI."""
    q = request.query_params
    if q.get("openapi") == "json":
        return JSONResponse(content=app.openapi())
    if q.get("page") == "docs":
        return HTMLResponse(content=SWAGGER_HTML)
    return JSONResponse(
        content={
            "message": "OmniActive API",
            "version": "1.0.0",
            "docs": "?page=docs",
        }
    )


@app.get("/health")
async def health_check():
    """Проверка здоровья API"""
    return {"status": "ok"}
