import readline from "node:readline";
import minecraftData from "minecraft-data";
import { goals, Movements } from "mineflayer-pathfinder";
import { Vec3 } from "vec3";
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
let autopilotEnabled = false;
let initialized = false;

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

function applyRecoveryStrategy(exec, currentPos) {
  switch (exec.strategy) {
    case "BACKTRACK_LAST_CHECKPOINT": {
      if (exec.checkpoint) {
        return new Vec3(exec.checkpoint.x, exec.checkpoint.y + 2, exec.checkpoint.z);
      }
      return new Vec3(currentPos.x, currentPos.y + 5, currentPos.z);
    }
    case "VERTICAL_BOOST_ESCAPE":
      return new Vec3(currentPos.x, currentPos.y + 16, currentPos.z);
    case "LATERAL_ARC_ESCAPE":
      return new Vec3(currentPos.x + 26, currentPos.y + 4, currentPos.z + 26);
    default:
      return new Vec3(currentPos.x, currentPos.y + 8, currentPos.z);
  }
}

function handleConsoleCommand(line) {
  const [cmd, arg] = line.trim().split(/\s+/);

  if (cmd === "start") {
    autopilotEnabled = true;
    telemetry.emit("console", { cmd, status: "autopilot_enabled" });
    console.log("[BOT] Autopilot enabled.");
    return;
  }

  if (cmd === "pause") {
    autopilotEnabled = false;
    telemetry.emit("console", { cmd, status: "autopilot_paused" });
    console.log("[BOT] Autopilot paused.");
    return;
  }

  if (cmd === "status") {
    const pos = bot.entity?.position;
    console.log(`[BOT] status: init=${initialized}, autopilot=${autopilotEnabled}, pos=${pos ? `${pos.x.toFixed(1)} ${pos.y.toFixed(1)} ${pos.z.toFixed(1)}` : "n/a"}`);
    return;
  }

  if (cmd === "keepout" && arg) {
    const dist = Number(arg);
    if (!Number.isNaN(dist) && dist > 0) {
      evasion.keepoutDistance = dist;
      console.log(`[BOT] keepout distance set to ${dist}`);
      telemetry.emit("console", { cmd, value: dist });
    }
    return;
  }

  if (cmd === "help") {
    console.log("[BOT] Commands: start | pause | status | keepout <n> | help");
  }
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on("line", handleConsoleCommand);

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
  initialized = true;

  telemetry.emit("spawn", {
    username: bot.username,
    auth: config.auth.method,
    position: bot.entity.position,
    pingMs: latency.pingMs,
    gravity: physicsSafety.getGravity(),
    playerHeight: physicsSafety.getPlayerHeight(),
    note: "Autopilot paused by default. Use console command: start"
  });

  console.log("[BOT] Spawned. Give resources now, then type 'start' in console.");
});

bot.on("physicTick", () => {
  if (!autopilotEnabled || !bot.entity || !observer || !pathPlanner || !executor) return;

  targets.tick();
  evasion.decayMemory();
  patrol.tick();

  const snapshot = observer.tick();
  const activeGoal = processManager.evaluate(buildCandidates(snapshot));

  if (!latestPlan || latestPlan.goalType !== activeGoal.getType()) {
    latestPlan = pathPlanner.plan(activeGoal, bot.entity.position, snapshot, observer);
    latestPlan.goalType = activeGoal.getType();
    executor.setPlan(latestPlan);

    telemetry.emit("planner", {
      goal: activeGoal.getType(),
      reason: latestPlan.reason,
      cost: latestPlan.cost,
      target: latestPlan.target
    });
  }

  const exec = executor.tick(bot);
  if (exec.done) {
    if (exec.reason === "stuck_timeout") {
      const recoveryTarget = applyRecoveryStrategy(exec, bot.entity.position);
      latestPlan = pathPlanner.plan(new GoalRecovery(exec.strategy), bot.entity.position, snapshot, observer);
      latestPlan.goalType = "RECOVERY";
      latestPlan.target = recoveryTarget;
      latestPlan.segments = [recoveryTarget];
      executor.setPlan(latestPlan);
      telemetry.emit("recovery", { reason: exec.reason, strategy: exec.strategy, target: recoveryTarget });
      return;
    }

    if (activeGoal.getType() === "PATROL") {
      patrol.forceWaypoint(routePlanner.nextWaypoint(bot.entity.position));
      latestPlan = null;
    }
  }

  const isElytraFlying = typeof bot.entity.isElytraFlying === "function" ? bot.entity.isElytraFlying() : false;
  if (!isElytraFlying && latestPlan?.target) {
    bot.pathfinder.setGoal(new goals.GoalNear(latestPlan.target.x, latestPlan.target.y, latestPlan.target.z, 4), true);
  }

  telemetry.emit("status", {
    goal: activeGoal.getType(),
    pingMs: latency.pingMs,
    leadTicks: latency.estimateLeadTicks(),
    position: bot.entity.position,
    velocity: bot.entity.velocity,
    nearestPlayer: snapshot.nearestPlayer,
    solidAhead: snapshot.solidAhead,
    loadedChunksNearby: snapshot.loadedChunksNearby,
    chunkReliability: snapshot.chunkReliability,
    hazardDensity: snapshot.hazardDensity,
    hostileMemory: [...evasion.hostileMemory.keys()],
    transition: processManager.getLastTransition()
  });
});

bot.on("kicked", (reason) => telemetry.emit("kicked", { reason }));
bot.on("error", (error) => telemetry.emit("error", { message: error.message }));
