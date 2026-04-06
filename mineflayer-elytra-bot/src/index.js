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
import { PathPlanner3D } from "./planner/PathPlanner3D.js";
import { PhysicsSafetyService } from "./planner/PhysicsSafetyService.js";
import { PathExecutor } from "./executor/PathExecutor.js";
import { WorldObserver } from "./observer/WorldObserver.js";
import { ProcessManager } from "./process/ProcessManager.js";
import { GoalEvade, GoalPatrol, GoalRecovery, GoalTrack } from "./goals/GoalTypes.js";
import { TelemetryBus } from "./telemetry/TelemetryBus.js";

const config = loadConfig();
const bot = createMineflayerBot(config);
const telemetry = new TelemetryBus(config);

const latency = new LatencyCompensator(config.network);
const routePlanner = new RoutePlanner3D(config);
const patrol = new PatrolController(bot, routePlanner, config.patrol);
const targets = new TargetTracker(bot);
const evasion = new EvasionController(bot, config.flight.hostileKeepoutDistance);
const elytra = new ElytraController(bot, config, latency);
const processManager = new ProcessManager();

let physicsSafety = null;
let observer = null;
let pathPlanner = null;
let executor = null;
let latestPlan = null;

function buildCandidates(snapshot) {
  const goalsOut = [];
  const threat = evasion.getNearestThreat();

  if (threat && threat.distance <= config.flight.hostileKeepoutDistance) {
    const escape = evasion.computeEscapeWaypoint(bot.entity.position, threat.entity.position, config.patrol.altitude.target);
    goalsOut.push(new GoalEvade(threat.entity, config.flight.hostileKeepoutDistance, escape));
  }

  if (snapshot?.solidAhead) {
    goalsOut.push(new GoalRecovery("solid_ahead"));
  }

  if (targets.currentTarget) {
    goalsOut.push(new GoalTrack(targets.currentTarget));
  }

  const patrolTarget = patrol.getCurrentWaypoint() ?? routePlanner.nextWaypoint(bot.entity.position);
  goalsOut.push(new GoalPatrol(patrolTarget));
  return goalsOut;
}

bot.once("spawn", async () => {
  physicsSafety = new PhysicsSafetyService(bot);
  observer = new WorldObserver(bot, physicsSafety);
  pathPlanner = new PathPlanner3D(routePlanner, config);
  executor = new PathExecutor(elytra);

  const mcData = minecraftData(bot.version);
  const movements = new Movements(bot, mcData);
  movements.canDig = false;
  bot.pathfinder.setMovements(movements);

  await elytra.ensureFlightReady();

  telemetry.emit("spawn", {
    username: bot.username,
    auth: config.auth.method,
    position: bot.entity.position,
    pingMs: latency.pingMs,
    gravity: physicsSafety.getGravity(),
    playerHeight: physicsSafety.getPlayerHeight()
  });
});

bot.on("physicTick", () => {
  if (!bot.entity || !observer || !pathPlanner || !executor) return;

  targets.tick();
  evasion.decayMemory();
  patrol.tick();

  const snapshot = observer.tick();
  const activeGoal = processManager.evaluate(buildCandidates(snapshot));

  // Planner loop (replan on goal changes / no plan / completion)
  if (!latestPlan || latestPlan.goalType !== activeGoal.getType()) {
    latestPlan = pathPlanner.plan(activeGoal, bot.entity.position, snapshot);
    latestPlan.goalType = activeGoal.getType();
    executor.setPlan(latestPlan);

    telemetry.emit("planner", {
      goal: activeGoal.getType(),
      reason: latestPlan.reason,
      cost: latestPlan.cost,
      target: latestPlan.target
    });
  }

  // Executor loop
  const exec = executor.tick(bot);
  if (exec.done) {
    if (exec.reason === "stuck_timeout") {
      latestPlan = pathPlanner.plan(new GoalRecovery("executor_stuck"), bot.entity.position, snapshot);
      latestPlan.goalType = "RECOVERY";
      executor.setPlan(latestPlan);
      telemetry.emit("recovery", { reason: "executor_stuck", target: latestPlan.target });
      return;
    }

    if (activeGoal.getType() === "PATROL") {
      patrol.forceWaypoint(routePlanner.nextWaypoint(bot.entity.position));
      latestPlan = null;
    }
  }

  // Pathfinder ground fallback
  const isElytraFlying = typeof bot.entity.isElytraFlying === "function" ? bot.entity.isElytraFlying() : false;
  if (!isElytraFlying && latestPlan?.target) {
    bot.pathfinder.setGoal(new goals.GoalNear(latestPlan.target.x, latestPlan.target.y, latestPlan.target.z, 4), true);
  }

  const transition = processManager.getLastTransition();
  telemetry.emit("status", {
    goal: activeGoal.getType(),
    pingMs: latency.pingMs,
    leadTicks: latency.estimateLeadTicks(),
    position: bot.entity.position,
    velocity: bot.entity.velocity,
    nearestPlayer: snapshot.nearestPlayer,
    solidAhead: snapshot.solidAhead,
    loadedChunksNearby: snapshot.loadedChunksNearby,
    hostileMemory: [...evasion.hostileMemory.keys()],
    transition
  });
});

bot.on("chat", (username, message) => {
  if (username === bot.username) return;

  // Runtime command interface for quick tuning
  if (message.startsWith("!keepout ")) {
    const dist = Number(message.split(" ")[1]);
    if (!Number.isNaN(dist) && dist > 0) {
      evasion.keepoutDistance = dist;
      telemetry.emit("command", { by: username, cmd: "keepout", value: dist });
    }
  }
});

bot.on("kicked", (reason) => telemetry.emit("kicked", { reason }));
bot.on("error", (error) => telemetry.emit("error", { message: error.message }));
