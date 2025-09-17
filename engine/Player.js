class Player {
  constructor() {
    this.hand = [];     // cards in hand
    this.garden = [];   // planted cards (plants that are in garden)
    this.shed = [];     // seedlings / spare seeds / tools
    this.kitchen = [];  // raw & processed ingredients
    this.cafe = [];     // brewed teas
    this.actionsLeft = 3;
    this.totalActionsUsed = 0; // Track total actions used across all seasons
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

  // Find which location a card is currently in
  findCardLocation(card) {
    const zones = ["hand", "garden", "shed", "kitchen", "cafe"];
    for (const zone of zones) {
      if (this[zone].includes(card)) {
        return zone;
      }
    }
    return null;
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
          let display = `  ${i}: ${card.name} [${card.state}]`;
          // Show oxidation progress if relevant
          if (card.oxidationActionsLeft > 0) {
            display += ` (${card.oxidationActionsLeft} oxidation actions left)`;
          }
          console.log(display);
        });
      }
    });
  }

  // Helper method to increment total actions used
  useAction(cost = 1) {
    this.totalActionsUsed += cost;
    this.actionsLeft -= cost;
  }

  // Get time information based on total actions used
  getTimeInfo(actionsPerSeason = 3) {
    const totalSeasons = Math.floor(this.totalActionsUsed / actionsPerSeason);
    const years = Math.floor(totalSeasons / 4);
    const remainingSeasons = totalSeasons % 4;
    
    return {
      totalActionsUsed: this.totalActionsUsed,
      years,
      seasons: remainingSeasons,
      totalSeasons
    };
  }

  // Get formatted time string
  getTimeString(actionsPerSeason = 3) {
    const timeInfo = this.getTimeInfo(actionsPerSeason);
    let timeStr = `Total actions: ${timeInfo.totalActionsUsed}`;
    
    if (timeInfo.years > 0 || timeInfo.seasons > 0) {
      const parts = [];
      if (timeInfo.years > 0) {
        parts.push(`${timeInfo.years} year${timeInfo.years !== 1 ? 's' : ''}`);
      }
      if (timeInfo.seasons > 0) {
        parts.push(`${timeInfo.seasons} season${timeInfo.seasons !== 1 ? 's' : ''}`);
      }
      timeStr += ` (${parts.join(', ')} elapsed)`;
    }
    
    return timeStr;
  }
}

module.exports = Player;
