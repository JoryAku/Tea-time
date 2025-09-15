// Demo script to show harvest readiness feature in CLI-like format

const Game = require("./engine/Game");
const ActionResolver = require("./engine/ActionResolver");

function demoHarvestReadiness() {
  console.log("=== Harvest Readiness Feature Demo ===\n");

  const game = new Game();
  
  // Create a mature tea plant for demonstration
  const maturePlant = game.createCard('tea_plant', 'mature');
  maturePlant.harvestReady = true; // Set to harvestable (spring)
  game.player.garden[0] = maturePlant;
  game.player.actionsLeft = 10;

  function showGameState(title) {
    console.log(`\n=== ${title} ===`);
    console.log(`Season: ${game.currentSeason.toUpperCase()} | Actions left: ${game.player.actionsLeft}`);
    
    console.log("\nGARDEN:");
    game.player.garden.forEach((card, idx) => {
      console.log(`  ${idx}: ${card.name} [${card.state}]`);
    });
    
    console.log("\nKITCHEN:");
    if (game.player.kitchen.length > 0) {
      game.player.kitchen.forEach((card, idx) => {
        console.log(`  ${idx}: ${card.name} [${card.state}]`);
      });
    } else {
      console.log("  (empty)");
    }
    
    console.log("\nCurrent garden conditions:");
    game.player.garden.forEach((card, idx) => {
      let conds = [];
      if (card.activeConditions) {
        for (const [cond, turns] of Object.entries(card.activeConditions)) {
          conds.push(`${cond} (${turns} turns left)`);
        }
      }
      
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
    
    console.log("\nAvailable actions:");
    const actions = game.player.getAvailableActions();
    actions.forEach((action, idx) => {
      if (action === 'wait') {
        console.log(`  ${idx}: wait`);
      } else {
        const [actionName, zone, index] = action.split(' ');
        console.log(`  ${idx}: ${actionName} ${index} (${zone})`);
      }
    });
  }

  // Demo 1: Harvestable mature plant in spring
  showGameState("SPRING - Mature Plant Ready to Harvest");
  
  // Perform harvest
  console.log("\n🌿 Performing harvest action...");
  const harvestResult = ActionResolver.resolve("harvest garden 0", game);
  console.log(`Harvest result: ${harvestResult}`);
  
  showGameState("AFTER HARVEST - Plant No Longer Harvestable");
  
  // Demo 2: Show what happens in other seasons
  console.log("\n\n🍂 Simulating season change to SUMMER...");
  game.engine.plantManager.processPlantProgression(maturePlant, 'summer');
  showGameState("SUMMER - Mature Plant Not Harvestable");
  
  console.log("\n\n❄️ Simulating season change to WINTER...");
  game.engine.plantManager.processPlantProgression(maturePlant, 'winter');
  showGameState("WINTER - Mature Plant Not Harvestable");
  
  console.log("\n\n🌸 Simulating season change to SPRING...");
  game.engine.plantManager.processPlantProgression(maturePlant, 'spring');
  showGameState("SPRING AGAIN - Plant Ready to Harvest");
  
  console.log("\n✅ Harvest readiness feature demonstration complete!");
  console.log("\nKey Features Demonstrated:");
  console.log("• Mature plants show harvest readiness status in garden conditions");
  console.log("• Harvest action only available when harvestReady = true (spring)");
  console.log("• After harvesting, plant is no longer harvestable until next spring");
  console.log("• Seasonal transitions properly update harvest readiness");
}

demoHarvestReadiness();