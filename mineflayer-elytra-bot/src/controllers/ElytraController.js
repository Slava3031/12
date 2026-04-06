import { Vec3 } from "vec3";

export class ElytraController {
  constructor(bot, config, latency) {
    this.bot = bot;
    this.config = config;
    this.latency = latency;
  }

  async ensureFlightReady() {
    // TODO: inventory checks, equip elytra, check fireworks, durability guard.
    return true;
  }

  tickCruise(targetVec3) {
    const me = this.bot.entity?.position;
    if (!me || !targetVec3) return;

    const to = targetVec3.minus(me);
    const desiredYaw = Math.atan2(-to.x, -to.z) * (180 / Math.PI);
    const desiredPitch = Math.atan2(to.y, Math.hypot(to.x, to.z)) * (180 / Math.PI);

    this.bot.look(
      this.#toRadians(this.#clampDelta(this.bot.entity.yaw * (180 / Math.PI), desiredYaw, this.config.flight.yawRateLimitDegPerTick)),
      this.#toRadians(this.#clampDelta(this.bot.entity.pitch * (180 / Math.PI), desiredPitch, this.config.flight.pitchRateLimitDegPerTick)),
      true
    ).catch(() => {});

    // Placeholder: key control decisions (jump/sneak/forward/firework usage)
    this.bot.setControlState("forward", true);
  }

  recoveryTick() {
    // TODO: emergency descent + speed recovery logic.
    this.bot.setControlState("forward", true);
    this.bot.setControlState("jump", false);
    this.bot.setControlState("sprint", true);
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
