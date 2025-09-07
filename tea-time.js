// tea-time.js — Main Entry Point

const Game = require('./engine/Game.js');

// Optional: could switch to CLI or another UI later
const useCLI = true;

if (useCLI) {
  const readline = require('readline');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('=== Welcome to Tea Time ===');

  const game = new Game();
  game.start();

} else {
  // Placeholder for future UI (e.g., web interface)
  const game = new Game();
  game.start();
}
