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

### Где управление элитрой лучше?

- **Прямо сейчас лучше в Baritone**: у него зрелее реальная полётная логика и больше проверенных в бою edge-case обработок.
- **В этом репозитории лучше контроль над кастомной автономкой**: проще жёстко прошить твои правила (радиус ±3000, keepout 15, hostile-memory, формат телеметрии).
- Практический вывод: для «завести быстро и лететь» — Baritone сильнее; для «свой headless-бот с кастомным FSM» — наш подход правильный, но его ещё нужно дорабатывать до уровня Baritone.

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

После запуска бот **по умолчанию на паузе**, чтобы ты успел выдать ресурсы.
Команды в консоли процесса:

- `start` — включить автопилот;
- `pause` — пауза автопилота;
- `status` — текущий статус;
- `keepout 15` — изменить дистанцию избегания;
- `help` — показать команды.

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

## Что уже сделано из parity-плана

- Goal/process контур с приоритетами (`Evade > Recovery > Track > Patrol`).
- Разделение на observer/planner/executor loops.
- Segment-based executor с timeout, backtrack и recovery-стратегиями.
- Runtime-команда в консоли `keepout <distance>` для быстрой смены дистанции избегания.
- 3D A*/Hybrid-подобный planner с cost map (distance + hazard + chunk reliability penalties).
- Rich observer: hazard layers + chunk reliability scoring.

## Parity план с Baritone

См. отдельный документ: `BARITONE_PARITY_PLAN_RU.md` — какие модули/поведение позаимствовать,
чтобы приблизиться к уровню Baritone по устойчивости и качеству маршрутизации.
