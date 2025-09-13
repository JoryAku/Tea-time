// test/plantLifecycleTest.js
// Simulates the lifecycle of a single Camellia sinensis seed in the garden.

const STAGES = [
  'Seed',
  'Seedling',
  'Mature',
  'Fruiting'
];

const SEEDLING_TRANSITION = Math.floor(Math.random() * 2) + 1; // 1–2 actions
const MATURE_TRANSITION = 36; // actions after seedling
const FRUITING_TRANSITION = Math.floor(Math.random() * (144 - 48 + 1)) + 48; // 48–144 actions after mature

function actionsToTime(actions) {
  const seasons = Math.floor(actions / 3);
  const years = Math.floor(actions / 12);
  return { seasons, years };
}

function logStage(stage, actions) {
  const { seasons, years } = actionsToTime(actions);
  console.log(`Stage: ${stage} | Actions: ${actions} | Seasons: ${seasons} | Years: ${years}`);
}

function simulateLifecycle() {
  let actions = 0;
  let stage = 0;
  logStage(STAGES[stage], actions);

  // Seed → Seedling
  actions += SEEDLING_TRANSITION;
  stage = 1;
  logStage(STAGES[stage], actions);

  // Seedling → Mature
  actions += MATURE_TRANSITION;
  stage = 2;
  logStage(STAGES[stage], actions);

  // Mature → Fruiting
  actions += FRUITING_TRANSITION;
  stage = 3;
  logStage(STAGES[stage], actions);

  // Fruiting produces a new seed
  console.log(`Fruiting! New seed produced after ${actions} actions.`);
  const { seasons, years } = actionsToTime(actions);
  console.log(`Total actions: ${actions} | Seasons: ${seasons} | Years: ${years}`);
}

simulateLifecycle();
