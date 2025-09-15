class Card {
  constructor(definition, state = null) {
    if (!definition) throw new Error("Card requires a definition");
    this.definition = definition;
    // choose a default state if none provided
    if (state) this.state = state;
    else if (definition.defaultState) this.state = definition.defaultState;
    else if (definition.states) this.state = Object.keys(definition.states)[0];
    else this.state = "default";

    // track which resources (sun/rain/etc) this plant saw during current season
    this.resourcesThisSeason = new Set();
    // track active weather conditions and their remaining duration (2 actions)
    this.activeConditions = {};
    // track how many seasons/actions spent in current state
    this.stateProgress = 0;
    // track plant age in years (incremented at each year end)
    this.age = 0;
    // assign a random lifespan if defined
    if (definition.lifespan) {
      const { min, max } = definition.lifespan;
      this.lifespan = (min === max) ? min : (Math.floor(Math.random() * (max - min + 1)) + min);
    } else {
      this.lifespan = null;
    }

    // Tea processing specific properties
    this.oxidationProgress = 0;
    this.oxidationActionsLeft = 0;
    
    // Harvest readiness for mature plants (only true in spring)
    this.harvestReady = false;
  }

  get name() {
    return this.definition.name;
  }

  get type() {
    return this.definition.type || "Card";
  }

  // returns the actions available for the current state of this card
  getActions() {
    // First check if the card has states and current state has actions
    let actions = {};
    if (this.definition.states && this.definition.states[this.state] && this.definition.states[this.state].actions) {
      actions = { ...this.definition.states[this.state].actions };
    }
    // If no states, check for actions at the root level (for ingredients)
    else if (this.definition.actions) {
      actions = { ...this.definition.actions };
    }
    
    // For mature plants, only allow harvest if harvestReady is true
    if (this.state === 'mature' && actions.harvest && !this.harvestReady) {
      delete actions.harvest;
    }
    
    return actions;
  }

  canPerformAction(action) {
    return Object.prototype.hasOwnProperty.call(this.getActions(), action);
  }

  resetSeasonResources() {
    this.resourcesThisSeason.clear();
    this.activeConditions = {};
  }

  // Called each action to decrement condition timers and remove expired
  tickActiveConditions() {
    for (const cond in this.activeConditions) {
      this.activeConditions[cond]--;
      if (this.activeConditions[cond] <= 0) {
        delete this.activeConditions[cond];
      }
    }
  }

  // Call this when the card changes state
  resetStateProgress() {
    this.stateProgress = 0;
  }
}

module.exports = Card;
