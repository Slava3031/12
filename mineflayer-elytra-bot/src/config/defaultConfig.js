export const defaultConfig = {
  server: {
    host: "localhost",
    port: 25565,
    version: "1.21.5",
    username: "noutiisL"
  },
  auth: {
    method: "offline"
  },
  patrol: {
    bounds: {
      minX: -3000,
      maxX: 3000,
      minZ: -3000,
      maxZ: 3000
    },
    mode: "mixed",
    altitude: {
      min: 95,
      target: 120,
      max: 145
    },
    waypointReachDistance: 20
  },
  flight: {
    cruiseSpeedBlocksPerTick: 1.5,
    yawRateLimitDegPerTick: 8,
    pitchRateLimitDegPerTick: 4,
    minSafeClearanceBlocks: 6,
    obstacleScanDistance: 48,
    hostileKeepoutDistance: 15,
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
    resyncIntervalTicks: 20,
    antiKick: {
      enabled: true,
      verticalPulseEveryTicks: 25
    }
  },
  telemetry: {
    intervalMs: 1000,
    file: {
      enabled: true,
      path: "./telemetry.ndjson"
    },
    text: {
      enabled: true,
      path: "./telemetry.txt"
    },
    javaSnapshot: {
      enabled: true,
      path: "./BotStateSnapshot.java"
    },
    webhook: {
      enabled: false,
      url: ""
    }
  }
};
