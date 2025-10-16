
class ActionManager {
  constructor() {
    // Initialize subsystems
    this.timeManager = new TimeManager();
  }

  // Wait action: uses up one action, triggers weather
  waitAction() {
    this.triggerWeather();
    return true;
  }

  // Trigger weather event after each action
  triggerWeather() {
    const currentMonth = this.getCurrentMonth(); // e.g., "jan"

    if (this.weatherSystem.month !== currentMonth) {
      this.weatherSystem.updateForMonth(currentMonth, this.boundsData);
    }
    console.log(`\n🌦 Weather: ${this.weatherSystem.toString()}`);
  }

  // Get current game state info
  getCurrentMonth() {
    return this.timeManager.getCurrentMonth();
  }
}

module.exports = ActionManager;