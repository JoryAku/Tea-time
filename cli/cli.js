const readline = require("readline");
const Game = require("../engine/Game");
// TODO update ActionResolver once epic is completed.
// const ActionResolver = require("../engine/ActionResolver");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const game = new Game();

console.log("=== Tea Time (Terminal) ===");

function showState() {
  console.log(`\n=== ${game.currentMonth.toUpperCase()} ===`);
  game.player.listCards();
  if (game.player.weatherVane) {
    console.log("\nCurrent weather conditions:");
    console.log(game.player.weatherVane);
  };
  // Log current active weather conditions for all plants in the garden
  if (game.player.garden.length > 0) {
    console.log("\nCurrent garden conditions:");
    game.player.garden.forEach((card, idx) => {
      // Collect all conditions, including duplicates for different durations
      let conds = [];
      if (card.activeConditions) {
        for (const [cond, turns] of Object.entries(card.activeConditions)) {
          conds.push(`${cond} (${turns} turns left)`);
        }
      }
      
      // Add harvest readiness status for mature plants
      let statusInfo = "";
      if (card.state === 'mature') {
        if (card.harvestReady) {
          statusInfo += " - ✅ Ready to harvest";
        } else {
          statusInfo += " - ❌ Not harvestable (wait for spring)";
        }
      }
      
      if (conds.length > 0) {
        const condStr = conds.join(", ");
        console.log(`  [${idx}] ${card.name} [${card.state}]: ${condStr}${statusInfo}`);
      } else {
        console.log(`  [${idx}] ${card.name} [${card.state}]: No active conditions${statusInfo}`);
      }
    });
  } else {
    console.log("\nGarden is empty.");
  }
}

function promptAction() {
  showState();
  rl.question("\nChoose an action: ", () => {
    // Remove all posisible actions except wait
    const action = "wait";
    if (action === "wait") {
      game.waitAction();
    }
    // Continue
    return promptAction();
  });
}

promptAction();
