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
  }

  get name() {
    return this.definition.name;
  }

  get type() {
    return this.definition.type || "Card";
  }

  // returns the actions available for the current state of this card
  getActions() {
    if (this.definition.states && this.definition.states[this.state] && this.definition.states[this.state].actions) {
      return this.definition.states[this.state].actions;
    }
    return {};
  }

  canPerformAction(action) {
    return Object.prototype.hasOwnProperty.call(this.getActions(), action);
  }

  resetSeasonResources() {
    this.resourcesThisSeason.clear();
  }
}

module.exports = Card;
