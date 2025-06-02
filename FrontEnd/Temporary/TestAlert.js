import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import AlertsScreen from '../screens/AlertScreen';
import '@testing-library/jest-native/extend-expect';
import * as firestore from 'firebase/firestore';
import * as utils from '../utils/controlCommands';

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

    firestore.onSnapshot.mockImplementation((ref, callback) => {
      if (ref.path?.includes('control_settings')) {
        callback({
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
        callback({
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
        callback({ docs: [] });
      }

      return () => {}; // unsubscribe mock
    });
  });

  it('renders alert from sensor mismatch and shows dismiss button', async () => {
    const { getAllByText, queryByText } = render(
      <AlertsScreen userId="user123" groupId="groupA" />
    );

    await waitFor(() => {
      expect(queryByText(/pH Level is off!/)).toBeTruthy();
    });

    const dismissButtons = getAllByText('Dismiss');
    fireEvent.press(dismissButtons[0]);

    await waitFor(() => {
      expect(queryByText(/pH Level is off!/)).toBeNull();
    });
  });
  it('does not trigger control commands in manual mode', async () => {
  firestore.onSnapshot.mockImplementationOnce((ref, callback) => {
    if (ref.path?.includes('control_settings')) {
      callback({
        exists: () => true,
        data: () => ({
          pHTarget: 6.5,
          ecTarget: 2.0,
          soilMoistureTarget: 50,
          tempTarget: 24,
          humidityTarget: 60,
          mode: 'manual', // 🔁 Manual mode
        }),
      });
    } else if (ref.path?.includes('sensor_data')) {
      callback({
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
    }
    return () => {};
  });

  render(<AlertsScreen userId="user123" groupId="groupA" />);

  await waitFor(() => {
    expect(utils.sendControlCommand).not.toHaveBeenCalled();
  });
});

it('triggers only pH alert if all other parameters are fine', async () => {
  firestore.onSnapshot.mockImplementation((ref, callback) => {
    if (ref.path?.includes('control_settings')) {
      callback({
        exists: () => true,
        data: () => ({
          pHTarget: 6.5,
          ecTarget: 2.0,
          soilMoistureTarget: 20,
          tempTarget: 30,
          humidityTarget: 40,
          mode: 'auto',
        }),
      });
    } else if (ref.path?.includes('sensor_data')) {
      callback({
        empty: false,
        docs: [
          {
            data: () => ({
              ph: 4.0, // pH is off
              ec: 2.0, // EC is OK
              soil_moisture: 20,
              temperature: 30,
              humidity: 40,
            }),
          },
        ],
      });
    } else {
      callback({ docs: [] });
    }
    return () => {};
  });

  const { getByText } = render(
    <AlertsScreen userId="user123" groupId="groupA" />
  );

  await waitFor(() => {
    expect(getByText(/pH Level is off!/)).toBeTruthy();
    expect(utils.sendControlCommand).toHaveBeenCalledWith(
      'user123',
      'groupA',
      'increase_pH',
      expect.any(Number),
      {
        nutrient_pump: 'device123',
        water_pump: 'device456',
      }
    );
  });

  expect(utils.sendControlCommand).toHaveBeenCalledTimes(1);
});




  
});
