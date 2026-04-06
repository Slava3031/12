import minecraftData from "minecraft-data";
import { goals, Movements } from "mineflayer-pathfinder";
import { loadConfig } from "./config/loadConfig.js";
import { createMineflayerBot } from "./bot/createMineflayerBot.js";
import { LatencyCompensator } from "./controllers/LatencyCompensator.js";
import { ElytraController } from "./controllers/ElytraController.js";
import { PatrolController } from "./controllers/PatrolController.js";
import { TargetTracker } from "./controllers/TargetTracker.js";
import { EvasionController } from "./controllers/EvasionController.js";
import { RoutePlanner3D } from "./planner/RoutePlanner3D.js";
import { PhysicsSafetyService } from "./planner/PhysicsSafetyService.js";
import { TelemetryBus } from "./telemetry/TelemetryBus.js";
import { PatrolState, PatrolStateMachine } from "./state/PatrolStateMachine.js";

const config = loadConfig();
const bot = createMineflayerBot(config);
const telemetry = new TelemetryBus(config);

const latency = new LatencyCompensator(config.network);
const planner = new RoutePlanner3D(config);
const patrol = new PatrolController(bot, planner, config.patrol);
const targets = new TargetTracker(bot);
const evasion = new EvasionController(bot, config.flight.hostileKeepoutDistance);
const elytra = new ElytraController(bot, config, latency);
const fsm = new PatrolStateMachine();

let physicsSafety = null;

bot.once("spawn", async () => {
  physicsSafety = new PhysicsSafetyService(bot);

  const mcData = minecraftData(bot.version);
  const movements = new Movements(bot, mcData);
  movements.canDig = false;
  bot.pathfinder.setMovements(movements);

  telemetry.emit("spawn", {
    username: bot.username,
    auth: config.auth.method,
    position: bot.entity.position,
    pingMs: latency.pingMs,
    gravity: physicsSafety.getGravity(),
    playerHeight: physicsSafety.getPlayerHeight()
  });

  const ready = await elytra.ensureFlightReady();
  fsm.transition(ready ? PatrolState.PATROL : PatrolState.PREPARE_FLIGHT);
});

bot.on("physicTick", () => {
  if (!bot.entity) return;

  targets.tick();
  evasion.decayMemory();
  patrol.tick();

  const threat = evasion.getNearestThreat();
  if (threat && threat.distance <= config.flight.hostileKeepoutDistance) {
    fsm.transition(PatrolState.RECOVERY);
    const escape = evasion.computeEscapeWaypoint(bot.entity.position, threat.entity.position, config.patrol.altitude.target);
    patrol.forceWaypoint(escape);
  } else if (fsm.state === PatrolState.RECOVERY && fsm.dwellMs > 3000) {
    fsm.transition(PatrolState.PATROL);
  }

  if (fsm.state === PatrolState.RECOVERY) {
    const escape = patrol.getCurrentWaypoint();
    elytra.tickCruise(escape);
    return;
  }

  const wp = patrol.getCurrentWaypoint();
  if (!wp) return;

  const avoid = planner.computeAvoidanceVector(bot);
  const adjustedWp = wp.plus(avoid);

  if (physicsSafety?.hasSolidBlockAhead(7)) {
    elytra.recoveryTick();
  } else {
    elytra.tickCruise(adjustedWp);
  }

  // Ground fallback if bot is not gliding yet: pathfinder can still move bot toward next segment.
  const isElytraFlying = typeof bot.entity.isElytraFlying === "function" ? bot.entity.isElytraFlying() : false;
  if (!isElytraFlying) {
    bot.pathfinder.setGoal(new goals.GoalNear(adjustedWp.x, adjustedWp.y, adjustedWp.z, 4), true);
  }
});

setInterval(() => {
  if (!bot.entity) return;

  const threat = evasion.getNearestThreat();
  telemetry.emit("status", {
    state: fsm.state,
    pingMs: latency.pingMs,
    leadTicks: latency.estimateLeadTicks(),
    position: bot.entity.position,
    velocity: bot.entity.velocity,
    nextWaypoint: patrol.getCurrentWaypoint(),
    visibleTarget: targets.currentTarget?.username ?? null,
    threat: threat ? { username: threat.entity.username, distance: threat.distance, hostile: threat.hostile } : null,
    hostileMemory: [...evasion.hostileMemory.keys()]
  });
}, config.telemetry.intervalMs);

bot.on("entityGone", (entity) => {
  if (!entity?.username) return;
  if (evasion.hostileMemory.has(entity.username)) {
    telemetry.emit("threat_left_visibility", { username: entity.username });
  }
});

bot.on("kicked", (reason) => telemetry.emit("kicked", { reason }));
bot.on("error", (error) => telemetry.emit("error", { message: error.message }));
