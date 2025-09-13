const readline = require("readline");
const Game = require("../engine/Game");
const ActionResolver = require("../engine/ActionResolver");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const game = new Game();

console.log("=== Tea Time (Terminal) ===");
console.log("Objective: grow plants and brew teas to eventually craft the Time Tea (prototype).");
console.log("Actions per season:", game.actionsPerSeason);
console.log("");

function showState() {
  console.log(`\n=== ${game.currentSeason.toUpperCase()} | Actions left: ${game.player.actionsLeft} ===`);
  game.player.listCards();
  // Log current active weather conditions for all plants in the garden
  if (game.player.garden.length > 0) {
    console.log("\nCurrent garden conditions:");
    game.player.garden.forEach((card, idx) => {
      // Collect all conditions, including duplicates for different durations
      let conds = [];
      if (card.activeConditions) {
        for (const [cond, turns] of Object.entries(card.activeConditions)) {
          for (let i = turns; i > 0; i--) {
            conds.push(`${cond} (${i} turns left)`);
          }
        }
      }
      if (conds.length > 0) {
        const condStr = conds.join(", ");
        console.log(`  [${idx}] ${card.name} [${card.state}]: ${condStr}`);
      } else {
        console.log(`  [${idx}] ${card.name} [${card.state}]: No active conditions`);
      }
    });
  } else {
    console.log("\nGarden is empty.");
  }
}

function promptAction() {
  showState();

  // Show plant actions for seeds in hand and shed
  let plantActions = [];
  game.player.hand.forEach((card, idx) => {
    if (card.state === 'seed') plantActions.push(`plant hand ${idx}`);
  });
  game.player.shed.forEach((card, idx) => {
    if (card.state === 'seed') plantActions.push(`plant shed ${idx}`);
  });
  // Add all other available actions
  let otherActions = [];
  game.player.getAvailableActions().forEach((a) => {
    if (a === 'wait' || !a.startsWith('plant')) otherActions.push(a);
  });
  // Ensure wait is always at index 0
  let possibleActions = [];
  const waitIdx = otherActions.indexOf('wait');
  if (waitIdx !== -1) {
    possibleActions.push('wait');
    otherActions.splice(waitIdx, 1);
  }
  possibleActions = possibleActions.concat(plantActions, otherActions);
  console.log("\nPossible actions (type the number):");
  possibleActions.forEach((a, i) => {
    if (a === "wait") {
      console.log(`  ${i}: wait`);
    } else {
      const [action, zone, idx] = a.split(" ");
      console.log(`  ${i}: ${action} ${idx} (${zone})`);
    }
  });

  rl.question("\nChoose an action: ", (input) => {
    const choice = parseInt(input.trim(), 10);
    const action = possibleActions[choice];
    if (typeof action === "undefined") {
      console.log("❌ Invalid choice. Type the number shown.");
      return promptAction();
    }

    if (action === "wait") {
      game.waitAction();
    } else if (action.startsWith('plant')) {
      const [_, zone, idx] = action.split(' ');
      game.plantSeedFromZone(zone, parseInt(idx, 10));
      // reduce action only if action succeeded
      if (game.player.actionsLeft > 0) game.player.actionsLeft -= 1;
      // after each action, trigger weather
      game.triggerWeather();
      if (game.player.actionsLeft <= 0) {
        game.endSeasonProcessing();
      }
    } else {
      const success = ActionResolver.resolve(action, game);
      if (success) {
        // reduce action only if action succeeded
        if (game.player.actionsLeft > 0) game.player.actionsLeft -= 1;
        // after each action, trigger weather
        game.triggerWeather();
      }
      // If no actions remain, end-season processing will run
      if (game.player.actionsLeft <= 0) {
        game.endSeasonProcessing();
      }
    }
    // Continue
    return promptAction();
  });
}

promptAction();
