// engine/Player.js
class Player {
  constructor() {
    this.hand = [];     // cards in hand
    this.garden = [];   // planted cards (plants that are in garden)
    this.shed = [];     // seedlings / spare seeds / tools
    this.kitchen = [];  // raw & processed ingredients
    this.cafe = [];     // brewed teas
    this.actionsLeft = 3;
  }

  addCardToLocation(card, location) {
    if (!this[location]) {
      console.error(`Invalid location: ${location}`);
      return false;
    }
    this[location].push(card);
    console.log(`Added ${card.name} [${card.state}] to ${location}.`);
    return true;
  }

  removeCardFromCurrentLocation(card) {
    for (const location of ["hand", "garden", "shed", "kitchen", "cafe"]) {
      const idx = this[location].indexOf(card);
      if (idx !== -1) {
        this[location].splice(idx, 1);
        console.log(`Removed ${card.name} [${card.state}] from ${location}.`);
        return true;
      }
    }
    return false;
  }

  findCard(zone, index) {
    if (!this[zone]) return null;
    return this[zone][index];
  }

  // produce a list of strings like "clone hand 0" "plant hand 0" etc.
  getAvailableActions() {
    const actions = [];
    const zones = ["hand", "garden", "shed", "kitchen", "cafe"];
    zones.forEach((zone) => {
      this[zone].forEach((card, index) => {
        const cardActions = card.getActions();
        Object.keys(cardActions).forEach((action) => {
          actions.push(`${action} ${zone} ${index}`);
        });
      });
    });

    // always allow wait
    actions.push("wait");
    return actions;
  }

  listCards() {
    const zones = ["hand", "shed", "garden", "kitchen", "cafe"];
    zones.forEach((zone) => {
      console.log(`\n${zone.toUpperCase()}:`);
      if (this[zone].length === 0) {
        console.log("  (empty)");
      } else {
        this[zone].forEach((card, i) => {
          console.log(`  ${i}: ${card.name} [${card.state}]`);
        });
      }
    });
  }
}

module.exports = Player;
