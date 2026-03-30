const { on, off, emit, clear } = require('../../public/src/events');

let passed = 0, failed = 0;
function test(name, fn) {
  clear();
  try { fn(); passed++; console.log('  PASS: ' + name); }
  catch (e) { failed++; console.log('  FAIL: ' + name + ' — ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

console.log('\n=== Events Tests ===\n');

test('on + emit calls listener', () => {
  let called = false;
  on('test', () => { called = true; });
  emit('test');
  assert(called, 'listener not called');
});

test('emit passes data to listener', () => {
  let received = null;
  on('test', (data) => { received = data; });
  emit('test', { value: 42 });
  assert(received && received.value === 42, 'data not passed');
});

test('multiple listeners all called', () => {
  let count = 0;
  on('test', () => { count++; });
  on('test', () => { count++; });
  emit('test');
  assert(count === 2, 'expected 2, got ' + count);
});

test('different events are independent', () => {
  let a = false, b = false;
  on('a', () => { a = true; });
  on('b', () => { b = true; });
  emit('a');
  assert(a === true, 'a not called');
  assert(b === false, 'b should not be called');
});

test('emit with no listeners does not throw', () => {
  emit('nonexistent', { data: 1 });
});

test('off removes a specific listener', () => {
  let count = 0;
  const fn = () => { count++; };
  on('test', fn);
  emit('test');
  assert(count === 1, 'should be called once');
  off('test', fn);
  emit('test');
  assert(count === 1, 'should still be 1 after off');
});

test('clear removes all listeners', () => {
  let called = false;
  on('test', () => { called = true; });
  clear();
  emit('test');
  assert(called === false, 'should not be called after clear');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
