export const PatrolState = Object.freeze({
  BOOT: "BOOT",
  PREPARE_FLIGHT: "PREPARE_FLIGHT",
  PATROL: "PATROL",
  TRACK_TARGET: "TRACK_TARGET",
  RECOVERY: "RECOVERY",
  RESYNC: "RESYNC"
});

export class PatrolStateMachine {
  #state = PatrolState.BOOT;
  #changedAt = Date.now();

  get state() {
    return this.#state;
  }

  transition(next) {
    if (next === this.#state) return;
    this.#state = next;
    this.#changedAt = Date.now();
  }

  get dwellMs() {
    return Date.now() - this.#changedAt;
  }
}
