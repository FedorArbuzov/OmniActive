#!/usr/bin/env python3
"""
Скрипт для создания ZIP-архива и загрузки в Yandex Cloud S3 bucket
для деплоя Cloud Functions
"""
import os
import zipfile
import subprocess
import shutil
import tempfile
import boto3
from pathlib import Path

# Настройки S3
S3_ENDPOINT = 'https://storage.yandexcloud.net'
S3_BUCKET = 'testbackpython'

# Настройки сборки
BACKEND_DIR = './backend'
ZIP_FILENAME = 'function.zip'
S3_ACCESS_KEY = ''
S3_SECRET_KEY = ''
INSTALL_DEPENDENCIES = True  # Установить зависимости из requirements.txt в архив

def upload_zip_to_s3(zip_file, bucket_name):
    """
    Загружает ZIP-архив в S3 bucket
    """
    print(f"\n☁️ Загружаю {zip_file} в S3...")
    
    session = boto3.session.Session()
    s3_client = session.client(
        service_name='s3',
        endpoint_url=S3_ENDPOINT,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY
    )
    
    file_size = os.path.getsize(zip_file)
    zip_name = os.path.basename(zip_file)
    
    try:
        with open(zip_file, 'rb') as f:
            s3_client.put_object(
                Bucket=bucket_name,
                Key=zip_name,
                Body=f,
                ContentType='application/zip'
            )
        
        print(f"✅ Загружено: {zip_name} ({file_size / 1024 / 1024:.2f} MB)")
        print(f"\n🎯 Для Cloud Function укажите:")
        print(f"   Бакет: {bucket_name}")
        print(f"   Объект: {zip_name}")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка загрузки: {e}")
        return False


def main():
    print("🚀 Деплой backend в Yandex Cloud Functions")
    print("=" * 60)
    
    zip_path = './backend/lambda-deployment.zip'

    # Загружаем в S3
    success = upload_zip_to_s3(zip_path, S3_BUCKET)
    
    if success:
        print("\n" + "=" * 60)
        print("✨ Деплой завершен успешно!")
        print(f"   Точка входа: handler.handler")
    else:
        print("\n❌ Деплой завершен с ошибками")


if __name__ == '__main__':
    main()
