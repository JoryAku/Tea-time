// Game.js

const Player = require('./Player.js');
const Card = require('./Card.js');

class Game {
  constructor() {
    this.seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
    this.seasonIndex = 0;
    this.actionsPerSeason = 3;
    this.actionsLeft = this.actionsPerSeason;

    this.player = new Player();

    this.history = []; // To support past actions
    this.futureQueue = []; // To support future actions
  }

  log(msg) { console.log(msg); }

  start() {
    this.log('=== Tea Time Game Started ===');
    this.nextSeason();
  }

  nextSeason() {
    this.seasonIndex += 1; // Move to next season first
    if (this.seasonIndex >= this.seasons.length) {
      this.endYear();
      return;
    }

    this.log(`\\n>>> ${this.seasons[this.seasonIndex]} begins.`);
    this.actionsLeft = this.actionsPerSeason;

    this.applyFutureActions();
    this.storeHistory();
    this.player.maturePlants();
  }


  endSeason() {
    this.log(`=== End of ${this.seasons[this.seasonIndex]} ===`);
    this.seasonIndex += 1;
    this.nextSeason();
  }

  endYear() {
    this.log('\n--- End of Year ---');
    this.log('Player Tea Cards: ' + this.player.teaCards.join(', ') || '(none)');
    this.log('Year ends. Loop resets if Time Tea not brewed.');
  }

  storeHistory() {
    const snapshot = this.player.getStateSnapshot();
    this.history.push(snapshot);
  }

  applyFutureActions() {
    while(this.futureQueue.length > 0) {
      const action = this.futureQueue.shift();
      action();
    }
  }

  performAction(actionFunc) {
    const success = actionFunc();
    if (success) this.actionsLeft--;
    if (this.actionsLeft <= 0) this.endSeason();
  }

  performPastAction(seasonOffset, actionFunc) {
    const targetIndex = this.history.length - 1 - seasonOffset;
    if (targetIndex >= 0) {
      const snapshot = this.history[targetIndex];

      // Example: planting a seed in past
      // actionFunc will modify snapshot.field or snapshot.raw
      actionFunc(snapshot);

      this.log('Past action applied.');
      return true;
    } else {
      this.log('No past season available for this action.');
      return false;
    }
  }


  queueFutureAction(actionFunc) {
    this.futureQueue.push(actionFunc);
  }

  performPastAction(seasonOffset, actionFunc) {
    const targetIndex = this.history.length - 1 - seasonOffset;
    if (targetIndex >= 0) {
      const snapshot = this.history[targetIndex];
      actionFunc(snapshot);
      this.log('Past action applied.');
      return true;
    } else {
      this.log('No past season available for this action.');
      return false;
    }
  }
}

module.exports = Game;
