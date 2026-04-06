export class PatrolController {
  constructor(bot, routePlanner, patrolConfig) {
    this.bot = bot;
    this.routePlanner = routePlanner;
    this.patrolConfig = patrolConfig;
    this.waypoints = patrolConfig.waypoints.length
      ? patrolConfig.waypoints
      : routePlanner.buildPatrolWaypoints(patrolConfig.center, patrolConfig.radius);
    this.currentIndex = 0;
  }

  getCurrentWaypoint() {
    return this.waypoints[this.currentIndex] ?? null;
  }

  advanceIfReached(threshold = 16) {
    const wp = this.getCurrentWaypoint();
    if (!wp || !this.bot.entity?.position) return;

    const dist = this.bot.entity.position.distanceTo(wp);
    if (dist <= threshold) {
      this.currentIndex = (this.currentIndex + 1) % this.waypoints.length;
    }
  }
}
