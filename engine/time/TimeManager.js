// Handles turn tracking, seasons, and calendar system

class TimeManager {
  constructor() {
    this.months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    // start at January by default
    this.monthIndex = 0;
    this.currentMonth = this.months[this.monthIndex];
  }

  getCurrentMonth() {
    return this.months[this.monthIndex];
  }

  advanceMonth() {
    this.monthIndex = (this.monthIndex + 1) % this.months.length;
    this.currentMonth = this.months[this.monthIndex];
    return this.currentMonth;
  }

  getAllMonths() {
    return [...this.months];
  }

  // How many actions make up one month in the timeline simulation
  getActionsPerMonth() {
    // By default each action represents one month in simplified model
    return 1;
  }
}

module.exports = TimeManager;