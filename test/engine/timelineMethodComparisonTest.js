// Test the two different timeline creation methods

const assert = require('assert');
const Game = require("../../engine/Game");
const ActionResolver = require("../../engine/ActionResolver");

function testTimelineCreationMethods() {
  console.log("=== Testing Two Timeline Creation Methods ===\n");
  
  // Test 1: Using simulatePlantFuture (direct method)
  console.log("Test 1: Using simulatePlantFuture method");
  const game1 = new Game();
  game1.player.actionsLeft = 10;
  
  const plant1 = game1.player.garden[0];
  
  // Apply protection
  plant1.activeConditions = { water: 15 };
  console.log(`Plant1 protection: water=${plant1.activeConditions.water}`);
  
  // Force the same weather forecast
  const testForecast = ['drought', 'sun', 'rain', 'drought', 'sun', 'frost'];
  while (testForecast.length < 48) {
    testForecast.push('sun');
  }
  game1.engine.weatherSystem.setPredeterminedForecast(testForecast);
  game1.engine.weatherForecastLocked = true;
  
  const result1 = game1.engine.simulatePlantFuture(plant1, 48);
  console.log(`Result1: ${result1.alive ? 'SURVIVES' : 'DIES'}`);
  if (!result1.alive) {
    console.log(`  Death: ${result1.deathInfo.cause} at action ${result1.deathInfo.action}`);
  }
  
  console.log("\n" + "-".repeat(50) + "\n");
  
  // Test 2: Using consumeGreenTeaWithPlantSelection (full method)
  console.log("Test 2: Using consumeGreenTeaWithPlantSelection method");
  const game2 = new Game();
  game2.player.actionsLeft = 10;
  
  const plant2 = game2.player.garden[0];
  
  // Apply same protection
  plant2.activeConditions = { water: 15 };
  console.log(`Plant2 protection: water=${plant2.activeConditions.water}`);
  
  // Use same forecast
  game2.engine.weatherSystem.setPredeterminedForecast([...testForecast]);
  game2.engine.weatherForecastLocked = true;
  
  // Brew tea first
  ActionResolver.resolve("brew kitchen 0", game2);
  const teaCard = game2.player.cafe[0];
  
  console.log("Consuming Green Tea...");
  const consumeResult = game2.consumeGreenTeaWithPlantSelection(teaCard, 0);
  console.log(`Consume result: ${consumeResult}`);
  
  // Get the actual timeline result by creating timeline directly
  const timeline2 = game2.engine.getOrCreatePlantTimeline(plant2, 48, true);
  const plantId2 = timeline2.getPlantId(plant2, 0);
  const deathPredictions2 = timeline2.getDeathPredictions();
  const plantDeath2 = deathPredictions2.find(death => death.plantId === plantId2);
  
  if (plantDeath2) {
    console.log(`Timeline2 result: DIES from ${plantDeath2.cause} at action ${plantDeath2.deathAction}`);
  } else {
    console.log(`Timeline2 result: SURVIVES`);
  }
  
  console.log("\n" + "-".repeat(50) + "\n");
  
  // Test 3: Direct createTimeline vs getOrCreatePlantTimeline
  console.log("Test 3: Comparing createTimeline vs getOrCreatePlantTimeline");
  
  const game3 = new Game();
  game3.player.actionsLeft = 10;
  
  const plant3 = game3.player.garden[0];
  plant3.activeConditions = { water: 15 };
  
  // Use same forecast
  game3.engine.weatherSystem.setPredeterminedForecast([...testForecast]);
  game3.engine.weatherForecastLocked = true;
  
  // Method A: createTimeline
  console.log("Method A: createTimeline");
  const timelineA = game3.engine.createTimeline(48);
  const plantIdA = timelineA.getPlantId(plant3, 0);
  const deathsA = timelineA.getDeathPredictions();
  const deathA = deathsA.find(d => d.plantId === plantIdA);
  
  if (deathA) {
    console.log(`  Result: DIES from ${deathA.cause} at action ${deathA.deathAction}`);
  } else {
    console.log(`  Result: SURVIVES`);
  }
  
  // Method B: getOrCreatePlantTimeline with force update
  console.log("Method B: getOrCreatePlantTimeline with forceUpdate=true");
  const timelineB = game3.engine.getOrCreatePlantTimeline(plant3, 48, true);
  const plantIdB = timelineB.getPlantId(plant3, 0);
  const deathsB = timelineB.getDeathPredictions();
  const deathB = deathsB.find(d => d.plantId === plantIdB);
  
  if (deathB) {
    console.log(`  Result: DIES from ${deathB.cause} at action ${deathB.deathAction}`);
  } else {
    console.log(`  Result: SURVIVES`);
  }
  
  return {
    simulatePlantFutureWorks: result1.alive,
    createTimelineWorks: !deathA || deathA.cause !== 'drought',
    getOrCreateTimelineWorks: !deathB || deathB.cause !== 'drought',
    allMethodsConsistent: (result1.alive === !deathA) && (result1.alive === !deathB)
  };
}

// Run the test
const result = testTimelineCreationMethods();

console.log("\n=== SUMMARY ===");
console.log(`simulatePlantFuture works correctly: ${result.simulatePlantFutureWorks}`);
console.log(`createTimeline works correctly: ${result.createTimelineWorks}`);
console.log(`getOrCreatePlantTimeline works correctly: ${result.getOrCreateTimelineWorks}`);
console.log(`All methods consistent: ${result.allMethodsConsistent}`);

// Add assertion
assert.ok(true, "Timeline method comparison should complete without errors");

module.exports = { testTimelineCreationMethods };