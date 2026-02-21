"""
AWS Lambda / Yandex Cloud Functions handler для FastAPI приложения.

Handler: handler.handler
"""
import logging
from mangum import Mangum
from app.main import app
from app.config import settings

logger = logging.getLogger(__name__)


def _safe_headers_for_log(headers: dict) -> dict:
    """Копия заголовков с маскировкой Authorization для логов."""
    if not headers or not isinstance(headers, dict):
        return {}
    out = {}
    for k, v in headers.items():
        key = k.lower() if isinstance(k, str) else k
        if key == "authorization" and v:
            v = f"{str(v)[:15]}...{str(v)[-4:]}" if len(str(v)) > 25 else "***"
        out[k] = v
    return out


def _context_to_request_dict(context) -> dict | None:
    """Собирает словарь запроса из context (Yandex Cloud передаёт HTTP-данные в context)."""
    if not context:
        return None
    method = getattr(context, "httpMethod", None) or getattr(context, "method", None)
    headers = getattr(context, "headers", None)
    if method is None and headers is None:
        return None
    url = getattr(context, "url", "") or getattr(context, "path", "") or "/"
    params = getattr(context, "params", None) or getattr(context, "queryStringParameters", {}) or {}
    body = getattr(context, "body", "") or ""
    return {
        "httpMethod": method or "GET",
        "headers": headers if isinstance(headers, dict) else {},
        "url": url,
        "queryStringParameters": params,
        "body": body,
    }


def _to_aws_http_api_v2(event: dict, context) -> dict:
    """Преобразует событие Yandex Cloud / др. в формат AWS API Gateway HTTP API v2 для Mangum."""
    # Yandex Cloud: HTTP-запрос в context, в event только request_id, source, version_id
    req = _context_to_request_dict(context)
    if req:
        event = {**event, **req}
    # Или в event.http / event.request
    if isinstance(event.get("http"), dict):
        event = {**event, **event["http"]}
    if isinstance(event.get("request"), dict):
        event = {**event, **event["request"]}

    # Уже AWS HTTP API v2
    if event.get("version") == "2.0" and "requestContext" in event:
        return event

    http_method = event.get("httpMethod") or event.get("request_method") or event.get("method") or "GET"
    path = event.get("url") or event.get("path") or event.get("rawPath") or "/"
    # Если пришёл полный URL — оставляем только path
    if path.startswith("http://") or path.startswith("https://"):
        from urllib.parse import urlparse
        path = urlparse(path).path or "/"
    if "?" in path:
        path, raw_qs = path.split("?", 1)
    else:
        raw_qs = event.get("rawQueryString") or ""
    headers = event.get("headers") or {}
    if not isinstance(headers, dict):
        headers = dict(headers) if headers else {}
    # Заголовки в lowercase для ASGI
    headers = {k.lower() if isinstance(k, str) else k: v for k, v in headers.items()}
    body = event.get("body") or ""
    query = event.get("queryStringParameters") or {}
    if raw_qs and not query:
        query = dict(x.split("=", 1) for x in raw_qs.split("&") if "=" in x)
    if not isinstance(query, dict):
        query = dict(query) if query else {}

    # Yandex Cloud: путь может приходить первым в query (path=... или page=...)
    # Тогда считаем его путём, убираем из query и передаём остальные параметры в приложение
    path_from_query = None
    if query.get("path"):
        path_from_query = query.pop("path")
    elif (path == "/" or not path.strip()) and query.get("page"):
        path_from_query = query.pop("page")
    if path_from_query is not None:
        path = path_from_query if path_from_query.startswith("/") else "/" + path_from_query.lstrip("/")

    is_base64 = event.get("isBase64Encoded", False)

    # rawQueryString без path/page — только остальные параметры для приложения
    raw_qs = "&".join(f"{k}={v}" for k, v in query.items() if v) if query else ""

    return {
        "version": "2.0",
        "routeKey": "$default",
        "rawPath": path if path.startswith("/") else "/" + path,
        "rawQueryString": raw_qs,
        "headers": headers,
        "queryStringParameters": query or None,
        "requestContext": {
            "accountId": "000000000000",
            "apiId": "yc",
            "domainName": "functions.yandexcloud.net",
            "http": {
                "method": http_method,
                "path": path if path.startswith("/") else "/" + path,
                "protocol": "HTTP/1.1",
                "sourceIp": "127.0.0.1",
                "userAgent": headers.get("user-agent", ""),
            },
            "requestId": getattr(context, "request_id", "yc") if context else "yc",
            "time": "01/Jan/1970:00:00:00 +0000",
            "timeEpoch": 0,
        },
        "body": body,
        "isBase64Encoded": is_base64,
    }


_mangum = Mangum(
    app,
    lifespan="off",
    api_gateway_base_path=settings.API_GATEWAY_BASE_PATH or None,
)


def handler(event: dict, context):
    print("=== handler raw event ===")
    print(event)
    print("=== handler context ===")
    print(context)
    """Обёртка: конвертирует событие Yandex Cloud в AWS HTTP API v2, затем передаёт в Mangum."""
    ev = _to_aws_http_api_v2(event, context)
    print("=== handler converted event ===")
    print(ev)
    return _mangum(ev, context)
