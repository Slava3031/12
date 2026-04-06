export class PathExecutor {
  constructor(elytraController) {
    this.elytraController = elytraController;
    this.plan = null;
    this.segmentIndex = 0;
    this.startedAt = 0;
    this.lastProgressAt = 0;
    this.prevDistance = Number.POSITIVE_INFINITY;
  }

  setPlan(plan) {
    this.plan = plan;
    this.segmentIndex = 0;
    this.startedAt = Date.now();
    this.lastProgressAt = Date.now();
    this.prevDistance = Number.POSITIVE_INFINITY;
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
      return { done: true, reason: "stuck_timeout" };
    }

    return { done: false, reason: "tracking_segment" };
  }
}
