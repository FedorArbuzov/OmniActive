#!/usr/bin/env python3
"""
Скрипт для загрузки build файлов в Yandex Cloud S3 bucket
"""
import os
import mimetypes
import boto3
from pathlib import Path

# Настройки S3
S3_ENDPOINT = 'https://storage.yandexcloud.net'
S3_ACCESS_KEY = ''
S3_SECRET_KEY = ''
S3_BUCKET = 'testbackpython'
S3_PREFIX = ''  # Префикс для файлов в bucket (например, admin/)

# Директория с build файлами
BUILD_DIR = './backend'


def get_content_type(file_path):
    """Определяет Content-Type для файла"""
    content_type, _ = mimetypes.guess_type(file_path)
    if content_type:
        return content_type
    
    # Дополнительные типы
    ext = os.path.splitext(file_path)[1].lower()
    types_map = {
        '.js': 'application/javascript',
        '.py': 'application/python',
        '.css': 'text/css',
        '.html': 'text/html',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.eot': 'application/vnd.ms-fontobject',
    }
    return types_map.get(ext, 'application/octet-stream')


def upload_directory_to_s3(local_directory, bucket_name, s3_prefix=''):
    """
    Загружает все файлы из директории в S3 bucket с сохранением структуры
    """
    # Инициализация S3 клиента
    session = boto3.session.Session()
    s3_client = session.client(
        service_name='s3',
        endpoint_url=S3_ENDPOINT,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY
    )
    
    local_path = Path(local_directory)
    
    if not local_path.exists():
        print(f"❌ Ошибка: директория {local_directory} не найдена!")
        return
    
    # Собираем все файлы
    files_to_upload = []
    for root, dirs, files in os.walk(local_directory):
        for file in files:
            local_file = os.path.join(root, file)
            # Относительный путь от BUILD_DIR
            relative_path = os.path.relpath(local_file, local_directory)
            # Ключ в S3 (с префиксом)
            s3_key = os.path.join(s3_prefix, relative_path).replace('\\', '/')
            files_to_upload.append((local_file, s3_key))
    
    print(f"📦 Найдено файлов для загрузки: {len(files_to_upload)}")
    print(f"🎯 Target bucket: {bucket_name}")
    print(f"📁 Префикс в S3: {s3_prefix or '(корень bucket)'}")
    print("-" * 60)
    
    # Загружаем файлы
    uploaded = 0
    failed = 0
    
    for local_file, s3_key in files_to_upload:
        try:
            content_type = get_content_type(local_file)
            file_size = os.path.getsize(local_file)
            
            # Загружаем файл
            with open(local_file, 'rb') as f:
                s3_client.put_object(
                    Bucket=bucket_name,
                    Key=s3_key,
                    Body=f,
                    ACL='public-read',
                    ContentType=content_type
                )
            
            uploaded += 1
            size_kb = file_size / 1024
            print(f"✅ {s3_key} ({size_kb:.2f} KB, {content_type})")
            
        except Exception as e:
            failed += 1
            print(f"❌ Ошибка при загрузке {s3_key}: {e}")
    
    print("-" * 60)
    print(f"✨ Загрузка завершена!")
    print(f"   Успешно: {uploaded}")
    print(f"   Ошибок: {failed}")
    
    if uploaded > 0:
        print(f"\n🌐 Доступ к файлам:")
        print(f"   https://storage.yandexcloud.net/{bucket_name}/{s3_prefix}")


if __name__ == '__main__':
    print("🚀 Начинаю загрузку build файлов в S3...")
    print()
    upload_directory_to_s3(BUILD_DIR, S3_BUCKET, S3_PREFIX)
