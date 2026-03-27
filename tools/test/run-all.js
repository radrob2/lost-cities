const { execSync } = require('child_process');
const path = require('path');

const tests = [
  'test-scoring.js',
  'test-legal-moves.js',
  'test-game-sim.js'
];

const dir = __dirname;
let allPassed = true;

console.log('Running all tests...\n');

for (const t of tests) {
  const file = path.join(dir, t);
  try {
    const output = execSync(`node "${file}"`, { encoding: 'utf8', cwd: dir });
    console.log(output);
  } catch (e) {
    console.log(e.stdout || '');
    console.log(e.stderr || '');
    allPassed = false;
  }
}

if (allPassed) {
  console.log('\nAll test suites passed.');
} else {
  console.log('\nSome tests failed.');
  process.exit(1);
}
