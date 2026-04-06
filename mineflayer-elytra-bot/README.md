# Mineflayer Elytra Patrol Bot (Scaffold v0.3)

Скелет автономного Mineflayer-бота под задачу:
- полёт на элитрах,
- патруль в зоне `-3000..3000` по X/Z,
- смешанные траектории (random/circle/spiral/mixed),
- избегание враждебных игроков в радиусе 15 блоков,
- телеметрия в NDJSON/TXT/Java-snapshot/Webhook,
- учёт latency 150ms+ и anti-kick пульсы.

## Важно про Baritone

`cabaletta/baritone` — это Java-мод/библиотека для Minecraft-клиента, и он действительно имеет команду `#elytra` для элитр (см. README проекта).
Но этот репозиторий — **Node.js + Mineflayer** бот, поэтому Baritone не подключается сюда «как npm пакет» напрямую.

## Локальный запуск прямо сейчас (твой кейс)

Цель: локальный мир, версия `1.21.5`, ник бота `noutiisL`, auth `offline`.

1. В Minecraft открой мир в LAN и включи `Allow Cheats`.
2. Убедись, что порт LAN известен (например `localhost:5xxxx`).
3. В проекте:

```bash
cd mineflayer-elytra-bot
cp config.local.json.example config.local.json
npm install
npm run check
npm start
```

4. Если LAN-порт не `25565`, исправь `server.port` в `config.local.json`.

## Используемые Prismarine-компоненты

- `mineflayer` — основной бот.
- `mineflayer-pathfinder` — fallback-перемещение и Goal API.
- `prismarine-chunk` — подключено в safety/планировщике как база для chunk-aware логики.
- `prismarine-physics` — используется для параметров физики и safety-адаптера.

## Конфиг

Создайте `config.local.json` рядом с `package.json` (или используй `.example`).

```json
{
  "server": {
    "host": "localhost",
    "port": 25565,
    "version": "1.21.5",
    "username": "noutiisL"
  },
  "auth": { "method": "offline" },
  "patrol": {
    "mode": "mixed",
    "bounds": { "minX": -3000, "maxX": 3000, "minZ": -3000, "maxZ": 3000 }
  },
  "flight": { "hostileKeepoutDistance": 15 },
  "network": { "assumedPingMs": 150 },
  "telemetry": {
    "file": { "enabled": true, "path": "./telemetry.ndjson" },
    "text": { "enabled": true, "path": "./telemetry.txt" },
    "javaSnapshot": { "enabled": true, "path": "./BotStateSnapshot.java" }
  }
}
```

## Поведение v0.3

- Бот генерирует waypoint’ы в пределах зоны и летит по ним.
- При игроке ближе 15 блоков уходит в эвэйд и запоминает ник в hostile-memory.
- Когда игрок исчезает из видимости, бот возвращается к патрулю.
- Телеметрия обновляется в реальном времени в файл(ы).

## Что дописать в первую очередь

1. Реальный 3D A*/hybrid planner для воздуха + полноценный raycast scoring.
2. Полная экипировка элитры/фейерверков/ремонт и контроль durability.
3. Нормальный PvP/defense модуль (сейчас приоритет — escape/evasion).
4. Отдельный режим трекинга наземных игроков с предсказанием траектории.
