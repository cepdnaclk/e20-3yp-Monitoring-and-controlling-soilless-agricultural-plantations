// HomeScreen.js
import React from 'react';
import { View, Text, SafeAreaView, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DashboardScreen from './DashboardScreen'; // Define these screens
import UserScreen from './UserScreen'; // Define these screens
import PlantationsScreen from './PlantationsScreen'; // Define these screens
import COLORS from '../config/colors'; // Ensure you import the COLORS file
import LandingScreen from './LandingScreen';

const Tab = createBottomTabNavigator();

const HomeScreen = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.green,
        tabBarInactiveTintColor: 'grey',
        tabBarStyle: { backgroundColor: COLORS.white },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="dashboard" size={30} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="User"
        component={UserScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="person" size={30} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Plantrations"
        component={LandingScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="local-florist" size={30} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default HomeScreen;
