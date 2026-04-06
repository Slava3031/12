export const defaultConfig = {
  server: {
    host: "localhost",
    port: 25565,
    version: false,
    username: "ElytraPatrolBot"
  },
  auth: {
    method: "offline"
  },
  patrol: {
    center: { x: 0, y: 120, z: 0 },
    radius: 1500,
    altitude: {
      min: 95,
      target: 120,
      max: 150
    },
    waypoints: [],
    loopMode: "ring"
  },
  flight: {
    cruiseSpeedBlocksPerTick: 1.5,
    yawRateLimitDegPerTick: 7,
    pitchRateLimitDegPerTick: 4,
    minSafeClearanceBlocks: 6,
    obstacleScanDistance: 42,
    recovery: {
      enabled: true,
      minHorizontalSpeed: 0.6,
      emergencyPitchDown: 35
    }
  },
  network: {
    assumedPingMs: 150,
    jitterMs: 35,
    actionLeadTicks: 4,
    resyncIntervalTicks: 20
  },
  telemetry: {
    intervalMs: 1000,
    file: {
      enabled: true,
      path: "./telemetry.ndjson"
    },
    webhook: {
      enabled: false,
      url: ""
    }
  }
};
