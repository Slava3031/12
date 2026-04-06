# Mineflayer Elytra Patrol Bot (Scaffold)

Скелет автономного Mineflayer-бота под задачу:
- полёт на элитрах,
- патруль по waypoints/кольцу,
- зачатки обхода препятствий (дальше дописывается в `RoutePlanner3D`),
- телеметрия в NDJSON/Webhook,
- учёт latency (150ms+) через lead-ticks.

## Быстрый старт

```bash
cd mineflayer-elytra-bot
npm install
npm run check
npm start
```

## Конфиг

Создайте `config.local.json` рядом с `package.json`.
Пример:

```json
{
  "server": {
    "host": "2b2t.org",
    "port": 25565,
    "username": "YourBot"
  },
  "network": {
    "assumedPingMs": 150
  },
  "telemetry": {
    "file": { "enabled": true, "path": "./telemetry.ndjson" },
    "webhook": { "enabled": false, "url": "" }
  }
}
```

## Архитектура

- `src/index.js` — оркестратор цикла бота.
- `src/controllers/ElytraController.js` — yaw/pitch и режимы cruise/recovery.
- `src/controllers/PatrolController.js` — управление waypoint-патрулём.
- `src/controllers/TargetTracker.js` — трекинг игроков.
- `src/planner/RoutePlanner3D.js` — скелет 3D planner (сюда встраивается полноценный obstacle avoidance).
- `src/telemetry/*` — поток статусов/ошибок/событий.

## Что дописать в первую очередь

1. Реальный 3D A*/hybrid planner для воздуха + оценка препятствий по лучам.
2. Автоэкипировка элитр/фейерверков + контроль прочности.
3. Полноценный recovery FSM (stall, lagback, chunk gaps, collision).
4. Раздельные режимы: patrol / pursue / evade / return-to-route.

## Примечание

Это именно **инженерный скелет**, а не готовый production-бот.
