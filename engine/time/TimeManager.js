// engine/time/TimeManager.js
// Handles turn tracking, seasons, and calendar system

class TimeManager {
  constructor() {
    this.seasons = ["spring", "summer", "autumn", "winter"];
    this.seasonIndex = 0;
    this.currentSeason = this.seasons[this.seasonIndex];
    this.actionsPerSeason = 3;
  }

  getCurrentSeason() {
    return this.currentSeason;
  }

  advanceSeason() {
    this.seasonIndex = (this.seasonIndex + 1) % this.seasons.length;
    this.currentSeason = this.seasons[this.seasonIndex];
    return this.currentSeason;
  }

  getActionsPerSeason() {
    return this.actionsPerSeason;
  }

  // Get all seasons (useful for checking valid seasons for plant needs)
  getAllSeasons() {
    return [...this.seasons];
  }
}

module.exports = TimeManager;