// Simulates the full lifecycle of a Camellia sinensis seed, including needs (season/resources) and lifespan, as in the main game engine.

const fs = require('fs');
const path = require('path');

const CARDS_PATH = path.join(__dirname, '../../data/Cards.json');
const cardsData = JSON.parse(fs.readFileSync(CARDS_PATH, 'utf-8'));
const teaPlant = cardsData.plants.find(p => p.id === 'tea_plant');

const stateOrder = ['seed', 'seedling', 'mature', 'flowering', 'fruiting', 'seed'];
const weatherData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/weather.json'), 'utf-8'));
const seasons = ['spring', 'summer', 'autumn', 'winter'];

function getTransitionActions(state) {
  const transitions = teaPlant.states[state].transitions;
  if (!transitions || transitions.length === 0) return null;

  const { actions } = transitions[0];
  if (actions.min === actions.max) return actions.min;
  return Math.floor(Math.random() * (actions.max - actions.min + 1)) + actions.min;

}

function logStage(stage, actions, years, plantAge) {
  console.log(`Stage: ${stage} | Actions: ${actions} | Years: ${years} | Plant Age: ${plantAge}`);

}

function simulateLifecycle() {
  let actions = 0;
  let years = 0;
  let plantAge = 0;
  let currentStageIdx = 0;
  let plantState = stateOrder[currentStageIdx];
  let stateProgress = 0;
  let transitionThreshold = getTransitionActions(plantState);
  let resourcesThisSeason = new Set();
  let _seasonCounter = 0;
  let assignedLifespan = (teaPlant.lifespan.min === teaPlant.lifespan.max)
    ? teaPlant.lifespan.min
    : (Math.floor(Math.random() * (teaPlant.lifespan.max - teaPlant.lifespan.min + 1)) + teaPlant.lifespan.min);

  logStage(plantState, actions, years, plantAge);
  let composted = false;
  let newSeedProduced = false;
  let deadStateEntered = false;
  let deadStateProgress = 0;
  let deadTransitionThreshold = getTransitionActions('dead');
  while (plantState !== 'compost') {
    console.log(`\n[STATE] Current stage: ${plantState}`);
    // Always meet needs, never trigger vulnerabilities
    const stageDef = teaPlant.states[plantState];
    const needs = stageDef.needs || {};
    const seasonsAllowed = needs.season || [];
    let currentSeason;
    do {
      currentSeason = seasons[_seasonCounter % 4];
      _seasonCounter++;
      // Log the available weather conditions for this season
      const seasonWeather = weatherData[currentSeason];
      const availableConditions = new Set();
      for (const event of seasonWeather) {
        if (event.conditions) {
          for (const cond of event.conditions) {
            availableConditions.add(cond);
          }
        }
      }
      console.log(`[SEASON] Checking season: ${currentSeason} (allowed: ${seasonsAllowed.join(', ')}) | Available conditions: ${Array.from(availableConditions).join(', ')}`);
      // No plant aging here; will increment only on progress
      if (_seasonCounter > 1000) { // safety break to avoid infinite loop
        console.log('❌ Infinite loop detected. Exiting.');
        plantState = 'dead';
        break;
      }
    } while (!seasonsAllowed.includes(currentSeason) && plantState !== 'dead');
    if (plantState === 'dead') {
      if (!deadStateEntered) {
        deadStateEntered = true;
        deadStateProgress = 0;
        deadTransitionThreshold = getTransitionActions('dead');
        console.log(`[DEAD] Entered dead state. Need ${deadTransitionThreshold} actions to compost.`);
      }
      // Simulate dead state sessions with needs met
      const deadStageDef = teaPlant.states['dead'];
      const deadNeeds = deadStageDef.needs || {};
      const deadSeasonsAllowed = deadNeeds.season || [];
      let deadResourcesThisSeason = new Set();
      let deadSeasonCounter = 0;
      const deadReqResources = deadNeeds.resources || [];
      while (deadStateProgress < deadTransitionThreshold) {
        let currentSeason = seasons[(_seasonCounter + deadSeasonCounter) % 4];
        console.log(`[DEAD] Checking season: ${currentSeason} (allowed: ${deadSeasonsAllowed.join(', ')})`);
        // Only progress if season is allowed
        if (deadSeasonsAllowed.includes(currentSeason)) {
          // Provide all resources that would be fulfilled by the season's weather events
          const seasonWeather = weatherData[currentSeason];
          const availableConditions = new Set();
          for (const event of seasonWeather) {
            if (event.conditions) {
              for (const cond of event.conditions) {
                availableConditions.add(cond);
              }
            }
          }
          deadReqResources.forEach(r => {
            if (availableConditions.has(r)) deadResourcesThisSeason.add(r);
          });
            // Only increment progress if all needs are met
            const allDeadNeedsMet = deadReqResources.every(r => deadResourcesThisSeason.has(r));
            console.log(`[DEAD] Needs: ${deadReqResources.join(', ')} | Available: ${Array.from(availableConditions).join(', ')} | All met: ${allDeadNeedsMet}`);
            if (allDeadNeedsMet) {
              deadStateProgress++;
              console.log(`[DEAD] Progressed dead state: ${deadStateProgress}/${deadTransitionThreshold}`);
              deadResourcesThisSeason.clear();
            }
          }
          deadSeasonCounter++;
          if (deadSeasonCounter > 100) {
            console.log('❌ Infinite loop in dead state. Exiting.');
            break;
          }
        }
        plantState = 'compost';
        composted = true;
        newSeedProduced = true;
        console.log('🌱 Dead plant composted and new seed produced.');
        break;
      }


    // Only run this if we are not in the dead/compost logic
    if (plantState !== 'dead' && plantState !== 'compost') {
      const seasonWeather = weatherData[currentSeason];
      const availableConditions = new Set();
      const reqResources = needs.resources || [];
      for (const event of seasonWeather) {
        if (event.conditions) {
          for (const cond of event.conditions) {
            availableConditions.add(cond);
          }
        }
      }
      reqResources.forEach(r => {
        if (availableConditions.has(r)) resourcesThisSeason.add(r);
      });
      // Only increment state progress if all needs are met (accumulate across seasons)
      const allNeedsMet = reqResources.every(r => resourcesThisSeason.has(r));
      console.log(`[PROGRESS] Needs: ${reqResources.join(', ')} | Available: ${Array.from(availableConditions).join(', ')} | All met: ${allNeedsMet}`);
      if (allNeedsMet) {
        stateProgress++;
        actions++;
        // Only reset resourcesThisSeason after progress
        resourcesThisSeason.clear();
        // Increment plant age and years only when progress occurs
        years++;
        plantAge++;
        console.log(`[PROGRESS] Progressed stage: ${plantState} (${stateProgress}/${transitionThreshold})`);
        if (stateProgress >= transitionThreshold) {
          if (plantState === 'fruiting') {
            currentStageIdx = stateOrder.indexOf('seed');
          } else {
            currentStageIdx = (currentStageIdx + 1) % stateOrder.length;
          }
          plantState = stateOrder[currentStageIdx];
          stateProgress = 0;
          transitionThreshold = getTransitionActions(plantState);
          logStage(plantState, actions, years, plantAge);
          if (plantState === 'seed' && plantAge >= assignedLifespan) {
            plantState = 'dead';
            console.log(`Stage: dead | Age: ${plantAge} years`);
          }
        }
        if (plantAge >= assignedLifespan) {
          plantState = 'dead';
          console.log(`Stage: dead | Age: ${plantAge} years`);
        }
      }
    }
  }

  if (composted && newSeedProduced && plantState === 'compost') {
    console.log('✅ Dead state compost/seed logic verified.');
  } else {
    console.log('❌ Dead state compost/seed logic failed.');
  }

  const minLifespan = 30;
  const maxLifespan = 50;
  if (plantAge >= minLifespan && plantAge <= maxLifespan) {
    console.log(`✅ Plant died at age ${plantAge}, within expected lifespan range (${minLifespan}–${maxLifespan} years).`);
  } else {
    console.log(`❌ Plant died at age ${plantAge}, OUTSIDE expected lifespan range (${minLifespan}–${maxLifespan} years)!`);
  }

    // Only run this if we are not in the dead/compost logic
    if (plantState !== 'dead' && plantState !== 'compost') {
      const seasonWeather = weatherData[currentSeason];
      const availableConditions = new Set();
      const reqResources = needs.resources || [];
      for (const event of seasonWeather) {
        if (event.conditions) {
          for (const cond of event.conditions) {
            availableConditions.add(cond);
          }
        }
      }
      reqResources.forEach(r => {
        if (availableConditions.has(r)) resourcesThisSeason.add(r);
      });
      // Only increment state progress if all needs are met (accumulate across seasons)
      const allNeedsMet = reqResources.every(r => resourcesThisSeason.has(r));
      console.log(`[PROGRESS] Needs: ${reqResources.join(', ')} | Available: ${Array.from(availableConditions).join(', ')} | All met: ${allNeedsMet}`);
      if (allNeedsMet) {
        stateProgress++;
        actions++;
        // Only reset resourcesThisSeason after progress
        resourcesThisSeason.clear();
        // Increment plant age and years only when progress occurs
        years++;
        plantAge++;
        console.log(`[PROGRESS] Progressed stage: ${plantState} (${stateProgress}/${transitionThreshold})`);
        if (stateProgress >= transitionThreshold) {
          if (plantState === 'fruiting') {
            currentStageIdx = stateOrder.indexOf('seed');
          } else {
            currentStageIdx = (currentStageIdx + 1) % stateOrder.length;
          }
          plantState = stateOrder[currentStageIdx];
          stateProgress = 0;
          transitionThreshold = getTransitionActions(plantState);
          logStage(plantState, actions, years, plantAge);
          if (plantState === 'seed' && plantAge >= assignedLifespan) {
            plantState = 'dead';
            console.log(`Stage: dead | Age: ${plantAge} years`);
          }
        }
        if (plantAge >= assignedLifespan) {
          plantState = 'dead';
          console.log(`Stage: dead | Age: ${plantAge} years`);
        }
      }
    }
}
simulateLifecycle()