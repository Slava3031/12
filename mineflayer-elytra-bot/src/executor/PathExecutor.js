export class PathExecutor {
  constructor(elytraController) {
    this.elytraController = elytraController;
    this.plan = null;
    this.segmentIndex = 0;
    this.startedAt = 0;
    this.lastProgressAt = 0;
    this.prevDistance = Number.POSITIVE_INFINITY;
    this.checkpoints = [];
    this.recoveryStep = 0;
    this.recoveryStrategies = [
      "BACKTRACK_LAST_CHECKPOINT",
      "VERTICAL_BOOST_ESCAPE",
      "LATERAL_ARC_ESCAPE"
    ];
  }

  setPlan(plan) {
    this.plan = plan;
    this.segmentIndex = 0;
    this.startedAt = Date.now();
    this.lastProgressAt = Date.now();
    this.prevDistance = Number.POSITIVE_INFINITY;
    this.checkpoints = [];
    this.recoveryStep = 0;
  }

  tick(bot) {
    if (!this.plan || this.plan.segments.length === 0 || !bot.entity) {
      return { done: true, reason: "no_plan" };
    }

    const segment = this.plan.segments[this.segmentIndex];
    this.elytraController.tickCruise(segment);

    const dist = bot.entity.position.distanceTo(segment);
    if (dist < this.prevDistance - 0.5) {
      this.lastProgressAt = Date.now();
      this.prevDistance = dist;
      this.#saveCheckpoint(bot.entity.position);
    }

    if (dist <= 8) {
      this.segmentIndex += 1;
      this.prevDistance = Number.POSITIVE_INFINITY;
      if (this.segmentIndex >= this.plan.segments.length) {
        return { done: true, reason: "reached_target" };
      }
      return { done: false, reason: "segment_advanced" };
    }

    if (Date.now() - this.lastProgressAt > 3000) {
      const strategy = this.#nextRecoveryStrategy();
      return { done: true, reason: "stuck_timeout", strategy, checkpoint: this.checkpoints.at(-1) ?? null };
    }

    return { done: false, reason: "tracking_segment" };
  }

  #saveCheckpoint(pos) {
    this.checkpoints.push({ x: pos.x, y: pos.y, z: pos.z, ts: Date.now() });
    if (this.checkpoints.length > 10) this.checkpoints.shift();
  }

  #nextRecoveryStrategy() {
    const strategy = this.recoveryStrategies[this.recoveryStep % this.recoveryStrategies.length];
    this.recoveryStep += 1;
    return strategy;
  }
}
