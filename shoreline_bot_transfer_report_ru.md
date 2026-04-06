# Shoreline-V2 → scripted autonomous elytra-bot (2b2t spawn) — инженерный разбор

## 1) Краткая архитектура клиента (только что важно для переноса)

- Инициализация идёт через `Shoreline.init()`: сначала поднимаются менеджеры, затем грузится конфиг, затем хук выключения. Это полезно как шаблон жизненного цикла бота (`init → load config → run → graceful shutdown`).
- `Managers` — центральный DI/Service Locator: отдельно вынесены rotation, movement, network, inventory, targeting и др. Для бота это означает: логику стоит разнести по сервисам, а не держать в одном «god class».
- Модульная система: `ModuleManager` регистрирует все модули и их конфиги; каждый модуль наследуется от `Module`/`Toggleable` и получает параметры через `Config`-поля.
- Событийная модель: модули подписаны на `EventBus`, а mixin-хуки транслируют игровые вызовы в события (`PlayerMoveEvent`, `TravelEvent`, `RotationUpdateEvent`, packet inbound/outbound). Для scripted-бота это переносится как внутренний event loop + state machine.
- Rotation pipeline: `RotationManager` хранит server/client rotation, умеет movement correction, packet look sync, silent rotate. Это главный источник для плавного/контролируемого yaw/pitch в боте.
- Базовые матем. утилиты: `RotationUtil`, `MovementModule#strafe`, `MovementCorrection`, `NanoTimer`.

## 2) Таблица полезных модулей/классов для scripted-бота

| Компонент | Что даёт | Переносимость |
|---|---|---|
| `ElytraFlyModule` | Контроль элитра-скоростей по осям, расчёт вектора по yaw | Частично/почти напрямую |
| `ElytraBoostModule` | FSM «экипировать элитры → прыгнуть → старт флайта → буст» | Частично |
| `MovementModule#strafe` | Нормализация forward/strafe, перевод в мировой вектор | Почти напрямую |
| `RotationManager` + `MovementCorrection` + `RotationUtil` | Цели yaw/pitch, correction движения при несовпадении look/move | Почти напрямую (без mixin-части) |
| `SpeedModule` + `Strafe`/`LongJump` | Стейджи ускорения, работа с трением/базовой скоростью | Частично (как шаблон контроллера скорости) |
| `SafeWalkModule` | Защита от срыва с края через подрезание вектора | Почти напрямую |
| `AvoidModule` | Блок-уровневые запреты (кактус/огонь/непрогружено/anti-void) | Частично (адаптировать под полёт) |
| `StepModule` | Идея offset-серий + таймеры/антиспам пакетов | Частично |
| `TargetManager` + `TargetingModule` + `EntityUtil` | Базовый выбор/фильтрация сущностей | Почти напрямую |
| `TextRadarHudModule` (логика сортировки) | Сортировка игроков по distance/criteria | Частично (вынести без HUD) |
| `VelocityModule` | Редукция/контроль внешних импульсов и антидесинк-паттерны | Частично |
| `AntiHungerModule` | Точечные packet-правки состояния | Частично/условно |
| `PatherModule` | Практически пустой | Не брать |
| `NoFallModule` | Практически пустой | Не брать |

## 3) Практический разбор лучших модулей

### A. ElytraFlyModule
**Путь:** `impl/module/movement/ElytraFlyModule.java`  
**Зачем:** основной фундамент ручного элитра-контроля.  
**Механика:**
1. В `CONTROL` режиме на `TravelEvent.Pre` отменяет дефолтный travel.
2. Читает `forward/sideways`, берёт yaw (приоритетно из client rotation manager).
3. Считает `velocityX/Z` через sin/cos от `yaw+90`.
4. По jump/sneak задаёт `velocityY`.
5. Применяет вектор в `setVelocity + move`.

**Ключевые методы/поля:** `onTravel_Pre`, `hSpeed`, `vSpeed`, `mode`, `pitch`, `canSprint`.  
**Перенос:**
- Почти напрямую: формула вектора + вертикальный контроль + проверка gliding.
- Частично: BOUNCE-режим и camera override избыточны для headless-бота.
- Не переносить: mouse hijack/camera hooks.

**Как переписать для бота:**
- Модуль `ElytraController`.
- Вход: `state(gliding,onGround)`, `desired_heading`, `desired_altitude_rate`, `input_policy`.
- Выход: `set_pitch/yaw`, `jump/sneak`, `target_velocity`.

