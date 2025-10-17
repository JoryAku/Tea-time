const assert = require('assert');
const GardenField = require('../../engine/garden/GardenField');
const GardenVector = require('../../engine/garden/GardenVector');

function testGardenExpansion() {
  console.log('Test: garden expansion - accessing out-of-bounds cell grows the field');

  // Start with a small field
  const field = new GardenField(2, 2); // 2x2

  // baseline cell to compare clones
  const base = field.getCell(0,0);
  assert.ok(base instanceof GardenVector, 'base cell should be a GardenVector');

  // Access a cell far outside bounds to force expansion
  field.getCell(5, 4); // should expand the grid to include x=5,y=4

  // Verify the grid expanded
  assert.ok(field.width >= 6, `field.width should be at least 6 but is ${field.width}`);
  assert.ok(field.height >= 5, `field.height should be at least 5 but is ${field.height}`);

  // The previously existing cell should still refer to the original vector (not null)
  const stillThere = field.getCell(0,0);
  assert.ok(stillThere instanceof GardenVector, 'existing cell should still be a GardenVector after expansion');

  // The newly created cell should be a GardenVector and be clamped/initialized
  const newCell = field.getCell(5,4);
  assert.ok(newCell instanceof GardenVector, 'new cell should be a GardenVector');

  // Ensure size value matches width*height
  assert.strictEqual(field.size, field.width * field.height);

  console.log('  garden expansion test passed');
}

if (require.main === module) {
  testGardenExpansion();
  console.log('\n✅ Garden expansion test passed');
}

module.exports = { testGardenExpansion };
