# Timeline System Usage Guide

The Core Timeline Mechanic simulates weather events and plant states up to 4 years (48 actions) into the future, providing locked timelines based on present conditions.

## Quick Start

```javascript
const Game = require('./engine/Game');
const game = new Game();

// Create a 1-year timeline (12 actions)
const timeline = game.createTimeline(12);

// Check if any plants will die
const deaths = timeline.getDeathPredictions();
console.log('Deaths predicted:', deaths.length);

// Get weather forecast
timeline.events.forEach((event, index) => {
  console.log(`Action ${index + 1}: ${event.weather} (${event.season})`);
});
```

## Key Features

### 1. Probability-Based Outcomes
- Plant survival depends on vulnerabilities vs seasonal weather
- Tea plant seedlings are vulnerable to drought and frost
- Survival chances calculated from seasonal weather probabilities

### 2. Locked Timeline Generation
- Once generated, timeline is locked and consistent
- Death predictions include the exact action and cause
- Weather events ensure predicted outcomes occur

### 3. Player Interventions
- Apply protective actions at specific timeline points
- Interventions can change outcomes (shelter protects from frost)
- Timeline tracks all interventions applied

### 4. 4-Year Simulation Support
- Maximum 48 actions (4 years, 12 actions per season)
- Seasonal weather distribution maintained
- Fast performance (~1ms for full simulation)

## API Reference

### Timeline Methods
```javascript
// Create timeline
const timeline = game.createTimeline(actionsToSimulate);

// Check predictions
const deaths = timeline.getDeathPredictions();
const weather = timeline.getWeatherAtAction(actionNumber);
const plantState = timeline.getPlantStateAtAction(plantId, actionNumber);

// Apply intervention
timeline.applyIntervention(actionNumber, 'shelter', plantId);
```

### Game Integration
```javascript
// Get detailed forecast
const forecast = game.getDetailedForecast(24);

// Quick weather peek
const nextWeather = game.peekTimelineWeather(3);
```

## Example Output

```
📅 Timeline generated for 12 actions
🌱 Simulated 1 plants
⚠️  1 plants predicted to die:
   Action 7 (autumn): tea_plant_seedling_0_0_0 - frost

🌦 Weather Forecast:
  Action 1 (spring): rain [water]
  Action 2 (spring): sun [sunlight]
  Action 7 (autumn): frost [frost]  ← Death event
```

## Testing

Run the comprehensive test suite:
```bash
node test/engine/timelineTest.js
```

Run the interactive demo:
```bash
node demo/timelineDemo.js
```

The Timeline system integrates seamlessly with the existing game engine while providing powerful future simulation capabilities for strategic planning and game mechanics.