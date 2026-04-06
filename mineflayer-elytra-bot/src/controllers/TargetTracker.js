export class TargetTracker {
  constructor(bot) {
    this.bot = bot;
    this.currentTarget = null;
  }

  tick() {
    const entities = Object.values(this.bot.entities ?? {});
    const players = entities.filter((e) => e.type === "player" && e.username && e.username !== this.bot.username);
    if (players.length === 0) {
      this.currentTarget = null;
      return;
    }

    players.sort((a, b) => this.bot.entity.position.distanceSquared(a.position) - this.bot.entity.position.distanceSquared(b.position));
    this.currentTarget = players[0];
  }
}
