// Test failure cases for tea processing

const Game = require("../../engine/Game");
const ActionResolver = require("../../engine/ActionResolver");

function testFailureCases() {
  console.log("=== Testing Tea Processing Failure Cases ===\n");

  // Test 1: Rot vulnerability for raw tea leaves
  console.log("Test 1: Raw tea leaf rot vulnerability");
  const game1 = new Game();
  const rawLeaf = game1.createCard('tea_leaf_raw');
  game1.player.addCardToLocation(rawLeaf, 'kitchen');
  
  console.log("Before rot event:", game1.player.kitchen[0].name);
  
  // Simulate rot weather event
  game1.checkTeaProcessingFailures('rot');
  
  console.log("After rot event:", game1.player.kitchen[0] ? game1.player.kitchen[0].name : "No card");
  
  if (game1.player.kitchen[0] && game1.player.kitchen[0].definition.id === 'dead_leaves') {
    console.log("✅ Rot vulnerability works correctly\n");
  } else {
    console.log("❌ Rot vulnerability failed\n");
  }

  // Test 2: Withered tea leaf rot vulnerability
  console.log("Test 2: Withered tea leaf rot vulnerability");
  const game2 = new Game();
  const witheredLeaf = game2.createCard('tea_leaf_withered');
  game2.player.addCardToLocation(witheredLeaf, 'kitchen');
  
  console.log("Before rot event:", game2.player.kitchen[0].name);
  
  // Simulate rot weather event
  game2.checkTeaProcessingFailures('rot');
  
  console.log("After rot event:", game2.player.kitchen[0] ? game2.player.kitchen[0].name : "No card");
  
  if (game2.player.kitchen[0] && game2.player.kitchen[0].definition.id === 'dead_leaves') {
    console.log("✅ Withered rot vulnerability works correctly\n");
  } else {
    console.log("❌ Withered rot vulnerability failed\n");
  }

  // Test 3: Heat burn risk for raw tea leaves
  console.log("Test 3: Heat burn risk for raw tea leaves");
  const game3 = new Game();
  const rawLeaf3 = game3.createCard('tea_leaf_raw');
  game3.player.addCardToLocation(rawLeaf3, 'kitchen');
  
  console.log("Before heat event:", game3.player.kitchen[0].name);
  
  // Simulate heat weather event
  game3.checkTeaProcessingFailures('heat');
  
  console.log("After heat event:", game3.player.kitchen[0] ? game3.player.kitchen[0].name : "No card");
  
  if (game3.player.kitchen[0] && game3.player.kitchen[0].definition.id === 'dead_leaves') {
    console.log("✅ Heat burn risk works correctly\n");
  } else {
    console.log("❌ Heat burn risk failed\n");
  }

  // Test 4: Overoxidation test
  console.log("Test 4: Overoxidation test");
  const game4 = new Game();
  const oxidizingLeaf = game4.createCard('tea_leaf_oxidizing');
  oxidizingLeaf.oxidationProgress = 5; // Simulate excessive oxidation
  game4.player.addCardToLocation(oxidizingLeaf, 'kitchen');
  
  console.log("Before overoxidation check:", game4.player.kitchen[0].name, "| Progress:", oxidizingLeaf.oxidationProgress);
  
  // Simulate oxidation progress
  game4.progressOxidation();
  
  console.log("After overoxidation check:", game4.player.kitchen[0] ? game4.player.kitchen[0].name : "No card");
  
  if (game4.player.kitchen[0] && game4.player.kitchen[0].definition.id === 'dead_leaves') {
    console.log("✅ Overoxidation protection works correctly\n");
  } else {
    console.log("❌ Overoxidation protection failed\n");
  }

  // Test 5: Dead leaves composting
  console.log("Test 5: Dead leaves composting");
  const game5 = new Game();
  game5.player.actionsLeft = 10;
  const deadLeaves = game5.createCard('dead_leaves');
  game5.player.addCardToLocation(deadLeaves, 'kitchen');
  
  console.log("Before composting:", game5.player.kitchen[0].name);
  console.log("Shed before:", game5.player.shed.length, "items");
  
  ActionResolver.resolve("compost kitchen 0", game5);
  
  console.log("After composting:");
  console.log("Kitchen:", game5.player.kitchen.length > 0 ? game5.player.kitchen[0].name : "Empty");
  console.log("Shed:", game5.player.shed.length, "items");
  
  if (game5.player.shed.length > 0 && game5.player.shed[0].definition.id === 'fertilizer_token') {
    console.log("✅ Dead leaves composting works correctly\n");
  } else {
    console.log("❌ Dead leaves composting failed\n");
  }
}

testFailureCases();