# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.



## Настройка API URL

Для локального тестирования с бэкендом:

1. **Создайте `.env` файл** в корне проекта (скопируйте из `.env.example`):
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:8000
   ```

2. **Для разных платформ используйте разные URL:**
   - **iOS симулятор и веб**: `http://localhost:8000`
   - **Android эмулятор**: `http://10.0.2.2:8000`
   - **Физическое устройство**: `http://YOUR_LOCAL_IP:8000` (например `http://192.168.1.100:8000`)
     - Чтобы узнать IP: `ipconfig` (Windows) или `ifconfig` (Mac/Linux)

3. **Запустите бэкенд** (в папке `backend/`):
   ```bash
   docker-compose up -d
   ```

4. **Перезапустите Expo** после изменения `.env`:
   ```bash
   npx expo start --clear
   ```

## Команды

Выкатить апдейт:
```bash
eas update --branch preview --message "update 4"
```

Собрать APK файл:
```bash
eas build --platform android --profile apk
```