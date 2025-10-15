// Handles turn tracking, seasons, and calendar system

class TimeManager {
  constructor() {
    this.months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
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
}

module.exports = TimeManager;