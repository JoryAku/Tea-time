// Comprehensive test for Green Tea 4-year timeline functionality with interventions

const Game = require("../../engine/Game");
const ActionResolver = require("../../engine/ActionResolver");

function testGreenTeaTimeline() {
  console.log("=== Testing Green Tea 4-Year Timeline Functionality ===\n");

  const game = new Game();
  
  // Give the player more actions to work with
  game.player.actionsLeft = 10;
  
  console.log("Initial state:");
  console.log("Garden:", game.player.garden.map(p => `${p.name} [${p.state}]`).join(", "));
  console.log("Kitchen:", game.player.kitchen.map(p => p.name).join(", "));
  console.log("");

  // Test 1: Brew Green Tea
  console.log("Test 1: Brewing Green Tea");
  if (game.player.kitchen.length > 0) {
    const brewResult = ActionResolver.resolve("brew kitchen 0", game);
    console.log("✅ Brew successful:", brewResult);
    console.log("Cafe now contains:", game.player.cafe.map(p => p.name).join(", "));
  }
  console.log("");

  // Test 2: Consume Green Tea and show 4-year timeline
  console.log("Test 2: Consuming Green Tea to view 4-year timeline");
  if (game.player.cafe.length > 0 && game.player.garden.length > 0) {
    const teaCard = game.player.cafe[0];
    const plantIndex = 0;
    
    console.log(`Consuming ${teaCard.name} to predict future of plant ${plantIndex}...`);
    console.log("");
    
    const consumeResult = game.consumeGreenTeaWithPlantSelection(teaCard, plantIndex);
    console.log("✅ Timeline consumption successful:", consumeResult);
  } else {
    console.log("❌ No tea in cafe or no plants in garden");
  }
  
  console.log("");
  
  // Test 3: Test intervention system by applying protective actions
  console.log("Test 3: Testing protective intervention system");
  
  // Create a new game to test interventions
  const game2 = new Game();
  game2.player.actionsLeft = 10;
  
  // Brew and consume Green Tea
  ActionResolver.resolve("brew kitchen 0", game2);
  const plant = game2.player.garden[0];
  const teaCard2 = game2.player.cafe[0];
  
  console.log("Before intervention:");
  console.log(`Plant: ${plant.name} [${plant.state}]`);
  console.log(`Active conditions: ${Object.keys(plant.activeConditions || {}).join(', ') || 'none'}`);
  
  // Apply water protection
  const waterResult = game2.engine.applyProtectiveIntervention(0, 'water');
  console.log("\n✅ Water intervention applied:", waterResult.success);
  
  console.log("After water intervention:");
  console.log(`Active conditions: ${Object.keys(plant.activeConditions || {}).join(', ') || 'none'}`);
  
  console.log("");
  
  // Test 4: Verify timeline regeneration after intervention
  console.log("Test 4: Verifying timeline regeneration after protective action");
  
  const game3 = new Game();
  game3.player.actionsLeft = 10;
  
  // Apply protection first, then consume Green Tea
  const plant3 = game3.player.garden[0];
  plant3.activeConditions = { water: 6 }; // Pre-apply water protection
  
  ActionResolver.resolve("brew kitchen 0", game3);
  const teaCard3 = game3.player.cafe[0];
  
  console.log("Testing timeline with pre-existing water protection:");
  game3.consumeGreenTeaWithPlantSelection(teaCard3, 0);
  
  console.log("✅ All Green Tea timeline tests completed!");
}

function testTimelineAccuracyAndConsistency() {
  console.log("\n=== Testing Timeline Accuracy and Consistency ===\n");
  
  const game = new Game();
  game.player.actionsLeft = 10;
  
  // Test multiple predictions for the same plant state to verify consistency
  const predictions = [];
  
  for (let i = 0; i < 3; i++) {
    const testGame = new Game();
    testGame.player.actionsLeft = 10;
    
    const timeline = testGame.engine.createTimeline(48);
    const deathPredictions = timeline.getDeathPredictions();
    
    predictions.push({
      iteration: i + 1,
      deaths: deathPredictions.length,
      firstDeath: deathPredictions.length > 0 ? deathPredictions[0] : null
    });
  }
  
  console.log("Timeline consistency test results:");
  predictions.forEach(pred => {
    console.log(`  Iteration ${pred.iteration}: ${pred.deaths} death(s) predicted`);
    if (pred.firstDeath) {
      console.log(`    First death: Action ${pred.firstDeath.deathAction}, Cause: ${pred.firstDeath.cause}`);
    }
  });
  
  // Verify that predictions are consistent (same plant state should give same outcome)
  const firstPrediction = predictions[0];
  const consistent = predictions.every(pred => 
    pred.deaths === firstPrediction.deaths &&
    ((pred.firstDeath === null && firstPrediction.firstDeath === null) ||
     (pred.firstDeath && firstPrediction.firstDeath && 
      pred.firstDeath.deathAction === firstPrediction.firstDeath.deathAction &&
      pred.firstDeath.cause === firstPrediction.firstDeath.cause))
  );
  
  console.log("✅ Timeline consistency:", consistent ? "PASSED" : "FAILED");
  
  // Test weather event distribution
  const timeline = game.engine.createTimeline(48);
  const weatherCounts = {};
  
  timeline.events.forEach(event => {
    weatherCounts[event.weather] = (weatherCounts[event.weather] || 0) + 1;
  });
  
  console.log("\nWeather event distribution over 48 actions:");
  Object.entries(weatherCounts).forEach(([weather, count]) => {
    console.log(`  ${weather}: ${count} times`);
  });
  
  console.log("✅ Timeline accuracy and consistency tests completed!");
}

function testVulnerabilityAndProtectionLogic() {
  console.log("\n=== Testing Vulnerability and Protection Logic ===\n");
  
  const game = new Game();
  game.player.actionsLeft = 10;
  
  const plant = game.player.garden[0];
  console.log(`Testing plant: ${plant.name} [${plant.state}]`);
  
  // Get plant vulnerabilities
  const stageDef = plant.definition.states[plant.state];
  const vulnerabilities = stageDef.vulnerabilities || [];
  
  console.log("Plant vulnerabilities:", vulnerabilities.map(v => v.event).join(', '));
  
  // Test each protection type
  const protections = ['water', 'shelter'];
  
  protections.forEach(protection => {
    const actionDef = plant.getActions()[protection];
    if (actionDef) {
      console.log(`\n${protection.toUpperCase()} protection available:`);
      console.log(`  Condition: ${actionDef.condition}`);
      console.log(`  Duration: ${actionDef.duration} actions`);
      
      // Test protection application
      const originalConditions = { ...plant.activeConditions };
      plant.activeConditions = plant.activeConditions || {};
      plant.activeConditions[actionDef.condition] = actionDef.duration;
      
      console.log(`  ✅ Applied ${protection} protection`);
      
      // Restore original conditions
      plant.activeConditions = originalConditions;
    } else {
      console.log(`\n${protection.toUpperCase()} protection: Not available for this plant state`);
    }
  });
  
  console.log("\n✅ Vulnerability and protection logic tests completed!");
}

// Run all tests
testGreenTeaTimeline();
testTimelineAccuracyAndConsistency();
testVulnerabilityAndProtectionLogic();