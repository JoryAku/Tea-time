// Detailed test of the prediction system with various plant states

const Game = require("../../engine/Game");

function testPredictionSystemDetailed() {
  console.log("=== Detailed Prediction System Testing ===\n");

  // Test different plant states and conditions
  testSeedlingPredictions();
  testMaturePlantPredictions();
  testPlantWithProtections();
  
  console.log("\n✅ All detailed prediction tests completed!");
}

function testSeedlingPredictions() {
  console.log("Test 1: Seedling Predictions");
  const game = new Game();
  const plant = game.player.garden[0]; // seedling
  
  console.log(`Plant: ${plant.name} [${plant.state}]`);
  console.log(`Age: ${plant.age || 0}`);
  console.log(`State progress: ${plant.stateProgress || 0}`);
  
  const prediction = game.simulatePlantFuture(plant, 48);
  
  console.log(`Prediction result: ${prediction.alive ? 'ALIVE' : 'DEAD'}`);
  if (!prediction.alive) {
    console.log(`  Death action: ${prediction.deathInfo.action}`);
    console.log(`  Death cause: ${prediction.deathInfo.cause}`);
    console.log(`  Death season: ${prediction.deathInfo.season}`);
  }
  
  // Check forecast compliance
  const vulnerableEvents = getPlantVulnerabilities(plant);
  console.log(`Plant vulnerabilities: ${vulnerableEvents.join(', ')}`);
  
  if (prediction.alive) {
    const hasVulnerable = prediction.weatherForecast.some(event => vulnerableEvents.includes(event));
    console.log(`✅ Alive prediction - no vulnerable events: ${!hasVulnerable}`);
  } else {
    const deathEvent = prediction.weatherForecast[prediction.deathInfo.action - 1];
    const isVulnerable = vulnerableEvents.includes(deathEvent);
    console.log(`✅ Dead prediction - vulnerable event on death day: ${isVulnerable}`);
    
    const eventsBeforeDeath = prediction.weatherForecast.slice(0, prediction.deathInfo.action - 1);
    const hasEarlyVulnerable = eventsBeforeDeath.some(event => vulnerableEvents.includes(event));
    console.log(`✅ No vulnerable events before death: ${!hasEarlyVulnerable}`);
  }
  
  console.log(`Weather forecast sample: ${prediction.weatherForecast.slice(0, 10).join(', ')}`);
  console.log("");
}

function testMaturePlantPredictions() {
  console.log("Test 2: Mature Plant Predictions");
  const game = new Game();
  
  // Create a mature plant instead of seedling
  const maturePlant = game.createCard('tea_plant', 'mature');
  game.player.garden[0] = maturePlant;
  
  console.log(`Plant: ${maturePlant.name} [${maturePlant.state}]`);
  
  const prediction = game.simulatePlantFuture(maturePlant, 48);
  
  console.log(`Prediction result: ${prediction.alive ? 'ALIVE' : 'DEAD'}`);
  if (!prediction.alive) {
    console.log(`  Death action: ${prediction.deathInfo.action}`);
    console.log(`  Death cause: ${prediction.deathInfo.cause}`);
  }
  
  // Check forecast compliance
  const vulnerableEvents = getPlantVulnerabilities(maturePlant);
  console.log(`Plant vulnerabilities: ${vulnerableEvents.join(', ')}`);
  
  if (prediction.alive) {
    const hasVulnerable = prediction.weatherForecast.some(event => vulnerableEvents.includes(event));
    console.log(`✅ Alive prediction - no vulnerable events: ${!hasVulnerable}`);
  } else {
    const deathEvent = prediction.weatherForecast[prediction.deathInfo.action - 1];
    const isVulnerable = vulnerableEvents.includes(deathEvent);
    console.log(`✅ Dead prediction - vulnerable event on death day: ${isVulnerable}`);
  }
  
  console.log("");
}

function testPlantWithProtections() {
  console.log("Test 3: Plant with Protective Conditions");
  const game = new Game();
  const plant = game.player.garden[0]; // seedling
  
  // Add some protective conditions
  plant.activeConditions.water = 6; // Protection against drought
  plant.activeConditions.sunlight = 6; // Protection against frost
  
  console.log(`Plant: ${plant.name} [${plant.state}] with protections`);
  console.log(`Active conditions: ${Object.keys(plant.activeConditions).join(', ')}`);
  
  const prediction = game.simulatePlantFuture(plant, 48);
  
  console.log(`Prediction result: ${prediction.alive ? 'ALIVE' : 'DEAD'}`);
  if (!prediction.alive) {
    console.log(`  Death action: ${prediction.deathInfo.action}`);
    console.log(`  Death cause: ${prediction.deathInfo.cause}`);
  }
  
  console.log("");
}

function testVariousPlantStatesForSurvival() {
  console.log("Test 4: Testing Various Plant States for Survival");
  
  const plantStates = ['seedling', 'mature', 'flowering', 'fruiting'];
  
  for (const state of plantStates) {
    const game = new Game();
    const plant = game.createCard('tea_plant', state);
    
    // Add some variety to create different hash values
    plant.stateProgress = Math.floor(Math.random() * 5);
    plant.age = Math.floor(Math.random() * 3);
    
    game.player.garden[0] = plant;
    
    const prediction = game.simulatePlantFuture(plant, 48);
    const vulnerableEvents = getPlantVulnerabilities(plant);
    
    console.log(`${state}: ${prediction.alive ? 'ALIVE' : 'DEAD'} (vulnerabilities: ${vulnerableEvents.length})`);
    
    // Verify prediction follows rules
    if (prediction.alive) {
      const hasVulnerable = prediction.weatherForecast.some(event => vulnerableEvents.includes(event));
      if (hasVulnerable) {
        console.log(`  ❌ ERROR: Alive prediction contains vulnerable events!`);
      }
    } else {
      const deathEvent = prediction.weatherForecast[prediction.deathInfo.action - 1];
      const isVulnerable = vulnerableEvents.includes(deathEvent);
      if (!isVulnerable) {
        console.log(`  ❌ ERROR: Dead prediction lacks vulnerable event on death day!`);
      }
    }
  }
  
  console.log("");
}

function getPlantVulnerabilities(plant) {
  const stageDef = plant.definition.states[plant.state];
  if (!stageDef || !stageDef.vulnerabilities) {
    return [];
  }
  return stageDef.vulnerabilities.map(v => v.event);
}

testPredictionSystemDetailed();
testVariousPlantStatesForSurvival();