---

### B. ElytraBoostModule
**Путь:** `impl/module/movement/ElytraBoostModule.java`  
**Зачем:** одноразовый запуск/разгон после старта.  
**Механика (FSM):**
- `idle` → если элитры не надеты, надевает из инвентаря.
- `initiated` → прыжок с земли.
- `boosted` → отправка `START_FALL_FLYING`, добавление вертикального импульса, look packet в `pitch=-90`.
- `finish` → возвращает нагрудник/восстанавливает autoarmor и выключается.

**Перенос:**
- Частично: очень полезен как FSM-идея старта элитра-полёта.
- Не переносить напрямую: зависимость от GUI-слотов/pickup-клика.

**Для бота:**
- `BoostController` с состояниями: `ensure_elytra`, `jump_takeoff`, `trigger_glide`, `impulse`, `restore_gear`.
- Важны таймауты и retry-лимиты.

---

### C. Rotation stack (RotationManager + MovementCorrection + RotationUtil)
**Пути:** `impl/rotation/*`, `impl/module/client/RotationsModule.java`.  
**Зачем:** это сердце плавного наведения камеры без ломания движения.  
**Механика:**
- Хранит server vs client yaw/pitch.
- Пересчитывает движение при разнице yaw (`correctMovement`).
- Может «молча» поворачивать серверную ротацию packet-ом.
- Даёт `isFacingYaw/Pitch` для условий FSM.

**Перенос:**
- Почти напрямую: math, correction, facing tolerance, sync policy.
- Частично: packet interception через mixin в боте заменяется сетевым адаптером собственного клиента.

**Для бота:**
- `RotationController` с ограничением `maxYawRate/maxPitchRate`.
- `AimPolicy`: waypoint mode / target mode / evasive mode.
- `MovementCorrection` обязателен для «летим вперёд и одновременно смотрим вбок».

---

### D. Movement math ядро (MovementModule#strafe)
**Путь:** `impl/module/impl/MovementModule.java`.  
**Зачем:** универсальная функция преобразования входа forward/strafe в мировой XZ-вектор с учётом yaw и диагоналей.  
**Переносимость:** почти 1:1.

**Для бота:**
- это должна быть библиотечная функция `compute_horizontal_vector(yaw, forward, strafe, speed)`.
- используется и в patrol, и в obstacle bypass, и в стабилизации скорости.

---

### E. Speed/LongJump/Step/SafeWalk/Avoid (паттерны контроля движения)
- `SpeedModule + speed features`: полезны как **модель стадийного ускорения** + учёт эффектов/трения.
- `LongJumpModule`: полезен как пример state-driven acceleration (не как фича longjump).
- `StepModule`: ценна идея таймера + offset-последовательности (антидесинк/антиспам).
- `SafeWalkModule`: прямой перенос для edge-safety.
- `AvoidModule`: логика «запретных блоков» и anti-void — можно адаптировать для low-altitude режима/страховки.

## 4) ТОП алгоритмов для переноса в бота

1. **Rotation to target (yaw/pitch)**
   - Где: `RotationUtil#getRotationsTo`.
   - Что даёт: угол до waypoint/игрока.
   - Адаптация: добавить rate-limit и deadzone.

2. **Movement correction при независимом look/move**
   - Где: `MovementCorrection#correctMovement`.
   - Что даёт: бот не теряет траекторию при сопровождении цели взглядом.

3. **Страфинг-формула XZ-вектора**
   - Где: `MovementModule#strafe`.
   - Что даёт: чистый расчёт движения по yaw и входам.

4. **Elytra velocity controller**
   - Где: `ElytraFlyModule` (`CONTROL`).
   - Что даёт: горизонтальная + вертикальная ось управления.

5. **Boost FSM**
   - Где: `ElytraBoostModule`.
   - Что даёт: стабильный старт полёта после сброса/посадки.

6. **Edge-safe vector clipping**
   - Где: `SafeWalkModule`.
   - Что даёт: не слетать при сканировании/патруле рядом с краями.

7. **Timer/Cooldown manager**
   - Где: `NanoTimer` + использование в `StepModule`.
   - Что даёт: deterministic контроль задержек, анти-спам packet burst.

8. **Target selection/filter baseline**
   - Где: `TargetManager`, `TargetingModule`, `EntityUtil`.
   - Что даёт: фильтрация «кого сопровождаем/сканируем».

## 5) Что можно игнорировать

