export class PatrolController {
  constructor(bot, routePlanner, patrolConfig) {
    this.bot = bot;
    this.routePlanner = routePlanner;
    this.patrolConfig = patrolConfig;
    this.currentWaypoint = null;
  }

  getCurrentWaypoint() {
    return this.currentWaypoint;
  }

  tick() {
    if (!this.currentWaypoint && this.bot.entity?.position) {
      this.currentWaypoint = this.routePlanner.nextWaypoint(this.bot.entity.position);
      return;
    }

    if (!this.currentWaypoint || !this.bot.entity?.position) return;

    const dist = this.bot.entity.position.distanceTo(this.currentWaypoint);
    if (dist <= this.patrolConfig.waypointReachDistance) {
      this.currentWaypoint = this.routePlanner.nextWaypoint(this.bot.entity.position);
    }
  }

  forceWaypoint(waypoint) {
    this.currentWaypoint = waypoint;
  }
}
