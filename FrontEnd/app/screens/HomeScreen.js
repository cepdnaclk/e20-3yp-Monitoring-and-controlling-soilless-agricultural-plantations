// HomeScreen.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DashboardScreen from './DashboardScreen';
import UserScreen from './UserScreen';
import DevicesScreen from './DeviceScreen'; 
import LandingScreen from './LandingScreen';
import AlertScreen from './AlertScreen';
import COLORS from '../config/colors';

const Tab = createBottomTabNavigator();

const HomeScreen = ({ route }) => {
  const userId = route.params?.userId; // ✅ Retrieve userId safely

  if (!userId) {
    console.error("🚨 No userId found in HomeScreen!");
  }

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.green,
        tabBarInactiveTintColor: 'grey',
        tabBarStyle: { backgroundColor: COLORS.white },
      }}
    >
      {/* Pass userId to Dashboard */}
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        initialParams={{ userId }} // ✅ Pass userId
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="dashboard" size={30} color={color} />
          ),
        }}
      />

      {/* User Profile */}
      <Tab.Screen
        name="User"
        component={UserScreen}
        initialParams={{ userId }} // ✅ Pass userId
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="person" size={30} color={color} />
          ),
        }}
      />

      {/* Plantations */}
      <Tab.Screen
        name="Plantations"
        component={LandingScreen}
        initialParams={{ userId }} // ✅ Pass userId
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="local-florist" size={30} color={color} />
          ),
        }}
      />

      {/* Devices */}
      <Tab.Screen
        name="Devices"
        component={DevicesScreen}
        initialParams={{ userId }} // ✅ Pass userId
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="devices" size={30} color={color} />
          ),
        }}
      />

      {/* Alerts */}
      <Tab.Screen
        name="Alerts"
        component={AlertScreen}
        initialParams={{ userId }} // ✅ Pass userId
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="notifications" size={30} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default HomeScreen;
