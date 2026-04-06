export class ElytraController {
  constructor(bot, config, latency) {
    this.bot = bot;
    this.config = config;
    this.latency = latency;
    this.tickCounter = 0;
  }

  async ensureFlightReady() {
    // TODO: inventory checks, equip elytra, check fireworks, durability guard.
    return true;
  }

  tickCruise(targetVec3) {
    this.tickCounter += 1;
    const me = this.bot.entity?.position;
    if (!me || !targetVec3) return;

    // keep relatively low to retain visibility of ground players
    const clampedTargetY = Math.max(
      this.config.patrol.altitude.min,
      Math.min(this.config.patrol.altitude.max, targetVec3.y)
    );

    const to = {
      x: targetVec3.x - me.x,
      y: clampedTargetY - me.y,
      z: targetVec3.z - me.z
    };

    const desiredYaw = Math.atan2(-to.x, -to.z) * (180 / Math.PI);
    const desiredPitch = Math.atan2(to.y, Math.hypot(to.x, to.z)) * (180 / Math.PI);

    this.bot.look(
      this.#toRadians(this.#clampDelta(this.bot.entity.yaw * (180 / Math.PI), desiredYaw, this.config.flight.yawRateLimitDegPerTick)),
      this.#toRadians(this.#clampDelta(this.bot.entity.pitch * (180 / Math.PI), desiredPitch, this.config.flight.pitchRateLimitDegPerTick)),
      true
    ).catch(() => {});

    this.bot.setControlState("forward", true);
    this.bot.setControlState("sprint", true);

    // small anti-kick pulse pattern: 80% aggressive movement + 20% anti-kick stability
    if (this.config.network.antiKick.enabled
      && this.tickCounter % this.config.network.antiKick.verticalPulseEveryTicks === 0) {
      this.bot.setControlState("jump", true);
      setTimeout(() => this.bot.setControlState("jump", false), 75);
    }
  }

  recoveryTick() {
    this.bot.setControlState("forward", true);
    this.bot.setControlState("jump", false);
    this.bot.setControlState("sprint", true);

    // nose down to keep horizontal speed while escaping nearby players.
    this.bot.look(
      this.bot.entity?.yaw ?? 0,
      this.#toRadians(this.config.flight.recovery.emergencyPitchDown),
      true
    ).catch(() => {});
  }

  #toRadians(deg) {
    return deg * (Math.PI / 180);
  }

  #clampDelta(currentDeg, targetDeg, maxStepDeg) {
    let delta = ((targetDeg - currentDeg + 540) % 360) - 180;
    if (Math.abs(delta) > maxStepDeg) delta = Math.sign(delta) * maxStepDeg;
    return currentDeg + delta;
  }
}
