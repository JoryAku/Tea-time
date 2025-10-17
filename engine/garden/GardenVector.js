/**
 * GardenVector
 * Represents a 4D environmental vector used by the garden field, weather and plants.
 * Components and typical ranges (all 0..1 normalized):
 *  - light: 0 (dark) .. 1 (bright)
 *  - temp: 0 (cold) .. 1 (hot)
 *  - humidity: 0 (dry) .. 1 (wet)
 *  - wind: 0 (calm) .. 1 (very windy)
 *
 * Provides basic math operations: add, scale, clamp, distance, clone.
 */

class GardenVector {
  constructor({ light = 0.5, temp = 0.5, humidity = 0.5, wind = 0 } = {}) {
    this.light = Number(light);
    this.temp = Number(temp);
    this.humidity = Number(humidity);
    this.wind = Number(wind);
  }

  // Return a shallow plain object
  toObject() {
    return { light: this.light, temp: this.temp, humidity: this.humidity, wind: this.wind };
  }

  clone() {
    return new GardenVector(this.toObject());
  }

  // Add another vector in-place
  add(other) {
    this.light += other.light || 0;
    this.temp += other.temp || 0;
    this.humidity += other.humidity || 0;
    this.wind += other.wind || 0;
    return this;
  }

  // Scale in-place
  scale(factor) {
    this.light *= factor;
    this.temp *= factor;
    this.humidity *= factor;
    this.wind *= factor;
    return this;
  }

  // Clamp components to 0..1
  clamp() {
    this.light = Math.max(0, Math.min(1, this.light));
    this.temp = Math.max(0, Math.min(1, this.temp));
    this.humidity = Math.max(0, Math.min(1, this.humidity));
    this.wind = Math.max(0, Math.min(1, this.wind));
    return this;
  }

  // Euclidean distance to another vector
  distanceTo(other) {
    const dl = (this.light - (other.light || 0));
    const dt = (this.temp - (other.temp || 0));
    const dh = (this.humidity - (other.humidity || 0));
    const dw = (this.wind - (other.wind || 0));
    return Math.sqrt(dl * dl + dt * dt + dh * dh + dw * dw);
  }

  // Merge (returns new GardenVector) — this + other
  merged(other) {
    return this.clone().add(other).clamp();
  }
}

module.exports = GardenVector;
