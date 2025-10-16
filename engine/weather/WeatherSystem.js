const fs = require("fs");

class WeatherSystem {
  /**
   * Constructor supports two modes:
   * - new WeatherSystem(boundsData) -> stores bounds as weatherData
   * - new WeatherSystem(light, temp, humidity, month)
   */
  constructor(light = 0.5, temp = 0.5, humidity = 0.5, month = null) {
    // If the first argument is an object, assume it's bounds/weather data
    if (light && typeof light === 'object' && !Array.isArray(light)) {
      this.weatherData = light; // store bounds for later use
      // initialize with neutral values
      this.light = 0.5;
      this.temp = 0.5;
      this.humidity = 0.5;
      this.month = null;
      return;
    }

    this.light = light;
    this.temp = temp;
    this.humidity = humidity;
    this.month = month; // store the month internally
    this.weatherData = null;
  }

  updateForMonth(month, boundsData) {
    this.month = month.toLowerCase();
    const bsource = boundsData || this.weatherData;
    if (!bsource) throw new Error('No bounds data provided to updateForMonth');
    const b = bsource.monthlyBounds[this.month];
    if (!b) throw new Error(`No bounds found for month: ${month}`);

    // pick random value within bounds
    this.light = b.light.min + Math.random() * (b.light.max - b.light.min);
    this.temp = b.temp.min + Math.random() * (b.temp.max - b.temp.min);
    this.humidity = b.humidity.min + Math.random() * (b.humidity.max - b.humidity.min);

    return this._clamp();
  }

  // Return as array (for calculations, visualization, etc.)
  asVector() {
    return [this.light, this.temp, this.humidity];
  }

  // Add another weather vector (used for monthly change accumulation)
  add(other) {
    this.light += other.light;
    this.temp += other.temp;
    this.humidity += other.humidity;
    return this._clamp();
  }

  // Scale all values (used for dampening or seasonal modifiers)
  scale(factor) {
    this.light *= factor;
    this.temp *= factor;
    this.humidity *= factor;
    return this._clamp();
  }

  // Linear interpolation (for smooth transitions between months)
  lerp(target, t) {
    this.light = this.light + (target.light - this.light) * t;
    this.temp = this.temp + (target.temp - this.temp) * t;
    this.humidity = this.humidity + (target.humidity - this.humidity) * t;
    return this._clamp();
  }

  // Clamp values to 0–1 range
  _clamp() {
    this.light = Math.max(0, Math.min(1, this.light));
    this.temp = Math.max(0, Math.min(1, this.temp));
    this.humidity = Math.max(0, Math.min(1, this.humidity));
    return this;
  }

  /**
   * Create a WeatherSystem instance using real-world monthly bounds
   * from weather.json instead of random values.
   * @param {string} month - Short month name (e.g. "jan", "feb").
   * @param {object} boundsData - The parsed JSON data from weather.json.
   */
  static fromMonthlyBounds(month, boundsData) {
    const m = month.toLowerCase();
    const b = boundsData.monthlyBounds[m];

    if (!b) throw new Error(`No bounds found for month: ${month}`);

    // Generate a value within the min/max range for each attribute.
    const light = b.light.min + Math.random() * (b.light.max - b.light.min);
    const temp = b.temp.min + Math.random() * (b.temp.max - b.temp.min);
    const humidity = b.humidity.min + Math.random() * (b.humidity.max - b.humidity.min);

    return new WeatherSystem(light, temp, humidity);
  }

  /**
   * Convenience loader: read weather.json and build system for current month.
   * @param {string} path - Path to weather.json.
   */
  static fromFile(path = "./weather.json") {
    const json = JSON.parse(fs.readFileSync(path, "utf8"));
    const currentMonth = new Date().toLocaleString("en-US", { month: "short" }).toLowerCase();
    return WeatherSystem.fromMonthlyBounds(currentMonth, json);
  }

  /**
   * Applies monthly clamps to ensure current values stay within bounds.
   */
  applyMonthlyClamp(weather, month, boundsData) {
    const b = boundsData.monthlyBounds[month.toLowerCase()];
    weather.light = Math.min(b.light.max, Math.max(b.light.min, weather.light));
    weather.temp  = Math.min(b.temp.max,  Math.max(b.temp.min,  weather.temp));
    weather.humidity = Math.min(b.humidity.max, Math.max(b.humidity.min, weather.humidity));
    return weather;
  }

  /**
   * Calculates a simplified relative pressure value (0-1) based on
   * normalized temperature and humidity vectors.
   */
  getRelativePressureFromVectors(temp_vector, humidity_vector) {
    const inverted_temp = 1 - temp_vector;
    const inverted_humidity = 1 - humidity_vector;
    const temp_weight = 0.7;
    const humidity_weight = 0.3;
    const combined_value = (inverted_temp * temp_weight) + (inverted_humidity * humidity_weight);
    const exponent = 2;
    let pressure = Math.pow(combined_value, exponent);
    return Math.max(0, Math.min(1, pressure));
  }

  // Debug helper
  toString() {
    return `Month: ${this.month || "unknown"} ☀️ Light: ${this.light.toFixed(2)}, 🌡️ Temp: ${this.temp.toFixed(2)}, 💧 Humidity: ${this.humidity.toFixed(2)}`;
  }
}

module.exports = WeatherSystem;