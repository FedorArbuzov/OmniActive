# OTA-обновления (без публикации в сторах)

Обновления по воздуху в Expo делаются через **EAS Update**. Пользователи получают новый JS-код и ассеты без загрузки новой версии из App Store / Google Play.

## Ограничения

- **Можно обновлять по OTA:** JS, стили, картинки, конфиг (всё, что не нативный код).
- **Нельзя:** менять нативный код, добавлять права, менять версию SDK — для этого нужен новый билд и публикация в сторах.

## Шаги

### 1. Установить зависимости

```bash
npx expo install expo-updates
```

### 2. Настроить проект в EAS

```bash
npm install -g eas-cli
eas login
eas update:configure
```

Команда `eas update:configure` создаст/обновит `app.json` (поле `expo.updates.url`) и привяжет проект к вашему аккаунту Expo.

### 3. Собрать приложение через EAS (один раз)

Чтобы OTA заработало, приложение должно быть собрано с `expo-updates`:

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

Эти билды нужно загрузить в сторы как обычно. Дальнейшие правки только в JS/ассетах можно раздавать через EAS Update.

### 4. Публиковать обновления

После правок в коде:

```bash
eas update --channel production --message "Описание изменений"
```

Пользователи с установленной версией приложения при следующем запуске (или при повторном открытии) получат этот обновление.

### 5. (Опционально) Скрипт в package.json

В `package.json` можно добавить:

```json
"scripts": {
  "update:production": "eas update --channel production --message",
  "update:preview": "eas update --channel preview --message"
}
```

Использование:

```bash
npm run update:production -- "Исправлен баг на экране тренировки"
```

## runtimeVersion в app.json

В проекте уже задано:

```json
"runtimeVersion": { "policy": "appVersion" }
```

Так одна версия приложения (например, 1.0.0) получает только обновления, собранные для этой же версии. После повышения версии в сторах (например, до 1.0.1) нужно публиковать обновления уже для новой версии.

Подробнее: [EAS Update — документация Expo](https://docs.expo.dev/eas-update/introduction/).
