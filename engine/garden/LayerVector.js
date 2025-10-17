/**
 * LayerVector
 * Represents environmental parameters for a vertical layer.
 * Components (normalized 0..1):
 *  - light
 *  - temp
 *  - moisture
 *  - nutrients
 *  - organic
 *  - wind (optional, mainly for emergent)
 */

class LayerVector {
  constructor({ light = 0.5, temp = 0.5, moisture = 0.5, nutrients = 0.5, organic = 0.0, wind = 0 } = {}) {
    this.light = Number(light);
    this.temp = Number(temp);
    this.moisture = Number(moisture);
    this.nutrients = Number(nutrients);
    this.organic = Number(organic);
    this.wind = Number(wind);
  }

  toObject() {
    return { light: this.light, temp: this.temp, moisture: this.moisture, nutrients: this.nutrients, organic: this.organic, wind: this.wind };
  }

  clone() {
    return new LayerVector(this.toObject());
  }

  add(other) {
    this.light += other.light || 0;
    this.temp += other.temp || 0;
    this.moisture += other.moisture || 0;
    this.nutrients += other.nutrients || 0;
    this.organic += other.organic || 0;
    this.wind += other.wind || 0;
    return this;
  }

  scale(f) {
    this.light *= f; this.temp *= f; this.moisture *= f; this.nutrients *= f; this.organic *= f; this.wind *= f;
    return this;
  }

  clamp() {
    this.light = Math.max(0, Math.min(1, this.light));
    this.temp = Math.max(0, Math.min(1, this.temp));
    this.moisture = Math.max(0, Math.min(1, this.moisture));
    this.nutrients = Math.max(0, Math.min(1, this.nutrients));
    this.organic = Math.max(0, Math.min(1, this.organic));
    this.wind = Math.max(0, Math.min(1, this.wind));
    return this;
  }
}

module.exports = LayerVector;
