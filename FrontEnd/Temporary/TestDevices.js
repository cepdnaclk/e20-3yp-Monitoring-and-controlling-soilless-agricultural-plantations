import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import DeviceScreen from '../screens/DeviceScreen';
import * as firestore from 'firebase/firestore';
import * as deviceUtils from '../utils/initializeGroupDefaults';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Mock navigation context
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({ navigate: jest.fn() }),
    useRoute: () => ({ params: { userId: 'test-user' } }),
  };
});

// ✅ Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
}));

// ✅ Mock group initialization
jest.mock('../utils/initializeGroupDefaults', () => ({
  initializeGroupDefaults: jest.fn(),
}));

// ✅ Mock expo-camera
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() =>
      Promise.resolve({ status: 'granted' })
    ),
  },
}));

// ✅ Mock firebase/firestore
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn((...args) => args.join('/')),
  collection: jest.fn((...args) => args.join('/')),
  serverTimestamp: jest.fn(() => new Date()),
  getDoc: jest.fn(),
  onSnapshot: jest.fn((ref, callback) => {
    callback({
      docs: [], // Mock empty list of groups
    });
    return jest.fn(); // Mock unsubscribe function
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DeviceScreen', () => {
  it('renders without crashing', async () => {
    firestore.getDocs.mockResolvedValueOnce({
      forEach: jest.fn(),
    });

    const { getByText } = render(<DeviceScreen />);
    await waitFor(() => getByText('Manage Devices'));
  });
});

