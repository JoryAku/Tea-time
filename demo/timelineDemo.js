// Demo script to showcase the Timeline system

const Game = require("../engine/Game");

function demoTimelineSystem() {
  console.log("=== Timeline System Demo ===\n");
  
  const game = new Game();
  
  console.log("Starting situation:");
  console.log(`Current season: ${game.currentSeason}`);
  console.log(`Plants in garden: ${game.player.garden.length}`);
  console.log(`Plant: ${game.player.garden[0].name} (${game.player.garden[0].state})\n`);
  
  // Create a 1-year timeline
  console.log("📅 Creating 1-year timeline (12 actions)...");
  const timeline = game.createTimeline(12);
  
  // Show weather forecast
  console.log("\n🌦 Weather Forecast:");
  timeline.events.forEach((event, index) => {
    console.log(`  Action ${index + 1} (${event.season}): ${event.weather} [${event.conditions.join(', ')}]`);
  });
  
  // Show death predictions if any
  const deaths = timeline.getDeathPredictions();
  if (deaths.length > 0) {
    console.log("\n💀 Death Predictions:");
    deaths.forEach(death => {
      console.log(`  Action ${death.deathAction} (${death.season}): Death by ${death.cause}`);
    });
  } else {
    console.log("\n✅ All plants predicted to survive this timeline!");
  }
  
  // Show plant state changes
  console.log("\n🌱 Plant State Changes:");
  timeline.plantStates.forEach((states, plantId) => {
    console.log(`  Plant ${plantId}:`);
    states.forEach(state => {
      console.log(`    Action ${state.action}: ${state.state} (${state.changeType})`);
    });
  });
  
  // Demonstrate intervention
  if (deaths.length > 0) {
    const death = deaths[0];
    const interventionAction = Math.max(1, death.deathAction - 2);
    console.log(`\n⚡ Applying intervention at action ${interventionAction}...`);
    const success = timeline.applyIntervention(interventionAction, 'shelter', death.plantId);
    console.log(`Intervention ${success ? 'successful' : 'failed'}`);
  }
  
  // Show longer forecast
  console.log("\n📊 4-Year Detailed Forecast:");
  const longForecast = game.getDetailedForecast(48);
  
  console.log(`Total events: ${longForecast.weather.length}`);
  console.log(`Death predictions: ${longForecast.deathPredictions.length}`);
  
  // Seasonal breakdown
  const seasonCounts = { spring: 0, summer: 0, autumn: 0, winter: 0 };
  longForecast.weather.forEach(event => {
    seasonCounts[event.season]++;
  });
  
  console.log("Seasonal distribution:");
  Object.entries(seasonCounts).forEach(([season, count]) => {
    console.log(`  ${season}: ${count} actions`);
  });
  
  // Show weather variety
  const weatherTypes = new Set(longForecast.weather.map(e => e.weather));
  console.log(`Weather variety: ${weatherTypes.size} different event types`);
  console.log(`Events: ${Array.from(weatherTypes).join(', ')}`);
  
  console.log("\n=== Demo Complete ===");
}

// Run demo if this file is executed directly
if (require.main === module) {
  demoTimelineSystem();
}

module.exports = { demoTimelineSystem };