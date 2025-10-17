const GardenVector = require('./GardenVector');
const LayerVector = require('./LayerVector');

// Layers from top -> bottom
const LAYERS = ['emergent', 'canopy', 'understory', 'undergrowth', 'root'];

class LayeredGardenCell {
  constructor(seedLayer) {
    // initialize a LayerVector per layer
    this.layers = {};
    LAYERS.forEach(name => {
      this.layers[name] = seedLayer ? seedLayer.clone() : new LayerVector();
    });
  }

  // Apply a LayerVector-like addition to a target layer
  addToLayer(layerName, vec) {
    if (!this.layers[layerName]) this.layers[layerName] = new LayerVector();
    this.layers[layerName].add(vec).clamp();
    return this;
  }

  // Emit influence into multiple layers (object keys matching layer names)
  emit(influences) {
    Object.keys(influences || {}).forEach(layer => {
      if (this.layers[layer]) this.layers[layer].add(influences[layer]).clamp();
    });
    return this;
  }

  // Vertical diffusion step within this cell (simple transfers between layers)
  verticalDiffuse(params = {}) {
    // params: lightDecayPerLayer, moistureUpwardFactor, organicDownwardFactor
    const lightDecay = typeof params.lightDecay === 'number' ? params.lightDecay : 0.15;
    const moistureUp = typeof params.moistureUp === 'number' ? params.moistureUp : 0.02;
    const organicDown = typeof params.organicDown === 'number' ? params.organicDown : 0.03;

    // Light: reduce as we go down
    for (let i = 0; i < LAYERS.length - 1; i++) {
      const top = this.layers[LAYERS[i]];
      const below = this.layers[LAYERS[i + 1]];
      const transfer = (top.light - below.light) * lightDecay;
      top.light = Math.max(0, top.light - transfer);
      below.light = Math.min(1, below.light + transfer);
    }

    // Moisture upward: small fraction moves up from lower layers
    for (let i = LAYERS.length - 1; i > 0; i--) {
      const lower = this.layers[LAYERS[i]];
      const above = this.layers[LAYERS[i - 1]];
      const t = (lower.moisture - above.moisture) * moistureUp;
      lower.moisture = Math.max(0, lower.moisture - t);
      above.moisture = Math.min(1, above.moisture + t);
    }

    // Organic matter moves downward slowly
    for (let i = 0; i < LAYERS.length - 1; i++) {
      const top = this.layers[LAYERS[i]];
      const below = this.layers[LAYERS[i + 1]];
      const t = (top.organic) * organicDown;
      top.organic = Math.max(0, top.organic - t);
      below.organic = Math.min(1, below.organic + t);
    }

    // Clamp all layers
    LAYERS.forEach(name => this.layers[name].clamp());
  }

  // Return an aggregated object compatible with GardenVector (light,temp,humidity,wind)
  toGardenVectorObject() {
    // For backward compatibility, derive: light = canopy-weighted, temp = avg, humidity <- moisture in understory, wind = emergent.wind
    const emergent = this.layers.emergent;
    const canopy = this.layers.canopy;
    const understory = this.layers.understory;
    const root = this.layers.root;

    const light = Math.max(0, Math.min(1, emergent.light * 0.5 + canopy.light * 0.35 + understory.light * 0.15));
    const temp = (emergent.temp + canopy.temp + understory.temp + root.temp) / 4;
    const humidity = Math.max(0, Math.min(1, understory.moisture));
    const wind = emergent.wind || 0;

    return { light, temp, humidity, wind };
  }

