export class ProcessManager {
  constructor() {
    this.activeGoal = null;
    this.history = [];
  }

  evaluate(candidateGoals = []) {
    if (candidateGoals.length === 0) {
      return this.activeGoal;
    }

    const sorted = [...candidateGoals].sort((a, b) => b.getPriority() - a.getPriority());
    const next = sorted[0];

    if (!this.activeGoal || this.activeGoal.getType() !== next.getType()) {
      this.history.push({
        ts: Date.now(),
        from: this.activeGoal?.getType() ?? null,
        to: next.getType()
      });
      this.activeGoal = next;
    } else {
      this.activeGoal = next;
    }

    return this.activeGoal;
  }

  getActiveGoal() {
    return this.activeGoal;
  }

  getLastTransition() {
    return this.history.at(-1) ?? null;
  }
}
