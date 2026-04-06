import mineflayer from "mineflayer";
import { pathfinder } from "mineflayer-pathfinder";

export function createMineflayerBot(config) {
  const bot = mineflayer.createBot({
    host: config.server.host,
    port: config.server.port,
    username: config.server.username,
    version: config.server.version || false,
    auth: config.auth.method
  });

  bot.loadPlugin(pathfinder);
  return bot;
}
