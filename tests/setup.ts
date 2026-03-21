import '@testing-library/jest-dom'

// Provide a localStorage mock for Node.js environments where
// the native localStorage (Node 22+) doesn't implement the Web Storage API.
if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
  const store: Record<string, string> = {}
  const mockLocalStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { Object.keys(store).forEach(k => delete store[k]) },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  })
}
