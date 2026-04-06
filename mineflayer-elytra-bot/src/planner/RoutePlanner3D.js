import { Vec3 } from "vec3";

/**
 * Skeleton planner:
 * - replace stub with full 3D A* over sampled air corridor nodes
 * - include chunk-availability and dynamic obstacle penalties
 */
export class RoutePlanner3D {
  constructor(config) {
    this.config = config;
  }

  buildPatrolWaypoints(center, radius) {
    const points = [];
    const legs = 12;
    for (let i = 0; i < legs; i += 1) {
      const angle = (Math.PI * 2 * i) / legs;
      points.push(new Vec3(
        Math.round(center.x + Math.cos(angle) * radius),
        center.y,
        Math.round(center.z + Math.sin(angle) * radius)
      ));
    }
    return points;
  }

  computeAvoidanceVector(_bot) {
    // TODO: raycast/lidar-like scan with directional scoring.
    return new Vec3(0, 0, 0);
  }
}
