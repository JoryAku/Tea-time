// Test to verify that protections actually work to save plants

const Game = require("../../engine/Game");

function testProtectionEffectiveness() {
  console.log("=== Testing Protection Effectiveness ===\n");

  // Test 1: Plant without protection (should die)
  console.log("Test 1: Plant without any protection");
  const game1 = new Game();
  const plant1 = game1.player.garden[0];
  
  console.log(`Plant: ${plant1.name} [${plant1.state}]`);
  console.log(`Vulnerabilities: ${plant1.definition.states[plant1.state].vulnerabilities.map(v => v.event).join(', ')}`);
  console.log(`Active conditions: ${Object.keys(plant1.activeConditions || {}).join(', ') || 'none'}`);
  
  const timeline1 = game1.engine.createTimeline(48);
  const deaths1 = timeline1.getDeathPredictions();
  
  console.log(`Result: ${deaths1.length > 0 ? 'DIES' : 'SURVIVES'}`);
  if (deaths1.length > 0) {
    console.log(`  Death action: ${deaths1[0].deathAction}, cause: ${deaths1[0].cause}`);
  }
  console.log("");

  // Test 2: Plant with water protection only
  console.log("Test 2: Plant with water protection (6 actions)");
  const game2 = new Game();
  const plant2 = game2.player.garden[0];
  
  // Apply water protection
  plant2.activeConditions = { water: 6 };
  console.log(`Plant: ${plant2.name} [${plant2.state}]`);
  console.log(`Active conditions: ${Object.keys(plant2.activeConditions || {}).join(', ')}`);
  
  const timeline2 = game2.engine.createTimeline(48);
  const deaths2 = timeline2.getDeathPredictions();
  
  console.log(`Result: ${deaths2.length > 0 ? 'DIES' : 'SURVIVES'}`);
  if (deaths2.length > 0) {
    console.log(`  Death action: ${deaths2[0].deathAction}, cause: ${deaths2[0].cause}`);
  }
  console.log("");

  // Test 3: Plant with shelter protection only
  console.log("Test 3: Plant with shelter protection (6 actions)");
  const game3 = new Game();
  const plant3 = game3.player.garden[0];
  
  // Apply shelter protection
  plant3.activeConditions = { sunlight: 6 };
  console.log(`Plant: ${plant3.name} [${plant3.state}]`);
  console.log(`Active conditions: ${Object.keys(plant3.activeConditions || {}).join(', ')}`);
  
  const timeline3 = game3.engine.createTimeline(48);
  const deaths3 = timeline3.getDeathPredictions();
  
  console.log(`Result: ${deaths3.length > 0 ? 'DIES' : 'SURVIVES'}`);
  if (deaths3.length > 0) {
    console.log(`  Death action: ${deaths3[0].deathAction}, cause: ${deaths3[0].cause}`);
  }
  console.log("");

  // Test 4: Plant with both protections
  console.log("Test 4: Plant with both water and shelter protection");
  const game4 = new Game();
  const plant4 = game4.player.garden[0];
  
  // Apply both protections
  plant4.activeConditions = { water: 6, sunlight: 6 };
  console.log(`Plant: ${plant4.name} [${plant4.state}]`);
  console.log(`Active conditions: ${Object.keys(plant4.activeConditions || {}).join(', ')}`);
  
  const timeline4 = game4.engine.createTimeline(48);
  const deaths4 = timeline4.getDeathPredictions();
  
  console.log(`Result: ${deaths4.length > 0 ? 'DIES' : 'SURVIVES'}`);
  if (deaths4.length > 0) {
    console.log(`  Death action: ${deaths4[0].deathAction}, cause: ${deaths4[0].cause}`);
  }
  console.log("");

  // Test 5: Plant with long-lasting protections
  console.log("Test 5: Plant with long-lasting protections (48 actions each)");
  const game5 = new Game();
  const plant5 = game5.player.garden[0];
  
  // Apply long-lasting protections
  plant5.activeConditions = { water: 48, sunlight: 48 };
  console.log(`Plant: ${plant5.name} [${plant5.state}]`);
  console.log(`Active conditions: ${Object.keys(plant5.activeConditions || {}).join(', ')}`);
  
  const timeline5 = game5.engine.createTimeline(48);
  const deaths5 = timeline5.getDeathPredictions();
  
  console.log(`Result: ${deaths5.length > 0 ? 'DIES' : 'SURVIVES'}`);
  if (deaths5.length > 0) {
    console.log(`  Death action: ${deaths5[0].deathAction}, cause: ${deaths5[0].cause}`);
  }
  console.log("");

  console.log("✅ Protection effectiveness test completed!");
}

function testProtectionDuration() {
  console.log("\n=== Testing Protection Duration Logic ===\n");

  const game = new Game();
  const plant = game.player.garden[0];
  
  // Test what happens when protections expire
  console.log("Testing protection expiration during timeline simulation:");
  console.log("Setting water protection for 10 actions...");
  
  plant.activeConditions = { water: 10 };
  
  // Manually simulate a few timeline steps to see protection degradation
  const timeline = game.engine.createTimeline(48);
  
  // Check timeline events around action 10-15 to see if plant dies after protection expires
  console.log("\nAnalyzing timeline around protection expiration:");
  for (let action = 8; action <= 15; action++) {
    const event = timeline.getWeatherAtAction(action);
    if (event) {
      console.log(`  Action ${action}: ${event.weather} in ${event.season}`);
    }
  }
  
  const deaths = timeline.getDeathPredictions();
  if (deaths.length > 0) {
    const death = deaths[0];
    console.log(`\nPlant death prediction: Action ${death.deathAction}, cause: ${death.cause}`);
    if (death.deathAction > 10) {
      console.log("✅ Plant dies after protection expires (as expected)");
    } else {
      console.log("⚠️  Plant dies while still protected");
    }
  } else {
    console.log("\n✅ Plant survives entire timeline (protection effective)");
  }
  
  console.log("\n✅ Protection duration test completed!");
}

// Run the tests
testProtectionEffectiveness();
testProtectionDuration();