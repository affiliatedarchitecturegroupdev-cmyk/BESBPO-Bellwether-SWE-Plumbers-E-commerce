import '@testing-library/jest-dom';

// crypto.randomUUID() is used by several components for generating stable
// row keys in dynamic forms (e.g. RequestReturnForm, GuestCheckoutForm).
// Its availability as a jsdom global varies across Node/Jest version
// combinations — guarded so this only polyfills when genuinely absent,
// rather than assuming either way and risking a flaky failure in a real
// CI environment that happens to run a different version than whatever
// this was last checked against.
if (typeof globalThis.crypto === 'undefined' || typeof globalThis.crypto.randomUUID !== 'function') {
  let counter = 0;
  Object.defineProperty(globalThis, 'crypto', {
    value: { randomUUID: () => `test-uuid-${++counter}` },
    configurable: true,
  });
}
