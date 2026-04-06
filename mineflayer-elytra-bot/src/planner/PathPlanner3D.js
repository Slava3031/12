import { Vec3 } from "vec3";

export class PathPlanner3D {
  constructor(routePlanner, config) {
    this.routePlanner = routePlanner;
    this.config = config;
  }

  plan(goal, currentPos, observerSnapshot) {
    if (!goal || !currentPos) {
      return { segments: [], cost: Number.POSITIVE_INFINITY, reason: "no_goal_or_position" };
    }

    let target;
    if (typeof goal.getTargetPos === "function") {
      target = goal.getTargetPos(currentPos);
    } else if (goal.target) {
      target = goal.target;
    }

    if (!target) {
      target = this.routePlanner.nextWaypoint(currentPos);
    }

    const avoidance = observerSnapshot?.solidAhead
      ? new Vec3(8, 2, 8)
      : new Vec3(0, 0, 0);

    const corrected = target.plus ? target.plus(avoidance) : new Vec3(target.x + avoidance.x, target.y + avoidance.y, target.z + avoidance.z);
    const segments = this.#interpolate(currentPos, corrected, 6);

    const dist = currentPos.distanceTo(corrected);
    const clearancePenalty = observerSnapshot?.solidAhead ? 40 : 0;
    const chunkPenalty = observerSnapshot?.loadedChunksNearby < 4 ? 30 : 0;
    const cost = dist + clearancePenalty + chunkPenalty;

    return {
      segments,
      cost,
      reason: `dist=${dist.toFixed(1)},clearance=${clearancePenalty},chunks=${chunkPenalty}`,
      target: corrected
    };
  }

  #interpolate(a, b, steps) {
    const out = [];
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      out.push(new Vec3(
        Math.round(a.x + (b.x - a.x) * t),
        Math.round(a.y + (b.y - a.y) * t),
        Math.round(a.z + (b.z - a.z) * t)
      ));
    }
    return out;
  }
}
