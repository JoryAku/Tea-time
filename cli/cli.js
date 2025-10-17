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

function showGarden() {
  try {
    // Request detailed plant info and layers if supported
    const snapshot = (game.peekGarden && typeof game.peekGarden === 'function') ? game.peekGarden({ detailed: true, layers: true }) : null;
    if (!snapshot) {
      console.log('\nNo garden data available.');
      return;
    }

  const { plants, field, layers } = snapshot;

    console.log('\n=== Garden Snapshot ===');

    if (!field) {
      console.log('\n(No field grid available)\nPlant list:');
      if (!plants || plants.length === 0) {
        console.log('  (no plants)');
        return;
      }
      plants.forEach((p, i) => {
        console.log(`  ${i + 1}) ${p.name || p.id} — stage:${p.stage} health:${p.health} growth:${p.growth} coords:${p.x},${p.y}`);
      });
      return;
    }

    // Build a simple text grid of the field (0..width-1, 0..height-1)
    const w = field.width || 0;
    const h = field.height || 0;

  // Create empty grid filled with '.'
  const grid = new Array(h).fill(null).map(() => new Array(w).fill('.'));

    // Place plants that have x/y inside the visible grid
    const placed = [];
    (plants || []).forEach((p, i) => {
      if (typeof p.x === 'number' && typeof p.y === 'number') {
        const x = p.x;
        const y = p.y;
        if (x >= 0 && x < w && y >= 0 && y < h) {
          const label = (p.name && p.name[0]) ? p.name[0].toUpperCase() : (p.id ? p.id[0].toUpperCase() : 'P');
          // If occupied, mark as '*'
          grid[y][x] = grid[y][x] === '.' ? label : '*';
          placed.push({ label, x, y, name: p.name || p.id, stage: p.stage, health: p.health, growth: p.growth });
        }
      }
    });

    // Print header with x coordinates
    let header = '    ';
    for (let x = 0; x < w; x++) header += x.toString().padStart(3, ' ');
    console.log(header);

    // If layers snapshot available, print a compact per-cell summary (top-layer light)
    if (Array.isArray(layers)) {
      console.log('\nLayered light (emergent light per cell)');
      let header2 = '    ';
      for (let x = 0; x < w; x++) header2 += x.toString().padStart(6, ' ');
      console.log(header2);
      for (let y = 0; y < h; y++) {
        let line = y.toString().padStart(3, ' ') + ' |';
        for (let x = 0; x < w; x++) {
          const cell = layers[y] && layers[y][x] ? layers[y][x] : null;
          const emergentLight = cell && cell.emergent ? (Math.round((cell.emergent.light || 0) * 100) / 100).toFixed(2) : '  . ';
          line += '  ' + emergentLight.toString().padStart(4, ' ');
        }
        console.log(line);
      }
    }

    for (let y = 0; y < h; y++) {
      let line = y.toString().padStart(3, ' ') + ' |';
      for (let x = 0; x < w; x++) {
        line += '  ' + (grid[y][x] || '.');
      }
      console.log(line);
    }

    console.log('\nPlant details:');
    if (placed.length === 0) {
      console.log('  (no plants within visible grid)');
    } else {
      placed.forEach((p, i) => {
        console.log(`  ${i + 1}) ${p.name} @ (${p.x},${p.y}) — ${p.label} stage:${p.stage} health:${p.health} growth:${p.growth}`);
      });
    }

    // Also list plants without coordinates
    const unplaced = (plants || []).filter(p => typeof p.x !== 'number' || typeof p.y !== 'number');
    if (unplaced.length > 0) {
      console.log('\nPlants without coordinates:');
      unplaced.forEach((p, i) => {
        console.log(`  ${i + 1}) ${p.name || p.id} — stage:${p.stage} health:${p.health} growth:${p.growth}`);
      });
    }

  } catch (e) {
    console.error('Error showing garden:', e && e.message);
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
  // Always expose the show_garden command in the CLI menu (not necessarily a player action)
  const extraCmds = ['show_garden'];
  const menu = [...actions, ...extraCmds, 'quit'];

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
      case 'show_garden':
      case 'garden':
        try {
          showGarden();
        } catch (err) {
          console.error('Error showing garden:', err && err.message);
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
