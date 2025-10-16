const readline = require("readline");
const Game = require("../engine/Game");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const game = new Game();

console.log("=== Tea Time (Terminal) ===");

function showState() {
  console.log(`\n=== ${game.currentMonth} ===`);
  try {
    const pw = game.peekWeather && typeof game.peekWeather === 'function' ? game.peekWeather() : null;
    if (pw && pw.interpretation) {
      console.log('\nCurrent weather:');
      if (pw.interpretation.condition === 'Mixed' && Array.isArray(pw.interpretation.candidates)) {
        const names = pw.interpretation.candidates.map(c => c.name).join(', ');
        console.log(`Mixed conditions possible: ${names} — ${pw.interpretation.description}`);
      } else {
        console.log(`${pw.interpretation.condition} — ${pw.interpretation.description}`);
      }
    } else if (game.engine && game.engine.weatherSystem) {
      console.log('\nCurrent weather:');
      console.log(game.engine.weatherSystem.toString());
    } else if (game.player && game.player.weatherVane) {
      console.log('\nCurrent weather conditions:');
      console.log(game.player.weatherVane);
    }
  } catch (e) {
    // ignore
  }
  try {
    const garden = (game.player && Array.isArray(game.player.garden)) ? game.player.garden : [];
    if (garden.length === 0) {
      console.log('\nGarden is empty.');
    } else {
      console.log('\nGarden:');
      garden.forEach((p, i) => {
        const id = p.id || p.name || `plant-${i + 1}`;
        const name = p.name || p.id || 'Unknown Plant';
        const stage = p.stage || 'unknown';
        const health = typeof p.health === 'number' ? p.health.toFixed(2) : 'n/a';
        const growth = typeof p.growth === 'number' ? p.growth.toFixed(2) : 'n/a';
        console.log(`  ${i + 1}) ${name} (${id}) — stage: ${stage}, health: ${health}, growth: ${growth}`);
      });
    }
  } catch (e) {
    console.log('\nGarden: (unable to display)');
  }
}

function formatActions(actions) {
  return actions.map((a, i) => `${i + 1}) ${a}`).join('\n');
}

function promptAction() {
  showState();

  const actions = (game.player && typeof game.player.getAvailableActions === 'function')
    ? game.player.getAvailableActions()
    : ['wait'];

  // Add a quit option
  const menu = [...actions, 'quit'];

  console.log('\nAvailable actions:');
  console.log(formatActions(menu));

  rl.question('\nChoose an action (number or name): ', (answer) => {
    const choice = answer.trim().toLowerCase();

    // support numeric selection
    let action = null;
    const num = parseInt(choice, 10);
    if (!Number.isNaN(num) && num >= 1 && num <= menu.length) {
      action = menu[num - 1];
    } else {
      action = choice;
    }

    if (action === 'quit' || action === 'q' || action === 'exit') {
      console.log('Goodbye!');
      return rl.close();
    }

    switch (action) {
      case 'wait':
        try {
          const newMonth = game.waitAction();
          console.log(`\nAdvanced to: ${newMonth}`);
        } catch (err) {
          console.error('Error performing wait:', err.message);
        }
        break;
      case 'check_weather':
      case 'weather':
        try {
          if (game.engine && game.engine.weatherSystem) {
            console.log('\nCurrent weather:');
            console.log(game.engine.weatherSystem.toString());
          } else if (game.player && game.player.weatherVane) {
            console.log('\nCurrent weather conditions:');
            console.log(game.player.weatherVane);
          } else {
            console.log('\nNo weather information available');
          }
        } catch (err) {
          console.error('Error fetching weather:', err.message);
        }
        break;
      default:
        console.log(`Unknown action: ${action}`);
    }

    // Continue prompting
    return promptAction();
  });
}

promptAction();
