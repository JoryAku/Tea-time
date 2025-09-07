// Player.js

const Card = require('./Card.js');
const { shuffle } = require('./utils.js'); // Utility function for shuffling arrays

class Player {
  constructor() {
    this.deck = [];
    this.hand = [];
    this.discard = [];
    this.field = [];
    this.raw = [];
    this.processed = [];
    this.teaCards = [];

    this.buildDeck();
    this.draw(5);
  }

  buildDeck() {
    for (let i = 0; i < 4; i++) {
      this.deck.push(new Card('Tea Plant', 'Seedling', 'inDeck'));
    }
    shuffle(this.deck);
  }

  draw(n) {
    for (let i = 0; i < n; i++) {
      if (this.deck.length === 0) {
        if (this.discard.length === 0) break;
        this.deck = shuffle(this.discard);
        this.discard = [];
      }
      const c = this.deck.shift();
      if (c) c.state = 'inHand';
      this.hand.push(c);
    }
  }

  discardHand() {
    for (const c of this.hand) c.state = 'inDeck';
    this.discard.push(...this.hand);
    this.hand = [];
  }

  maturePlants() {
    for (const plant of this.field) {
      if (plant.type === 'Seedling') plant.type = 'Mature Plant';
    }
  }

  // Card actions
  plant(seedIndex) {
    const seed = this.hand[seedIndex];
    if (!seed || seed.type !== 'Seedling') return false;
    this.hand.splice(seedIndex, 1);
    seed.state = 'inField';
    this.field.push(seed);
    return true;
  }

  harvest(fieldIndex) {
    const plant = this.field[fieldIndex];
    if (!plant || plant.type !== 'Mature Plant') return false;
    this.field.splice(fieldIndex, 1);
    this.raw.push('Tea Leaf');
    return true;
  }

  processRaw(rawIndex) {
    const leaf = this.raw[rawIndex];
    if (!leaf) return false;
    this.raw.splice(rawIndex, 1);
    this.processed.push('Black Tea Leaf');
    return true;
  }

  brewProcessed(processedIndex) {
    const leaf = this.processed[processedIndex];
    if (!leaf) return false;
    this.processed.splice(processedIndex, 1);
    this.teaCards.push('Black Tea');
    return true;
  }

  brewRaw(rawIndex) {
    const leaf = this.raw[rawIndex];
    if (!leaf) return false;
    this.raw.splice(rawIndex, 1);
    this.teaCards.push('Green Tea');
    return true;
  }

  consumeTea(teaName) {
    const idx = this.teaCards.indexOf(teaName);
    if (idx === -1) return false;
    this.teaCards.splice(idx, 1);
    return true;
  }

  consumeTea(teaName, game) {
    const idx = this.teaCards.indexOf(teaName);
    if (idx === -1) return false;

    this.teaCards.splice(idx, 1); // Remove from your tea cards

    // Apply effect
    switch (teaName) {
      case 'Green Tea':
        // Allows one past action
        game.performPastAction(1, (snapshot) => {
          // snapshot is the state of the previous season
          // We'll apply planting or processing in past here
          // The effect depends on which card you choose to act on
        });
        break;
      case 'Black Tea':
        // Allows one future action
        game.queueFutureAction(() => {
          // Apply future action in next season
        });
        break;
    }
    return true;
  }

  clone(index) {
    // Check hand first
    let card = this.hand[index];
    if (!card || card.type !== 'Seedling') {
      console.log('Can only clone seedlings in your hand.');
      return false;
    }

    // Create a new Seedling card
    const clonedCard = { ...card }; // shallow copy is fine
    clonedCard.state = 'Seedling';   // ensure it's a seedling

    this.hand.push(clonedCard);     // add to hand
    console.log(`Cloned a new ${card.name} into your hand.`);
    return true;
  }

  getStateSnapshot() {
    return {
      hand: [...this.hand],
      field: [...this.field],
      raw: [...this.raw],
      processed: [...this.processed],
      teaCards: [...this.teaCards]
    };
  }
}

module.exports = Player;
