#!/usr/bin/env node
// Script to run all test files in the test/ directory
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, 'test');
const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.js'));

let allPassed = true;

for (const file of testFiles) {
  const filePath = path.join(testDir, file);
  console.log(`\nRunning: ${file}`);
  try {
    execSync(`node "${filePath}"`, { stdio: 'inherit' });
  } catch (err) {
    allPassed = false;
  }
}

if (allPassed) {
  console.log('\nAll tests passed!');
  process.exit(0);
} else {
  console.log('\nSome tests failed.');
  process.exit(1);
}
