class Player {
  constructor() {
    this.garden = [];   // planted cards (plants that are in garden)
    this.weatherVane = []; // current weather condition affecting the garden
    this.calendar = []; // current month
    this.actionsLeft = 3;
  }

  // produce a list of strings like "clone hand 0" "plant hand 0" etc.
  getAvailableActions() {
    const actions = [];
    // always allow wait
    actions.push("wait");
    return actions;
  }
}

module.exports = Player;
