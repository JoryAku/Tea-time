class Player {
  constructor() {
    this.garden = [];   // planted cards (plants that are in garden)
    this.weatherVane = null; // view current weather conditions (interpreted)
    this.calendar = []; // current months planted cards
    this.startingMonth = "jan"; // starting month of the game
  }

  getAvailableActions() {
    const actions = [];
    // always allow wait
    actions.push("wait");
    // allow checking current weather conditions
    actions.push("check_weather");
    return actions;
  }
}

module.exports = Player;
