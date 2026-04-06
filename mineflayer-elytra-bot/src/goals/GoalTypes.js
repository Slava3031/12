import { Vec3 } from "vec3";

export class Goal {
  constructor(type, priority) {
    this.type = type;
    this.priority = priority;
  }

  getPriority() {
    return this.priority;
  }

  getType() {
    return this.type;
  }
}

export class GoalPatrol extends Goal {
  constructor(target) {
    super("PATROL", 10);
    this.target = target;
  }
}

export class GoalTrack extends Goal {
  constructor(targetEntity) {
    super("TRACK", 20);
    this.targetEntity = targetEntity;
  }

  getTargetPos() {
    return this.targetEntity?.position ?? null;
  }
}

export class GoalEvade extends Goal {
  constructor(threatEntity, keepoutDistance, escapePos) {
    super("EVADE", 40);
    this.threatEntity = threatEntity;
    this.keepoutDistance = keepoutDistance;
    this.escapePos = escapePos;
  }

  getTargetPos() {
    return this.escapePos;
  }
}

export class GoalRecovery extends Goal {
  constructor(reason) {
    super("RECOVERY", 30);
    this.reason = reason;
  }
}

export class GoalAltitude extends Goal {
  constructor(minY, targetY, maxY) {
    super("ALTITUDE", 15);
    this.minY = minY;
    this.targetY = targetY;
    this.maxY = maxY;
  }

  getTargetPos(currentPos) {
    if (!currentPos) return null;
    return new Vec3(currentPos.x, this.targetY, currentPos.z);
  }
}
