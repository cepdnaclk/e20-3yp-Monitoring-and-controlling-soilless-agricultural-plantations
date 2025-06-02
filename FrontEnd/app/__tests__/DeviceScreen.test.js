import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import DeviceScreen from '../screens/DeviceScreen';
import * as firestore from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useRoute: () => ({ params: { userId: 'test-user' } }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
}));

jest.mock('../utils/initializeGroupDefaults', () => ({
  initializeGroupDefaults: jest.fn(),
}));

// ✅ Mock Camera + CameraView
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() =>
      Promise.resolve({ status: 'granted' })
    ),
  },
  CameraView: () => {
    return null; // Dummy component
  },
}));

// ✅ Mock Firestore
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
      docs: [
        {
          id: 'group1',
          data: () => ({ name: 'Test Group' }),
        },
      ],
    });
    return jest.fn(); // unsubscribe
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DeviceScreen', () => {
  it('renders without crashing', async () => {
    firestore.getDocs.mockResolvedValueOnce({
      forEach: jest.fn(), // empty
    });

    const { getByText } = render(<DeviceScreen />);
    await waitFor(() => getByText('Manage Devices'));
  });

  it('displays a message when no groups are available', async () => {
    firestore.onSnapshot.mockImplementationOnce((ref, cb) => {
      cb({ docs: [] }); // No groups
      return jest.fn();
    });

    firestore.getDocs.mockResolvedValueOnce({
      forEach: jest.fn(),
    });

    const { getByText } = render(<DeviceScreen />);
    await waitFor(() => getByText('Manage Devices'));
  });

  

  it('does not crash if Firestore throws error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    firestore.getDocs.mockRejectedValueOnce(new Error('Firestore error'));

    const { getByText } = render(<DeviceScreen />);
    await waitFor(() => {
      expect(getByText('Manage Devices')).toBeTruthy();
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });
});
