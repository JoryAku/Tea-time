// Card.js

class Card {
  constructor(name, type, state) {
    this.name = name;       // e.g., 'Tea Plant', 'Tea Leaf', 'Green Tea'
    this.type = type;       // e.g., 'Seedling', 'Mature Plant', 'Raw', 'Processed', 'Tea'
    this.state = state;     // e.g., 'inDeck', 'inHand', 'inField', 'processed'
  }

  canPerformAction(action) {
    switch(this.type) {
      case 'Seedling':
        return action === 'plant';
      case 'Mature Plant':
        return action === 'harvest';
      case 'Raw':
        return action === 'brewRaw' || action === 'processRaw';
      case 'Processed':
        return action === 'brewProcessed';
      case 'Tea':
        return action === 'consume';
      default:
        return false;
    }
  }
}

module.exports = Card;