- GUI/ClickGUI/HUD modules, рендер/ESP/шейдеры.
- Модули без алгоритмического содержания (`PatherModule`, `NoFallModule` в текущем состоянии).
- Всё, что завязано только на визуал (модели, траектории визуализации, title screen и т.д.).

## 6) Итоговая карта переноса

### Обязательно взять
1. RotationController (target yaw/pitch + smoothing + rate limit + facing checks)
2. Movement math core (`strafe` + correction)
3. ElytraController (горизонт/вертикаль, glide state handling)
4. BoostController (FSM старта/восстановления)
5. TargetTracker (фильтрация игроков + приоритезация)
6. Timer/Cooldown manager
7. Safety layer (edge/anti-void/unstuck)

### Желательно взять
1. Speed stabilization (модель базовой скорости/трения)
2. Packet sync policy (look sync, anti-desync safeguards)
3. Hazard map (огонь/кактусы/непрогруженное как soft-no-fly zones)

### Можно не брать
1. HUD/GUI/рендер
2. Чисто PvP-модули без пользы для навигации
3. Неполные/заглушки-модули

## 7) Мое инженерное мнение под вашу цель (автономный элитра-бот на 2b2t spawn)

Если цель — **автономно летать по спавну, обходить препятствия и искать игроков**, то из Shoreline не стоит «копировать модули», а нужно вынести только три ядра:

1. **Кинематика и ротации** (из `Rotation*`, `MovementCorrection`, `MovementModule#strafe`, `ElytraFly`).
2. **FSM принятия решений** (патруль / pursuit / evade / recover / resync / return-to-route).
3. **Слой безопасности** (anti-void, anti-stall, stuck-recovery, desync-guard, chunk-availability guard).

Самый критичный разрыв в Shoreline для вашей цели: там нет полноценного 3D obstacle avoidance для элитры (локальный planner + lookahead collision prediction + реплан). Это нужно писать отдельно как ваш главный модуль:
- `Local3DPlanner` (лучи вперёд/вбок/вверх, оценка свободного коридора)
- `TrajectoryKeeper` (удержание heading/speed/altitude)
- `RecoveryController` (если потеряна скорость, ударились, нет прогруженных чанков, server setback)

## 8) Минимальный набор логики, который нужно реализовать в своём боте

1. **Rotation controller** — плавный yaw/pitch без рывков, с лимитами скорости.
2. **Elytra controller** — управление горизонталью/вертикалью и поддержание glide.
3. **Boost controller** — запуск полёта и восстановление после срыва.
4. **Waypoint navigator** — маршрут патруля и переключение точек.
5. **Target tracker** — обнаружение/фильтрация игроков и приоритезация.
6. **Velocity stabilizer** — удержание крейсерской скорости и курсоустойчивости.
7. **Safety/recovery system** — anti-void, anti-stuck, аварийные манёвры.
8. **Cooldown/timer manager** — deterministic тайминги для всех FSM-переходов.

---

### Практический приоритет внедрения
1) Rotation+Movement core → 2) Elytra+Boost FSM → 3) Waypoint patrol → 4) Player tracking → 5) 3D obstacle avoidance → 6) Recovery/Desync guard.  
Именно такой порядок даст fastest path к реально автономному боту на спавне.

## 9) Проверка репозитория `not-filepile/Shoreline-V2-buildable`

Проверил дополнительно fork `https://github.com/not-filepile/Shoreline-V2-buildable`.

### Что важно по итогу проверки
- В этом форке действительно акцент на **сборку/билдабельность**, а не на новый набор алгоритмов.
- Ключевые полезные для бота части (ElytraFly / Rotation stack / MovementCorrection / Speed-family) по сути те же по логике.
- Слабые места, о которых писал выше, остаются теми же:
  - `PatherModule` фактически пустой,
  - `NoFallModule` фактически пустой,
  - полноценного 3D obstacle avoidance для элитры всё ещё нет.

### Практический вывод по вашему вопросу «проверь ещё это»
Да, смотреть этот форк имеет смысл как **более удобную базу для локального запуска и тестов**, но для вашей цели (автономный элитра-бот на 2b2t spawn) переносимый алгоритмический core почти не меняется:
1. Rotation/movement math.
2. Elytra control + boost FSM.
3. Safety/recovery + ваш собственный 3D planner.

То есть предыдущая карта переноса остаётся валидной; этот форк не отменяет необходимость писать собственный модуль облёта препятствий и recovery-логику.
