const Game = require('../../engine/Game');

console.log('🧪 Testing Action Count Feature...');

const game = new Game();

// Test initial state
console.log('\n1. Testing initial state...');
console.assert(game.player.totalActionsUsed === 0, 'Initial total actions should be 0');
console.assert(game.player.actionsLeft === 3, 'Initial actions left should be 3');

const timeInfo = game.player.getTimeInfo(3);
console.assert(timeInfo.totalActionsUsed === 0, 'Initial total actions used should be 0');
console.assert(timeInfo.years === 0, 'Initial years should be 0');
console.assert(timeInfo.seasons === 0, 'Initial seasons should be 0');

console.log('✅ Initial state test passed');

// Test single action
console.log('\n2. Testing single action...');
game.waitAction();
console.assert(game.player.totalActionsUsed === 1, 'Total actions should be 1 after waiting');
console.assert(game.player.actionsLeft === 2, 'Actions left should be 2 after waiting');

console.log('✅ Single action test passed');

// Test multiple actions within season
console.log('\n3. Testing multiple actions in season...');
game.waitAction();
game.waitAction();
console.assert(game.player.totalActionsUsed === 3, 'Total actions should be 3 after 3 waits');
console.assert(game.player.actionsLeft === 3, 'Actions left should be 3 (new season)');

const timeInfo1Season = game.player.getTimeInfo(3);
console.assert(timeInfo1Season.totalActionsUsed === 3, 'Total actions used should be 3');
console.assert(timeInfo1Season.years === 0, 'Years should be 0 after 1 season');
console.assert(timeInfo1Season.seasons === 1, 'Seasons should be 1 after 1 season');

console.log('✅ Multiple actions in season test passed');

// Test full year cycle
console.log('\n4. Testing full year cycle...');
// Go through 3 more seasons (3 actions each) to complete a year
for (let season = 0; season < 3; season++) {
  for (let action = 0; action < 3; action++) {
    game.waitAction();
  }
}

console.assert(game.player.totalActionsUsed === 12, 'Total actions should be 12 after full year');
const timeInfo1Year = game.player.getTimeInfo(3);
console.assert(timeInfo1Year.totalActionsUsed === 12, 'Total actions used should be 12');
console.assert(timeInfo1Year.years === 1, 'Years should be 1 after full year');
console.assert(timeInfo1Year.seasons === 0, 'Seasons should be 0 after full year');

console.log('✅ Full year cycle test passed');

// Test year + seasons
console.log('\n5. Testing year + seasons...');
// Add 2 more seasons (6 actions)
for (let season = 0; season < 2; season++) {
  for (let action = 0; action < 3; action++) {
    game.waitAction();
  }
}

console.assert(game.player.totalActionsUsed === 18, 'Total actions should be 18');
const timeInfo1Year2Seasons = game.player.getTimeInfo(3);
console.assert(timeInfo1Year2Seasons.totalActionsUsed === 18, 'Total actions used should be 18');
console.assert(timeInfo1Year2Seasons.years === 1, 'Years should be 1');
console.assert(timeInfo1Year2Seasons.seasons === 2, 'Seasons should be 2');

console.log('✅ Year + seasons test passed');

// Test time string formatting
console.log('\n6. Testing time string formatting...');
const timeString0 = new Game().player.getTimeString(3);
console.assert(timeString0 === 'Total actions: 0', 'Initial time string should be just total actions');

const timeString18 = game.player.getTimeString(3);
console.assert(timeString18 === 'Total actions: 18 (1 year, 2 seasons elapsed)', 
               'Time string should show years and seasons');

console.log('✅ Time string formatting test passed');

// Test useAction method
console.log('\n7. Testing useAction method...');
const initialTotal = game.player.totalActionsUsed;
const initialLeft = game.player.actionsLeft;

game.player.useAction(2); // Use 2 actions at once
console.assert(game.player.totalActionsUsed === initialTotal + 2, 'Total should increase by 2');
console.assert(game.player.actionsLeft === initialLeft - 2, 'Actions left should decrease by 2');

console.log('✅ useAction method test passed');

console.log('\n🎉 All action count tests passed!');
console.log('\n📊 Final state:');
console.log(`   Total actions used: ${game.player.totalActionsUsed}`);
console.log(`   Time elapsed: ${game.player.getTimeString(3)}`);
console.log(`   Current season: ${game.currentSeason}`);
console.log(`   Actions left this season: ${game.player.actionsLeft}`);