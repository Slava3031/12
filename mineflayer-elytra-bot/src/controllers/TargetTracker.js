export class TargetTracker {
  constructor(bot, maxDistance = 220) {
    this.bot = bot;
    this.maxDistance = maxDistance;
    this.currentTarget = null;
  }

  tick() {
    if (!this.bot.entity) return;
    const entities = Object.values(this.bot.entities ?? {});
    const players = entities
      .filter((e) => e.type === "player" && e.username && e.username !== this.bot.username)
      .filter((e) => this.bot.entity.position.distanceTo(e.position) <= this.maxDistance);

    if (players.length === 0) {
      this.currentTarget = null;
      return;
    }

    players.sort((a, b) => this.bot.entity.position.distanceSquared(a.position) - this.bot.entity.position.distanceSquared(b.position));
    this.currentTarget = players[0];
  }
}
