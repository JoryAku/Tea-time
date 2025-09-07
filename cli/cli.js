// cli.js
const readline = require('readline');
const Game = require('../engine/Game.js');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const game = new Game();

console.log('=== Welcome to Tea Time CLI ===');
console.log('\nObjective: You are stuck in a year-long time loop. Your goal is to grow and harvest ingredients to brew the legendary Time Tea.');
console.log('Use your actions each season to plant, harvest, process, brew, clone, or consume teas.');
console.log('Green Tea allows you to act in the past. Black Tea allows you to act in the future.');
console.log('Plan carefully to break the time loop and complete the Time Tea recipe.\n');

function showState() {
  console.log(`\nSeason: ${game.seasons[game.seasonIndex]} | Actions left: ${game.actionsLeft}`);
  console.log('Hand:');
  game.player.hand.forEach((c, i) => console.log(`  ${i}: ${c.name} (${c.type})`));
  console.log('Field:');
  game.player.field.forEach((c, i) => console.log(`  ${i}: ${c.name} (${c.type})`));
  console.log(`Raw: ${game.player.raw.join(', ') || '(empty)'} | Processed: ${game.player.processed.join(', ') || '(empty)'}`);
  console.log(`Tea Cards: ${game.player.teaCards.join(', ') || '(none)'}\n`);
}

function startTurn() {
  showState();

  // Build possible actions dynamically
  const possibleActions = [];
  game.player.hand.forEach((c, i) => {
    if (c.type === 'Seedling') possibleActions.push(`plant ${i}`, `clone ${i}`);
  });
  game.player.field.forEach((c, i) => { if (c.type === 'Mature Plant') possibleActions.push(`harvest ${i}`); });
  game.player.raw.forEach((c, i) => possibleActions.push(`brewRaw ${i}`, `processRaw ${i}`));
  game.player.processed.forEach((c, i) => possibleActions.push(`brewProcessed ${i}`));
  game.player.teaCards.forEach((tea, i) => possibleActions.push(`consume ${i}`));
  possibleActions.push('wait');

  console.log('Possible actions:');
  possibleActions.forEach(a => console.log(`  ${a}`));

  rl.question('Choose an action: ', (input) => {
    const [action, indexStr] = input.split(' ');
    const index = parseInt(indexStr);

    let success = false;

    switch (action) {
      case 'plant': success = game.player.plant(index); break;
      case 'harvest': success = game.player.harvest(index); break;
      case 'brewRaw': success = game.player.brewRaw(index); break;
      case 'processRaw': success = game.player.processRaw(index); break;
      case 'brewProcessed': success = game.player.brewProcessed(index); break;
      case 'consume':
        if (game.player.teaCards[index]) {
          const teaName = game.player.teaCards[index];
          success = game.player.consumeTea(teaName, game);
          if (!success) console.log('Cannot consume that tea.');
        } else {
          console.log('Invalid tea index');
        }
        break;
      case 'clone': success = game.player.clone(index); break;
      case 'wait': success = true; break;
      default: console.log('Invalid action'); break;
    }

    if (success && action !== 'wait') game.actionsLeft--;

    // Show state after action
    console.log('\n--- Current State After Action ---');
    showState();

    // Advance season if actions left is 0 or wait chosen
    if (game.actionsLeft <= 0 || action === 'wait') {
      game.actionsLeft = game.actionsPerSeason;
      game.nextSeason();
      if (game.seasonIndex < game.seasons.length) {
        startTurn();
      } else {
        console.log('--- Year Finished ---');
        rl.close();
      }
    } else {
      startTurn(); // Continue current season
    }
  });
}

startTurn();
