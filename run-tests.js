#!/usr/bin/env node
// Script to run all test files in the test/ directory
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, 'test');

// Recursively find all .js files in the test directory
function findTestFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findTestFiles(fullPath));
    } else if (item.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

const testFiles = findTestFiles(testDir);
console.log(`Found ${testFiles.length} test files\n`);

let passedTests = [];
let failedTests = [];

for (const filePath of testFiles) {
  const relativePath = path.relative(testDir, filePath);
  console.log(`Running: ${relativePath}`);
  
  try {
    execSync(`node "${filePath}"`, { stdio: 'pipe' });
    passedTests.push(relativePath);
    console.log(`✅ PASSED: ${relativePath}\n`);
  } catch (err) {
    failedTests.push(relativePath);
    console.log(`❌ FAILED: ${relativePath}`);
    console.log(`Error: ${err.message}\n`);
  }
}

console.log('='.repeat(50));
console.log('TEST RESULTS SUMMARY');
console.log('='.repeat(50));

console.log(`\n✅ PASSED (${passedTests.length}):`);
passedTests.forEach(test => console.log(`   ${test}`));

if (failedTests.length > 0) {
  console.log(`\n❌ FAILED (${failedTests.length}):`);
  failedTests.forEach(test => console.log(`   ${test}`));
}

console.log(`\nTotal: ${testFiles.length}, Passed: ${passedTests.length}, Failed: ${failedTests.length}`);

if (failedTests.length === 0) {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('\n💥 Some tests failed.');
  process.exit(1);
}
