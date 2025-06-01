import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import AlertsScreen from '../screens/AlertsScreen';
 // Adjust path if needed
import * as firestore from 'firebase/firestore';
import * as utils from '../utils/controlCommands';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  onSnapshot: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('../utils/controlCommands', () => ({
  sendControlCommand: jest.fn(),
  sendStopCommand: jest.fn(),
  fetchDeviceIdMap: jest.fn(),
}));

describe('AlertsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    utils.fetchDeviceIdMap.mockResolvedValue({
      nutrient_pump: 'device123',
      water_pump: 'device456',
    });

    firestore.onSnapshot.mockImplementation((ref, cb) => {
      if (ref.path?.includes('control_settings')) {
        cb({
          exists: () => true,
          data: () => ({
            pHTarget: 6.5,
            ecTarget: 2.0,
            soilMoistureTarget: 50,
            tempTarget: 24,
            humidityTarget: 60,
            mode: 'auto',
          }),
        });
      } else if (ref.path?.includes('sensor_data')) {
        cb({
          empty: false,
          docs: [
            {
              data: () => ({
                ph: 4.0,
                ec: 1.0,
                soil_moisture: 20,
                temperature: 30,
                humidity: 40,
              }),
            },
          ],
        });
      } else {
        cb({ docs: [] });
      }

      return () => {}; // Mock unsubscribe
    });
  });

  it('renders alert from sensor mismatch and shows dismiss button', async () => {
    const { getByText, queryByText } = render(
      <AlertsScreen userId="user123" groupId="groupA" />
    );

    await waitFor(() => {
      expect(getByText(/pH is off!/)).toBeTruthy();
    });

    fireEvent.press(getByText('Dismiss'));

    await waitFor(() => {
      expect(queryByText(/pH is off!/)).toBeNull();
    });
  });
});
