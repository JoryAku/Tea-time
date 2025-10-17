const GardenVector = require('./GardenVector');

/**
 * GardenField (2D)
 * A simple 2D grid field storing GardenVectors per cell. Includes a basic
 * diffusion step that averages each cell with neighboring cells to simulate
 * spatial diffusion (microclimate smoothing).
 *
 * API highlights:
 *  - constructor(width, height, seedVector)
 *  - getCell(x,y) -> GardenVector
 *  - applyWeather(vec, scale) -> applies uniformly across field
 *  - emitAt(x,y, influenceVec, strength) -> apply influence to a cell
 *  - diffuse(iterations = 1, factor = 0.2) -> smooths values by averaging neighbors
 *  - snapshot() -> array of arrays of plain objects
 */

class GardenField {
  constructor(width = 4, height = 2, seedVector = new GardenVector()) {
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    this.size = this.width * this.height;
    // initialize 2D grid
    this.grid = new Array(this.height).fill(null).map(() => new Array(this.width).fill(null));
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] = seedVector.clone();
      }
    }
  }

  // clamp coordinates
  _clampCoords(x, y) {
    const cx = Math.max(0, Math.min(this.width - 1, Math.floor(x)));
    const cy = Math.max(0, Math.min(this.height - 1, Math.floor(y)));
    return [cx, cy];
  }

  // Backwards-compatible 1D index mapping
  _idxToXY(idx) {
    const i = Math.max(0, Math.min(this.size - 1, Math.floor(idx)));
    const x = i % this.width;
    const y = Math.floor(i / this.width);
    return [x, y];
  }

  getCell(x, y) {
    if (y === undefined) {
      // treat x as 1D index
      const [xx, yy] = this._idxToXY(x);
      x = xx; y = yy;
    }
    // ensure the requested cell exists (grow grid if necessary)
    this._ensureCellExists(x, y);
    const [cx, cy] = this._clampCoords(x, y);
    return this.grid[cy][cx];
  }

  applyWeather(vec, scale = 1) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x].add({ light: (vec.light || 0) * scale, temp: (vec.temp || 0) * scale, humidity: (vec.humidity || 0) * scale, wind: (vec.wind || 0) * scale }).clamp();
      }
    }
  }

  emitAt(x, y, influenceVec, strength = 1) {
    if (y === undefined) {
      const [xx, yy] = this._idxToXY(x);
      x = xx; y = yy;
    }
    const v = this.getCell(x, y);
    v.add({ light: (influenceVec.light || 0) * strength, temp: (influenceVec.temp || 0) * strength, humidity: (influenceVec.humidity || 0) * strength, wind: (influenceVec.wind || 0) * strength }).clamp();
    return v;
  }

  // Expand the grid to include a given cell coordinate if it's out of bounds.
  _ensureCellExists(x, y) {
    const needExpand = x < 0 || y < 0 || x >= this.width || y >= this.height;
    if (!needExpand) return;

    // compute new bounds: expand to include given x,y (grow outward)
    const newMinX = Math.min(0, x);
    const newMinY = Math.min(0, y);
    const newMaxX = Math.max(this.width - 1, x);
    const newMaxY = Math.max(this.height - 1, y);
    const newWidth = newMaxX - newMinX + 1;
    const newHeight = newMaxY - newMinY + 1;

    // create new grid filled with clones of a baseline vector (use center origin if possible)
    const baseline = this.grid[0] && this.grid[0][0] ? this.grid[0][0].clone() : new GardenVector();
    const newGrid = new Array(newHeight).fill(null).map(() => new Array(newWidth).fill(null));

    // offset to map old coordinates into new grid
    const offsetX = -newMinX;
    const offsetY = -newMinY;

    for (let yy = 0; yy < newHeight; yy++) {
      for (let xx = 0; xx < newWidth; xx++) {
        newGrid[yy][xx] = baseline.clone();
      }
    }

    // copy old data into new grid
    for (let yy = 0; yy < this.height; yy++) {
      for (let xx = 0; xx < this.width; xx++) {
        const nx = xx + offsetX;
        const ny = yy + offsetY;
        if (nx >= 0 && nx < newWidth && ny >= 0 && ny < newHeight) {
          newGrid[ny][nx] = this.grid[yy][xx];
        }
      }
    }

    this.grid = newGrid;
    this.width = newWidth;
    this.height = newHeight;
    this.size = this.width * this.height;
  }

  // Simple diffusion: for each cell, average with neighbors weighted by factor
  diffuse(iterations = 1, factor = 0.2) {
    for (let it = 0; it < Math.max(1, iterations); it++) {
      // copy current state
      const copy = new Array(this.height).fill(null).map(() => new Array(this.width).fill(null));
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          copy[y][x] = this.grid[y][x].clone();
        }
      }

      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          // gather neighbors
          const neighbors = [];
          for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
              const nx = x + ox;
              const ny = y + oy;
              if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                if (!(nx === x && ny === y)) neighbors.push(copy[ny][nx]);
              }
            }
          }

          if (neighbors.length === 0) continue;

          // compute neighbor average
          const avg = neighbors.reduce((acc, n) => {
            acc.light += n.light;
            acc.temp += n.temp;
            acc.humidity += n.humidity;
            acc.wind += n.wind;
            return acc;
          }, { light: 0, temp: 0, humidity: 0, wind: 0 });
          const inv = 1 / neighbors.length;
          avg.light *= inv; avg.temp *= inv; avg.humidity *= inv; avg.wind *= inv;

          // move current value fractionally toward neighbor average
          const cur = this.grid[y][x];
          cur.light = cur.light + (avg.light - cur.light) * factor;
          cur.temp = cur.temp + (avg.temp - cur.temp) * factor;
          cur.humidity = cur.humidity + (avg.humidity - cur.humidity) * factor;
          cur.wind = cur.wind + (avg.wind - cur.wind) * factor;
          cur.clamp();
        }
      }
    }
  }

  // snapshot as 2D array of plain objects
  snapshot() {
    return this.grid.map(row => row.map(c => c.toObject()));
  }
}

module.exports = GardenField;

