const mockFirestoreRef = {
  path: 'mock/path',
  id: 'mock-id',
  parent: null,
};

const mockQuerySnapshot = {
  docs: [],
  empty: true,
  size: 0,
  forEach: jest.fn(),
};

const mockDocSnapshot = {
  exists: () => true,
  data: () => ({}),
  id: 'mock-id',
  ref: mockFirestoreRef,
};

// --- Firebase Mocks ---
jest.mock('firebase/firestore', () => {
  const original = jest.requireActual('firebase/firestore');
  return {
    ...original,
    getFirestore: jest.fn(() => ({ type: 'firestore' })),
    doc: jest.fn((...args) => ({ path: args.join('/') })), // ✅ FIXED
    collection: jest.fn((...args) => ({ path: args.join('/') })), // ✅ FIXED
    getDocs: jest.fn(() => Promise.resolve(mockQuerySnapshot)),
    getDoc: jest.fn(() => Promise.resolve(mockDocSnapshot)),
    addDoc: jest.fn(() => Promise.resolve(mockFirestoreRef)),
    updateDoc: jest.fn(() => Promise.resolve()),
    deleteDoc: jest.fn(() => Promise.resolve()),
    query: jest.fn(() => mockFirestoreRef),
    where: jest.fn(() => mockFirestoreRef),
    orderBy: jest.fn(() => mockFirestoreRef),
    onSnapshot: jest.fn(), // will override in test
  };
});

jest.mock('./app/firebaseConfig', () => ({
  auth: {
    currentUser: null,
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
  },
  db: {
    collection: jest.fn(() => mockFirestoreRef),
    doc: jest.fn(() => mockFirestoreRef),
  },
}));

// --- React Native & AsyncStorage Mocks ---
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(() => Promise.resolve([])),
}));

jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('react-native-paper', () => ({
  Button: 'Button',
  Text: 'Text',
  Card: 'Card',
  Title: 'Title',
  Paragraph: 'Paragraph',
}));

// Native module patches
jest.mock('react-native/Libraries/Settings/Settings', () => ({ get: jest.fn(), set: jest.fn() }));
jest.mock('react-native/Libraries/Utilities/DevSettings', () => ({ addMenuItem: jest.fn() }));
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
  return class {
    addListener() {}
    removeListeners() {}
  };
});
jest.mock('react-native/Libraries/Components/Clipboard/Clipboard', () => ({
  getString: jest.fn(),
  setString: jest.fn(),
}));
jest.mock('react-native/Libraries/PushNotificationIOS/PushNotificationIOS', () => ({
  requestPermissions: jest.fn(),
  addEventListener: jest.fn(),
  removeAllDeliveredNotifications: jest.fn(),
}));

// Polyfills
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
}
