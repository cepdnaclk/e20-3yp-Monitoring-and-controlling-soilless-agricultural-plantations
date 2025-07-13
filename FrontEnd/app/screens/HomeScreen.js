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

import { useState } from 'react';
import { useEffect } from 'react';

const Tab = createBottomTabNavigator();

const HomeScreen = ({ route }) => {
  const userId = route.params?.userId; // ✅ Retrieve userId safely
  const [selectedGroupId, setSelectedGroupId] = useState(null);

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
  options={{
    tabBarIcon: ({ color }) => (
      <Icon name="dashboard" size={30} color={color} />
    ),
  }}
>
  {(props) => (
    <DashboardScreen
      {...props}
      userId={userId}
      onGroupChange={setSelectedGroupId}
    />
  )}
</Tab.Screen>




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

      {/* Ideas */}
      <Tab.Screen
        name="Ideas"
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
  options={{
    tabBarIcon: ({ color }) => (
      <Icon name="notifications" size={30} color={color} />
    ),
  }}
>
  {() => <AlertScreen userId={userId} groupId={selectedGroupId} />}
</Tab.Screen>


    </Tab.Navigator>
  );
};

export default HomeScreen;
