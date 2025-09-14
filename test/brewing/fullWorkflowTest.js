// test/fullWorkflowTest.js
// Test the complete workflow from mature plant to harvesting and processing tea

const Game = require("../../engine/Game");
const ActionResolver = require("../../engine/ActionResolver");

function testFullWorkflow() {
  console.log("=== Testing Full Tea Workflow: Harvest → Process → Brew ===\n");

  const game = new Game();
  game.player.actionsLeft = 20; // Give plenty of actions

  // Create a mature tea plant (normally would take 36 actions to grow)
  const maturePlant = game.createCard('tea_plant', 'mature');
  game.player.garden[0] = maturePlant; // Replace the seedling with mature plant

  console.log("Starting setup:");
  console.log("Garden:", game.player.garden[0].name, "[" + game.player.garden[0].state + "]");
  console.log("Actions left:", game.player.actionsLeft);
  console.log("");

  // Step 1: Harvest tea leaves from mature plant
  console.log("Step 1: Harvesting tea leaves from mature plant");
  const harvestSuccess = ActionResolver.resolve("harvest garden 0", game);
  console.log("Harvest success:", harvestSuccess);
  console.log("Kitchen now contains:", game.player.kitchen.length > 0 ? game.player.kitchen[0].name : "Nothing");
  console.log("Actions left:", game.player.actionsLeft);
  console.log("");

  if (game.player.kitchen.length === 0) {
    console.log("❌ Harvest failed - no tea leaves in kitchen");
    return;
  }

  // Step 2: Process raw tea leaves into green tea (fastest path)
  console.log("Step 2a: Processing into Green Tea (Fix action)");
  const fixSuccess = ActionResolver.resolve("fix kitchen 0", game);
  console.log("Fix success:", fixSuccess);
  console.log("Kitchen now contains:", game.player.kitchen.length > 0 ? game.player.kitchen[0].name : "Nothing");
  console.log("Actions left:", game.player.actionsLeft);
  console.log("");

  // Step 3: Brew green tea
  console.log("Step 3a: Brewing Green Tea");
  const brewSuccess = ActionResolver.resolve("brew kitchen 0", game);
  console.log("Brew success:", brewSuccess);
  console.log("Cafe now contains:", game.player.cafe.length > 0 ? game.player.cafe[0].name : "Nothing");
  console.log("Kitchen now contains:", game.player.kitchen.length > 0 ? game.player.kitchen[0].name : "Nothing");
  console.log("Actions left:", game.player.actionsLeft);
  console.log("");

  // Test black tea workflow
  console.log("--- Testing Black Tea Workflow ---");
  
  // Harvest another raw leaf
  ActionResolver.resolve("harvest garden 0", game);
  console.log("Step 2b: Processing into Black Tea (Wither → Roll → Oxidize → Dry)");
  
  if (game.player.kitchen.length > 0) {
    console.log("  Wither:");
    ActionResolver.resolve("wither kitchen 0", game);
    console.log("    Result:", game.player.kitchen[0].name, "| Actions left:", game.player.actionsLeft);
    
    console.log("  Roll:");
    ActionResolver.resolve("roll kitchen 0", game);
    console.log("    Result:", game.player.kitchen[0].name, "| Actions left:", game.player.actionsLeft);
    
    console.log("  Oxidize (2 actions):");
    ActionResolver.resolve("oxidize kitchen 0", game);
    console.log("    Result:", game.player.kitchen[0].name, "| Actions left:", game.player.actionsLeft);
    
    console.log("  Dry:");
    ActionResolver.resolve("dry kitchen 0", game);
    console.log("    Result:", game.player.kitchen[0].name, "| Actions left:", game.player.actionsLeft);
    
    console.log("Step 3b: Brewing Black Tea");
    ActionResolver.resolve("brew kitchen 0", game);
    console.log("Cafe now contains:", game.player.cafe.map(c => c.name).join(", "));
    console.log("Actions left:", game.player.actionsLeft);
  } else {
    console.log("❌ No tea leaves in kitchen for black tea processing");
  }
  console.log("");

  // Test oolong tea workflow
  console.log("--- Testing Oolong Tea Workflow ---");
  
  // Harvest another raw leaf
  ActionResolver.resolve("harvest garden 0", game);
  console.log("Step 2c: Processing into Oolong Tea (Oxidize → Fix)");
  
  if (game.player.kitchen.length > 0) {
    console.log("  Oxidize (2 actions):");
    ActionResolver.resolve("oxidize kitchen 0", game);
    console.log("    Result:", game.player.kitchen[0].name, "| Actions left:", game.player.actionsLeft);
    
    console.log("  Fix (partial oxidation stop):");
    ActionResolver.resolve("fix kitchen 0", game);
    console.log("    Result:", game.player.kitchen[0].name, "| Actions left:", game.player.actionsLeft);
    
    console.log("Step 3c: Brewing Oolong Tea");
    ActionResolver.resolve("brew kitchen 0", game);
    console.log("Final cafe contains:", game.player.cafe.map(c => c.name).join(", "));
    console.log("Actions left:", game.player.actionsLeft);
  } else {
    console.log("❌ No tea leaves in kitchen for oolong tea processing");
  }
  console.log("");

  console.log("✅ Full workflow test completed!");
  console.log("Total teas produced:", game.player.cafe.length);
  console.log("Tea types:", game.player.cafe.map(c => c.name).join(", "));
  
  // Test tea consumption
  console.log("\n--- Testing Tea Consumption ---");
  if (game.player.cafe.length > 0) {
    console.log("Consuming Green Tea for weather prediction:");
    ActionResolver.resolve("consume cafe 0", game);
    console.log("Remaining teas in cafe:", game.player.cafe.map(c => c.name).join(", "));
  }
}

testFullWorkflow();