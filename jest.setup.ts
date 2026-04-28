import '@testing-library/jest-dom';

// ============================================
// MOCKS pour modules ESM problématiques
// ============================================

// Mock jsPDF (module ESM incompatible avec Jest)
jest.mock('jspdf', () => {
  return {
    jsPDF: jest.fn().mockImplementation(() => ({
      text: jest.fn(),
      setFontSize: jest.fn(),
      setTextColor: jest.fn(),
      setFillColor: jest.fn(),
      rect: jest.fn(),
      addImage: jest.fn(),
      internal: {
        pageSize: {
          getWidth: () => 210,
          getHeight: () => 297,
        },
      },
      save: jest.fn(),
      output: jest.fn(() => 'mock-pdf-data'),
      addPage: jest.fn(),
      setFont: jest.fn(),
      setLineWidth: jest.fn(),
      line: jest.fn(),
      autoTable: jest.fn(),
    })),
  };
});

// Mock jspdf-autotable
jest.mock('jspdf-autotable', () => ({
  default: jest.fn(),
}));

// ============================================
// localStorage Mock Complet
// ============================================

class LocalStorageMock {
  private store: { [key: string]: string };

  constructor() {
    this.store = {};
  }

  clear() {
    this.store = {};
  }

  getItem(key: string) {
    return this.store[key] || null;
  }

  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }

  removeItem(key: string) {
    delete this.store[key];
  }

  get length() {
    return Object.keys(this.store).length;
  }

  key(index: number) {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

global.localStorage = new LocalStorageMock() as Storage;

// ============================================
// window.dispatchEvent Mock
// ============================================

const originalDispatchEvent = window.dispatchEvent;
window.dispatchEvent = jest.fn((event: Event) => {
  return originalDispatchEvent.call(window, event);
});

// ============================================
// Geolocation Mock
// ============================================

global.navigator.geolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
} as unknown as Geolocation;

// ============================================
// Blob.text() Mock pour Node.js
// ============================================

if (typeof Blob !== 'undefined' && !Blob.prototype.text) {
  Blob.prototype.text = async function() {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(this);
    });
  };
}

// ============================================
// beforeEach: Reset tous les mocks
// ============================================

beforeEach(() => {
  // Clear localStorage avant chaque test
  localStorage.clear();
  
  // Reset tous les mocks Jest
  jest.clearAllMocks();
});
