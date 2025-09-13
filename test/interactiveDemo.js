// test/interactiveDemo.js
// Demo the complete tea processing system interactively

const Game = require("../engine/Game");
const ActionResolver = require("../engine/ActionResolver");

function showGameState(game, title) {
  console.log(`\n=== ${title} ===`);
  console.log(`Actions left: ${game.player.actionsLeft}`);
  console.log(`Season: ${game.currentSeason.toUpperCase()}`);
  
  if (game.player.garden.length > 0) {
    console.log("Garden:", game.player.garden.map(c => `${c.name} [${c.state}]`).join(", "));
  }
  if (game.player.kitchen.length > 0) {
    console.log("Kitchen:", game.player.kitchen.map(c => {
      let name = `${c.name}`;
      if (c.oxidationActionsLeft > 0) name += ` (${c.oxidationActionsLeft} oxidation left)`;
      return name;
    }).join(", "));
  }
  if (game.player.cafe.length > 0) {
    console.log("Cafe:", game.player.cafe.map(c => c.name).join(", "));
  }
  if (game.player.shed.length > 0) {
    console.log("Shed:", game.player.shed.map(c => c.name).join(", "));
  }
  console.log("");
}

function demoCompleteWorkflow() {
  console.log("🍃 === TEA TIME: Complete Processing Demo === 🍃");
  
  const game = new Game();
  game.player.actionsLeft = 25; // Give plenty of actions for demo
  
  // Start with a mature plant ready for harvest
  const maturePlant = game.createCard('tea_plant', 'mature');
  game.player.garden[0] = maturePlant;
  
  showGameState(game, "Starting Conditions");
  
  console.log("📋 OBJECTIVE: Harvest tea leaves and create all three types of tea!");
  console.log("   • Green Tea: Raw → Fix (1 action) → Brew");
  console.log("   • Black Tea: Raw → Wither → Roll → Oxidize → Dry (5 actions) → Brew");
  console.log("   • Oolong Tea: Raw → Oxidize → Fix (4 actions) → Brew");
  console.log("");

  // === GREEN TEA PATHWAY ===
  console.log("🌱 GREEN TEA PATHWAY (Fastest: 2 actions total)");
  
  console.log("1. Harvesting fresh tea leaves...");
  ActionResolver.resolve("harvest garden 0", game);
  showGameState(game, "After Harvest");
  
  console.log("2. Fixing (heating) to preserve green color...");
  ActionResolver.resolve("fix kitchen 0", game);
  showGameState(game, "After Fix - Green Tea Leaves Ready");
  
  console.log("3. Brewing green tea...");
  ActionResolver.resolve("brew kitchen 0", game);
  showGameState(game, "Green Tea Complete!");

  // === BLACK TEA PATHWAY ===
  console.log("🌿 BLACK TEA PATHWAY (Traditional: 5 actions total)");
  
  console.log("1. Harvesting more tea leaves...");
  ActionResolver.resolve("harvest garden 0", game);
  
  console.log("2. Withering to reduce moisture...");
  ActionResolver.resolve("wither kitchen 0", game);
  
  console.log("3. Rolling to break cell walls...");
  ActionResolver.resolve("roll kitchen 0", game);
  
  console.log("4. Starting oxidation process (2 actions)...");
  ActionResolver.resolve("oxidize kitchen 0", game);
  showGameState(game, "Oxidation Started");
  
  console.log("5. Drying to complete black tea...");
  ActionResolver.resolve("dry kitchen 0", game);
  showGameState(game, "After Dry - Black Tea Leaves Ready");
  
  console.log("6. Brewing black tea...");
  ActionResolver.resolve("brew kitchen 0", game);
  showGameState(game, "Black Tea Complete!");

  // === OOLONG TEA PATHWAY ===
  console.log("🍂 OOLONG TEA PATHWAY (Partial oxidation: 4 actions total)");
  
  console.log("1. Harvesting final batch of tea leaves...");
  ActionResolver.resolve("harvest garden 0", game);
  
  console.log("2. Starting partial oxidation (2 actions)...");
  ActionResolver.resolve("oxidize kitchen 0", game);
  showGameState(game, "Oolong Oxidation Started");
  
  console.log("3. Fixing to stop oxidation partway...");
  ActionResolver.resolve("fix kitchen 0", game);
  showGameState(game, "After Partial Fix - Oolong Tea Leaves Ready");
  
  console.log("4. Brewing oolong tea...");
  ActionResolver.resolve("brew kitchen 0", game);
  showGameState(game, "Oolong Tea Complete!");

  // === TEA TASTING ===
  console.log("🍵 TEA TASTING & EFFECTS");
  
  console.log("Drinking Green Tea (reveals weather forecast):");
  ActionResolver.resolve("consume cafe 0", game);
  
  console.log("Drinking Black Tea (grants future action):");
  ActionResolver.resolve("consume cafe 1", game);
  showGameState(game, "After Tea Effects");
  
  console.log("Final inventory:");
  console.log("• Actions remaining:", game.player.actionsLeft);
  console.log("• Teas left:", game.player.cafe.map(c => c.name).join(", ") || "None");
  console.log("• Garden still contains:", game.player.garden.map(c => `${c.name} [${c.state}]`).join(", "));
  
  console.log("\n🎉 DEMO COMPLETE! All three tea processing pathways demonstrated successfully!");
  console.log("   ✅ Green Tea (fast, preserves antioxidants)");  
  console.log("   ✅ Black Tea (full oxidation, bold flavor)");
  console.log("   ✅ Oolong Tea (partial oxidation, complex flavor)");
  console.log("\n🌱 The mature tea plant remains in your garden for future harvests!");
}

demoCompleteWorkflow();