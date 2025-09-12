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
}

function promptAction() {
  showState();

  const possibleActions = game.player.getAvailableActions();
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

    // Continue
    return promptAction();
  });
}

promptAction();
