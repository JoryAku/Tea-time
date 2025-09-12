const Player = require("./Player");
const Card = require("./Card");
const cardsData = require("../data/cards.json");
const weatherData = require("../data/weather.json");

class Game {
  constructor() {
    this.player = new Player();
    this.cards = cardsData;
    this.weather = weatherData;

    this.seasons = ["spring", "summer", "autumn", "winter"];
    this.seasonIndex = 0;
    this.currentSeason = this.seasons[this.seasonIndex];

    this.actionsPerSeason = 3;
    this.player.actionsLeft = this.actionsPerSeason;

    // create a small starting hand (4 seedlings)
    this.initStartingDeck();
  }

  initStartingDeck() {
    for (let i = 0; i < 4; i++) {
      const c = this.createCard("tea_plant", "seed");
      this.player.hand.push(c);
    }
  }

  // create a Card instance from an id in data/cards.json
  createCard(cardId, state = null) {
    const all = [...this.cards.plants, ...this.cards.ingredients, ...this.cards.teas];
    const def = all.find((c) => c.id === cardId);
    if (!def) throw new Error(`Card definition not found: ${cardId}`);
    return new Card(def, state);
  }

  // pick a weather event from the current season's distribution
  pickWeatherEvent() {
    const table = this.weather[this.currentSeason];
    const r = Math.random() * 100;
    let acc = 0;
    for (const row of table) {
      acc += row.pct;
      if (r < acc) return row.event;
    }
    return table[table.length - 1].event;
  }

  // applied after each player action
  triggerWeather() {
    const event = this.pickWeatherEvent();
    console.log(`\n🌦 Weather event: ${event}`);
    this.applyWeather(event);
  }

  // small helper to show a peek (for Green Tea)
  peekWeather(n = 1) {
    console.log("🔎 Peeking at the next weather event(s):");
    for (let i = 0; i < n; i++) {
      console.log("  -", this.pickWeatherEvent());
    }
  }

  // apply event to garden plants (affects each plant's resourcesThisSeason or triggers vulnerabilities)
  applyWeather(event) {
    const resourceMap = {
      rain: "rain",
      sun: "sun",
      drought: "drought",
      frost: "frost",
      snow: "snow",
      cloud: "cloud",
      wind: "wind",
      heatwave: "heatwave",
      thunderstorm: "thunderstorm",
      clear_night: "clear_night",
    };
    const resource = resourceMap[event] || event;

    // for each plant in garden, update resourcesThisSeason and check vulnerabilities
    this.player.garden.forEach((card) => {
      const stageDef = card.definition.states[card.state];
      if (!stageDef) return;

      // check vulnerabilities first (immediate)
      const vulns = stageDef.vulnerabilities || [];
      for (const v of vulns) {
        if (v.event === event) {
          if (v.outcome === "die") {
            card.state = "dead";
            console.log(`☠️ ${card.name} died (was ${stageDef.name || card.state}) due to ${event}.`);
            return; // stop processing this card
          } else if (v.outcome === "regress") {
            const stages = Object.keys(card.definition.states);
            const idx = stages.indexOf(card.state);
            const newIdx = Math.max(0, idx - 1);
            card.state = stages[newIdx];
            console.log(`↩️ ${card.name} regressed to ${card.state} due to ${event}.`);
            return;
          }
        }
      }

      // if event fulfills a needed resource for current stage, record it
      const needs = stageDef.needs || {};
      const reqResources = needs.resources || [];
      if (reqResources.includes(resource)) {
        card.resourcesThisSeason.add(resource);
        // (we just record; final progression happens at season end)
      }
    });
  }

  // called when season ends (player.actionsLeft <= 0)
  endSeasonProcessing() {
    console.log("\n--- Season end: checking plant progression ---");
    const current = this.currentSeason;
    this.player.garden.forEach((card) => {
      const stageDef = card.definition.states[card.state];
      if (!stageDef) return;

      const needs = stageDef.needs || {};
      const seasonsAllowed = needs.season || [];
      // if this stage can progress in this season:
      if (seasonsAllowed.includes(current)) {
        const requiredResources = needs.resources || [];
        const haveAll = requiredResources.every((r) => card.resourcesThisSeason.has(r));
        if (haveAll) {
          const stages = Object.keys(card.definition.states);
          const idx = stages.indexOf(card.state);
          if (idx < stages.length - 1) {
            const next = stages[idx + 1];
            card.state = next;
            console.log(`➡️ ${card.name} advanced to ${card.state}`);
          }
        } else {
          // didn't get needs: no automatic growth; could handle penalties here
        }
      }
      // reset resource record for next season
      card.resetSeasonResources();
    });

    // advance season
    this.seasonIndex = (this.seasonIndex + 1) % this.seasons.length;
    this.currentSeason = this.seasons[this.seasonIndex];
    this.player.actionsLeft = this.actionsPerSeason;
    console.log(`\n>>> ${this.currentSeason.toUpperCase()} begins.`);
  }
}

module.exports = Game;
