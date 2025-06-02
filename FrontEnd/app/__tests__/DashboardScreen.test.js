import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import DashboardScreen from '../screens/DashboardScreen';
import * as firestore from 'firebase/firestore';

console.log('🧪 DashboardScreen:', DashboardScreen);

// ✅ Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useRoute: () => ({ params: { userId: 'test-user' } }),
}));

// ✅ Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');

// ✅ Mock react-native-paper with Card.Content fix
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  const Card = ({ children }) => <View>{children}</View>;
  Card.Content = ({ children }) => <View>{children}</View>;
  return {
    Card,
    Text: (props) => <Text {...props} />,
  };
});

// ✅ Mock Firestore
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn((...args) => args.join('/')),
  doc: jest.fn((...args) => args.join('/')),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
  onSnapshot: jest.fn((ref, callback, errorCallback) => {
    if (ref.includes('deviceGroups') && !ref.includes('sensor_data')) {
      callback({
        docs: [{ id: 'test-group', data: () => ({ name: 'Test Group' }) }],
      });
    }
    if (ref.includes('sensor_data') || ref.includes('sensor_history')) {
      callback({ docs: [] });
    }
    return jest.fn(); // unsubscribe
  }),
  orderBy: jest.fn(() => 'orderBy'),
  limit: jest.fn(() => 'limit'),
  query: jest.fn(() => 'query'),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DashboardScreen', () => {
  it('shows fallback when no userId is provided', () => {
    const { getByText } = render(<DashboardScreen />);
    expect(getByText('No user ID provided')).toBeTruthy();
  });

  it('handles Firestore errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    firestore.onSnapshot.mockImplementationOnce((ref, cb, errCb) => {
      errCb(new Error('Firestore Error'));
      return jest.fn();
    });

    const { getByText } = render(
      <DashboardScreen userId="test-user" onGroupChange={() => {}} />
    );

    await waitFor(() => getByText('Select Device Group'));

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error listening to groups:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  
});
