// Test Green Tea foresight functionality
const Game = require("../../engine/Game");
const ActionResolver = require("../../engine/ActionResolver");

function testGreenTeaForesight() {
  console.log("=== Testing Green Tea Foresight Functionality ===\n");
  
  const game = new Game();
  
  // Start with a seedling in garden and green tea in kitchen
  console.log("Initial state:");
  console.log(`Garden: ${game.player.garden.length} plants`);
  console.log(`Cafe: ${game.player.cafe.length} items`);
  console.log(`Plant state: ${game.player.garden[0].state}`);
  console.log(`Tea available: ${game.player.cafe[0].name}`);
  
  // Test consuming Green Tea
  console.log("\n--- Consuming Green Tea ---");
  const greenTea = game.player.cafe[0];
  const success = ActionResolver.resolve("consume cafe 0", game);
  
  if (success) {
    console.log("✅ Green Tea consumed successfully");
    console.log(`Plant predictions tracked: ${game.plantPredictions.size}`);
  } else {
    console.log("❌ Failed to consume Green Tea");
    return false;
  }
  
  // Check if prediction was stored
  const plant = game.player.garden[0];
  const prediction = game.plantPredictions.get(plant.id);
  
  if (prediction) {
    console.log("✅ Prediction stored successfully");
    console.log(`Actions remaining: ${prediction.actionsRemaining}`);
    console.log(`Prediction alive: ${prediction.prediction.alive}`);
    if (!prediction.prediction.alive) {
      console.log(`Death cause: ${prediction.prediction.deathCause}`);
      console.log(`Death season: ${prediction.prediction.deathSeason}`);
    }
  } else {
    console.log("❌ No prediction stored");
    return false;
  }
  
  // Test protective action tracking
  console.log("\n--- Testing Protective Actions ---");
  if (prediction.prediction.deathCause === 'drought') {
    console.log("Testing water protection...");
    ActionResolver.resolve("water garden 0", game);
    if (prediction.protectiveActions.has('water')) {
      console.log("✅ Water protection tracked");
    } else {
      console.log("❌ Water protection not tracked");
    }
  } else if (prediction.prediction.deathCause === 'frost') {
    console.log("Testing shelter protection...");
    ActionResolver.resolve("shelter garden 0", game);
    if (prediction.protectiveActions.has('shelter')) {
      console.log("✅ Shelter protection tracked");
    } else {
      console.log("❌ Shelter protection not tracked");
    }
  }
  
  // Test prediction enforcement after many actions
  console.log("\n--- Testing Prediction Enforcement ---");
  
  // Simulate 48 actions to test timeline enforcement
  let actionsSimulated = 0;
  while (actionsSimulated < 48 && game.plantPredictions.size > 0) {
    // Trigger weather (which calls checkPredictionEnforcement)
    game.triggerWeather();
    
    // If no actions left, end season
    if (game.player.actionsLeft <= 0) {
      game.endSeasonProcessing();
    } else {
      game.player.actionsLeft--;
    }
    
    actionsSimulated++;
  }
  
  console.log(`Simulated ${actionsSimulated} actions`);
  console.log(`Predictions remaining: ${game.plantPredictions.size}`);
  console.log(`Plant final state: ${plant.state}`);
  
  if (game.plantPredictions.size === 0) {
    console.log("✅ Prediction was enforced");
  } else {
    console.log("❌ Prediction was not enforced");
  }
  
  return true;
}

function testActionDurationUpdate() {
  console.log("\n=== Testing Action Duration Updates ===\n");
  
  const game = new Game();
  const plant = game.player.garden[0];
  
  // Test water action duration
  console.log("Testing water action duration...");
  ActionResolver.resolve("water garden 0", game);
  
  const waterDuration = plant.activeConditions['water'];
  if (waterDuration === 6) {
    console.log("✅ Water action duration updated to 6");
  } else {
    console.log(`❌ Water action duration is ${waterDuration}, expected 6`);
    return false;
  }
  
  // Test shelter action duration
  console.log("Testing shelter action duration...");
  ActionResolver.resolve("shelter garden 0", game);
  
  const shelterDuration = plant.activeConditions['sunlight'];
  if (shelterDuration === 6) {
    console.log("✅ Shelter action duration updated to 6");
  } else {
    console.log(`❌ Shelter action duration is ${shelterDuration}, expected 6`);
    return false;
  }
  
  return true;
}

// Run tests
console.log("Running Green Tea functionality tests...\n");

const test1 = testActionDurationUpdate();
const test2 = testGreenTeaForesight();

console.log("\n=== Test Results ===");
console.log(`Action Duration Update: ${test1 ? 'PASS' : 'FAIL'}`);
console.log(`Green Tea Foresight: ${test2 ? 'PASS' : 'FAIL'}`);

if (test1 && test2) {
  console.log("\n🎉 All tests passed!");
} else {
  console.log("\n❌ Some tests failed!");
  process.exit(1);
}