import minecraftData from "minecraft-data";
import prismarineChunk from "prismarine-chunk";
import { Physics } from "prismarine-physics";

/**
 * Thin adapter around prismarine-* libs.
 * Current implementation provides safety helpers and extension points.
 */
export class PhysicsSafetyService {
  constructor(bot) {
    this.bot = bot;
    this.mcData = minecraftData(bot.version);
    this.physics = Physics(this.mcData, this.bot.world);
    this.Chunk = prismarineChunk(bot.version);
  }

  getGravity() {
    return this.physics.simulation?.gravity ?? 0.08;
  }

  getPlayerHeight() {
    return this.physics.playerHeight ?? 1.8;
  }

  hasSolidBlockAhead(range = 8) {
    const pos = this.bot.entity?.position;
    if (!pos) return false;

    const yaw = this.bot.entity.yaw;
    for (let i = 1; i <= range; i += 1) {
      const x = Math.round(pos.x - Math.sin(yaw) * i);
      const y = Math.round(pos.y);
      const z = Math.round(pos.z - Math.cos(yaw) * i);
      const b = this.bot.blockAt({ x, y, z });
      if (b && b.boundingBox === "block") return true;
    }
    return false;
  }
}
