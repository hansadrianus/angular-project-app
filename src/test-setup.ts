// Global test setup for Vitest + Angular
import '@angular/core/testing';

// jsdom provides localStorage, but set up a global guard just in case
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    },
    writable: true,
  });
}