  // Backwards-compatible alias used by existing code/tests
  toObject() {
    return this.toGardenVectorObject();
  }
}

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
  constructor(width = 4, height = 2, seedLayer = new LayerVector()) {
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    this.size = this.width * this.height;
    // initialize 2D grid of layered cells
    this.grid = new Array(this.height).fill(null).map(() => new Array(this.width).fill(null));
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] = new LayeredGardenCell(seedLayer);
      }
    }
    // diffusion config
    this.verticalParams = { lightDecay: 0.15, moistureUp: 0.02, organicDown: 0.03 };
    this.horizontalDiffusionFactor = 0.2;
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

  // Return an aggregated garden-vector-like object for the specific plant's occupied layers
  // plant.layers is expected to be an array of layer names; if absent, return aggregated cell vector
  getPlantLocal(x, y, plant) {
    if (y === undefined) {
      const [xx, yy] = this._idxToXY(x);
      x = xx; y = yy;
    }
    const cell = this.getCell(x, y);
    if (!plant || !Array.isArray(plant.layers) || plant.layers.length === 0) {
      return cell.toGardenVectorObject();
    }
    // Average the layers the plant occupies
    let acc = { light: 0, temp: 0, humidity: 0, wind: 0 };
    const used = plant.layers.filter(l => LAYERS.includes(l));
    if (used.length === 0) return cell.toGardenVectorObject();
    used.forEach(l => {
      const lv = cell.layers[l];
      acc.light += lv.light;
      acc.temp += lv.temp;
      acc.humidity += lv.moisture;
      acc.wind += lv.wind || 0;
    });
    const inv = 1 / used.length;
    return { light: acc.light * inv, temp: acc.temp * inv, humidity: acc.humidity * inv, wind: acc.wind * inv };
  }

  getPlantLocalByIndex(idx, plant) {
    const [x, y] = this._idxToXY(idx);
    return this.getPlantLocal(x, y, plant);
  }

  // Apply an influence targeted to the plant's occupied layers. influenceVec is a garden-vector-like {light,temp,humidity,wind}
  emitToPlantLayers(x, y, plant, influenceVec, strength = 1) {
    if (y === undefined) {
      const [xx, yy] = this._idxToXY(x);
      x = xx; y = yy;
    }
    const cell = this.getCell(x, y);
    const layers = (plant && Array.isArray(plant.layers) && plant.layers.length > 0) ? plant.layers.filter(l => LAYERS.includes(l)) : ['understory'];
    layers.forEach(l => {
      const lv = { light: (influenceVec.light || 0) * strength, temp: (influenceVec.temp || 0) * strength, moisture: (influenceVec.humidity || 0) * strength, nutrients: 0, organic: 0, wind: (influenceVec.wind || 0) * strength };
      cell.addToLayer(l, lv);
    });
    return cell;
  }

  // Apply weather primarily to the emergent layer; small fraction trickles downward via verticalDiffuse
  applyWeather(vec, scale = 1) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.grid[y][x];
        // map incoming vector into emergent LayerVector format
        const lv = { light: (vec.light || 0) * scale, temp: (vec.temp || 0) * scale, moisture: (vec.humidity || 0) * scale, nutrients: 0, organic: 0, wind: (vec.wind || 0) * scale };
        cell.addToLayer('emergent', lv);
        // allow vertical mixing
        cell.verticalDiffuse(this.verticalParams);
      }
    }
  }

  emitAt(x, y, influenceVec, strength = 1) {
    if (y === undefined) {
      const [xx, yy] = this._idxToXY(x);
      x = xx; y = yy;
    }
    const cell = this.getCell(x, y);
    // influenceVec can be a simple garden-vector (light,temp,humidity,wind) or a per-layer map
    if (influenceVec && (influenceVec.light !== undefined || influenceVec.humidity !== undefined)) {
      // apply to emergent/canopy/understory mapping heuristically
      const lv = { light: (influenceVec.light || 0) * strength, temp: (influenceVec.temp || 0) * strength, moisture: (influenceVec.humidity || 0) * strength, nutrients: 0, organic: 0, wind: (influenceVec.wind || 0) * strength };
      cell.addToLayer('understory', lv);
    } else if (influenceVec && typeof influenceVec === 'object') {
      // assume it's per-layer mapping
      cell.emit(influenceVec);
    }
    return cell;
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

  // create new grid filled with clones of a baseline layered cell (use center origin if possible)
  const baselineCell = this.grid[0] && this.grid[0][0] ? this.grid[0][0] : new LayeredGardenCell(new LayerVector());
  const newGrid = new Array(newHeight).fill(null).map(() => new Array(newWidth).fill(null));

    // offset to map old coordinates into new grid
    const offsetX = -newMinX;
    const offsetY = -newMinY;

    for (let yy = 0; yy < newHeight; yy++) {
      for (let xx = 0; xx < newWidth; xx++) {
        newGrid[yy][xx] = new LayeredGardenCell();
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

  // Horizontal diffusion: average layer-wise neighbors to smooth microclimate horizontally
  diffuse(iterations = 1, factor = this.horizontalDiffusionFactor) {
    for (let it = 0; it < Math.max(1, iterations); it++) {
      // copy current state layers
      const copy = new Array(this.height).fill(null).map(() => new Array(this.width).fill(null));
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          // shallow clone of layered cell (clone each layer)
          const cell = this.grid[y][x];
          const cpy = new LayeredGardenCell();
          LAYERS.forEach(name => { cpy.layers[name] = cell.layers[name].clone(); });
          copy[y][x] = cpy;
        }
      }

      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          // gather neighbors (4-neighbor)
          const neighbors = [];
          const deltas = [[1,0],[-1,0],[0,1],[0,-1]];
          deltas.forEach(([dx,dy]) => {
            const nx = x + dx; const ny = y + dy;
            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) neighbors.push(copy[ny][nx]);
          });
          if (neighbors.length === 0) continue;

          // for each layer, average neighbor values and nudge current toward it
          LAYERS.forEach(layer => {
            // compute neighbor avg for this layer
            const avg = neighbors.reduce((acc, n) => {
              const ln = n.layers[layer];
              acc.light += ln.light; acc.temp += ln.temp; acc.moisture += ln.moisture; acc.nutrients += ln.nutrients; acc.organic += ln.organic; acc.wind += ln.wind;
              return acc;
            }, { light: 0, temp: 0, moisture: 0, nutrients: 0, organic: 0, wind: 0 });
            const inv = 1 / neighbors.length;
            LAYERS
            const cur = this.grid[y][x].layers[layer];
            avg.light *= inv; avg.temp *= inv; avg.moisture *= inv; avg.nutrients *= inv; avg.organic *= inv; avg.wind *= inv;

            cur.light = cur.light + (avg.light - cur.light) * factor;
            cur.temp = cur.temp + (avg.temp - cur.temp) * factor;
            cur.moisture = cur.moisture + (avg.moisture - cur.moisture) * factor;
            cur.nutrients = cur.nutrients + (avg.nutrients - cur.nutrients) * factor;
            cur.organic = cur.organic + (avg.organic - cur.organic) * factor;
            cur.wind = cur.wind + (avg.wind - cur.wind) * factor;
            cur.clamp();
          });
        }
      }
    }
  }

  // snapshot as 2D array of plain objects
  snapshot() {
    // return per-cell per-layer snapshots
    return this.grid.map(row => row.map(cell => {
      const out = {};
      LAYERS.forEach(name => out[name] = cell.layers[name].toObject());
      return out;
    }));
  }

  // Return a richer per-layer numeric snapshot (2D array), each cell is an object mapping layer name -> numeric vector
  snapshotLayers() {
    const out = new Array(this.height).fill(null).map(() => new Array(this.width).fill(null));
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.grid[y][x];
        const cellOut = {};
        LAYERS.forEach(name => {
          const lv = cell.layers[name];
          cellOut[name] = { light: lv.light, temp: lv.temp, moisture: lv.moisture, nutrients: lv.nutrients, organic: lv.organic, wind: lv.wind };
        });
        out[y][x] = cellOut;
      }
    }
    return out;
  }
}

module.exports = GardenField;

