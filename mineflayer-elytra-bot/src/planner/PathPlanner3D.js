import { Vec3 } from "vec3";

class PriorityQueue {
  constructor() {
    this.items = [];
  }

  push(node, priority) {
    this.items.push({ node, priority });
  }

  pop() {
    if (this.items.length === 0) return null;
    let best = 0;
    for (let i = 1; i < this.items.length; i += 1) {
      if (this.items[i].priority < this.items[best].priority) best = i;
    }
    return this.items.splice(best, 1)[0].node;
  }

  get size() {
    return this.items.length;
  }
}

export class PathPlanner3D {
  constructor(routePlanner, config) {
    this.routePlanner = routePlanner;
    this.config = config;
    this.maxNodes = 1200;
  }

  plan(goal, currentPos, observerSnapshot, observer = null) {
    if (!goal || !currentPos) {
      return { segments: [], cost: Number.POSITIVE_INFINITY, reason: "no_goal_or_position" };
    }

    const target = this.#resolveTarget(goal, currentPos);
    const coarsePath = this.#aStarHybrid(currentPos, target, observer);
    if (coarsePath.length === 0) {
      return {
        segments: [target],
        cost: currentPos.distanceTo(target) + 500,
        reason: "astar_failed_direct_fallback",
        target
      };
    }

    const dist = currentPos.distanceTo(target);
    const clearancePenalty = observerSnapshot?.solidAhead ? 35 : 0;
    const chunkPenalty = (1 - (observerSnapshot?.chunkReliability ?? 1)) * 40;
    const hazardPenalty = (observerSnapshot?.hazardDensity ?? 0) * 60;
    const cost = dist + clearancePenalty + chunkPenalty + hazardPenalty;

    return {
      segments: coarsePath,
      cost,
      reason: `astar nodes=${coarsePath.length},dist=${dist.toFixed(1)},hazard=${hazardPenalty.toFixed(1)}`,
      target
    };
  }

  #resolveTarget(goal, currentPos) {
    let target;
    if (typeof goal.getTargetPos === "function") {
      target = goal.getTargetPos(currentPos);
    } else if (goal.target) {
      target = goal.target;
    }

    if (!target) target = this.routePlanner.nextWaypoint(currentPos);
    return target;
  }

  #aStarHybrid(start, target, observer) {
    const s = this.#toNode(start);
    const g = this.#toNode(target);
    const open = new PriorityQueue();
    const cameFrom = new Map();
    const gScore = new Map([[this.#key(s), 0]]);
    open.push(s, 0);

    let expanded = 0;

    while (open.size > 0 && expanded < this.maxNodes) {
      const current = open.pop();
      expanded += 1;
      if (this.#heuristic(current, g) <= 6) {
        return this.#reconstruct(cameFrom, current).map((n) => new Vec3(n.x, n.y, n.z));
      }

      for (const nb of this.#neighbors(current, target.y)) {
        const key = this.#key(nb);
        const tentative = (gScore.get(this.#key(current)) ?? Number.POSITIVE_INFINITY)
          + current.distanceTo(nb)
          + (observer?.getNodePenalty?.(nb) ?? 0);

        if (tentative < (gScore.get(key) ?? Number.POSITIVE_INFINITY)) {
          cameFrom.set(key, current);
          gScore.set(key, tentative);
          const fScore = tentative + this.#heuristic(nb, g);
          open.push(nb, fScore);
        }
      }
    }

    return [];
  }

  #neighbors(node, targetY) {
    const step = 12;
    const yStep = 4;
    const n = [];
    const dirs = [
      [step, 0], [-step, 0], [0, step], [0, -step],
      [step, step], [step, -step], [-step, step], [-step, -step]
    ];

    for (const [dx, dz] of dirs) {
      n.push(new Vec3(node.x + dx, node.y, node.z + dz));
      n.push(new Vec3(node.x + dx, node.y + yStep, node.z + dz));
      n.push(new Vec3(node.x + dx, Math.max(targetY - 20, node.y - yStep), node.z + dz));
    }

    return n;
  }

  #reconstruct(cameFrom, current) {
    const path = [current];
    let c = current;
    while (cameFrom.has(this.#key(c))) {
      c = cameFrom.get(this.#key(c));
      path.push(c);
      if (path.length > 128) break;
    }
    return path.reverse();
  }

  #heuristic(a, b) {
    return a.distanceTo(b);
  }

  #toNode(v) {
    return new Vec3(Math.round(v.x), Math.round(v.y), Math.round(v.z));
  }

  #key(v) {
    return `${v.x}:${v.y}:${v.z}`;
  }
}
