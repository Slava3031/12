import { loadConfig } from "./config/loadConfig.js";
import { createMineflayerBot } from "./bot/createMineflayerBot.js";
import { LatencyCompensator } from "./controllers/LatencyCompensator.js";
import { ElytraController } from "./controllers/ElytraController.js";
import { PatrolController } from "./controllers/PatrolController.js";
import { TargetTracker } from "./controllers/TargetTracker.js";
import { RoutePlanner3D } from "./planner/RoutePlanner3D.js";
import { TelemetryBus } from "./telemetry/TelemetryBus.js";
import { PatrolState, PatrolStateMachine } from "./state/PatrolStateMachine.js";

const config = loadConfig();
const bot = createMineflayerBot(config);
const telemetry = new TelemetryBus(config);

const latency = new LatencyCompensator(config.network);
const planner = new RoutePlanner3D(config);
const patrol = new PatrolController(bot, planner, config.patrol);
const targets = new TargetTracker(bot);
const elytra = new ElytraController(bot, config, latency);
const fsm = new PatrolStateMachine();

bot.once("spawn", async () => {
  telemetry.emit("spawn", {
    username: bot.username,
    position: bot.entity.position,
    pingMs: latency.pingMs
  });

  const ready = await elytra.ensureFlightReady();
  fsm.transition(ready ? PatrolState.PATROL : PatrolState.PREPARE_FLIGHT);
});

bot.on("physicTick", () => {
  targets.tick();

  if (targets.currentTarget) {
    fsm.transition(PatrolState.TRACK_TARGET);
  }

  if (fsm.state === PatrolState.TRACK_TARGET) {
    elytra.tickCruise(targets.currentTarget.position);
    return;
  }

  if (fsm.state === PatrolState.RECOVERY) {
    elytra.recoveryTick();
    if (fsm.dwellMs > 2_500) fsm.transition(PatrolState.RESYNC);
    return;
  }

  const waypoint = patrol.getCurrentWaypoint();
  if (waypoint) {
    elytra.tickCruise(waypoint);
    patrol.advanceIfReached();
  }
});

setInterval(() => {
  if (!bot.entity) return;
  telemetry.emit("status", {
    state: fsm.state,
    pingMs: latency.pingMs,
    leadTicks: latency.estimateLeadTicks(),
    position: bot.entity.position,
    velocity: bot.entity.velocity,
    target: targets.currentTarget?.username ?? null,
    nextWaypoint: patrol.getCurrentWaypoint()
  });
}, config.telemetry.intervalMs);

bot.on("kicked", (reason) => telemetry.emit("kicked", { reason }));
bot.on("error", (error) => telemetry.emit("error", { message: error.message }));
