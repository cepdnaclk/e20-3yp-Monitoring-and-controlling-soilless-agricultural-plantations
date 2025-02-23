import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SplashScreen from './app/screens/splashscreen'; // Added Splash Screen
import WelcomeScreen from './app/screens/WelcomeScreen';
import LoginScreen from './app/screens/LoginScreen';
import RegisterScreen from './app/screens/RegisterScreen';
import ViewImageScreen from './app/screens/ViewImageScreen';
import HomeScreen from './app/screens/HomeScreen'; // Bottom Tab Navigation
import DashboardScreen from './app/screens/DashboardScreen';

import SoilMoistureScreen from './app/screens/SoilMoistureScreen';
import TemperatureScreen from './app/screens/TemperatureScreen';
import HumidityScreen from './app/screens/HumidityScreen';
import PhLevelScreen from './app/screens/PhLevelScreen';
import EcLevelScreen from './app/screens/EcLevelScreen';

import LandingScreen from './app/screens/LandingScreen';
import PlantationsScreen from './app/screens/PlantationsScreen';
import DetailsScreen from './app/compononts/PlantDetails';
import DeviceScreen from './app/screens/DeviceScreen';
import DeviceDetailsScreen from './app/compononts/DeviceDetail';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash" // Changed to start with Splash Screen
        screenOptions={{
          animation: 'slide_from_right', // Smooth transition
        }}
      >
        {/* NEW: Added Splash Screen as the first screen */}
        <Stack.Screen 
          name="Splash" 
          component={SplashScreen} 
          options={{ headerShown: false }} 
        />

        <Stack.Screen 
          name="Welcome" 
          component={WelcomeScreen} 
          options={{ headerShown: false }} 
        />

        <Stack.Screen 
          name="Landing" 
          component={LandingScreen} 
          options={{ headerShown: false }} 
        />

        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }} 
        />

        <Stack.Screen 
          name="Register" 
          component={RegisterScreen} 
          options={{ headerShown: false }} 
        />

        <Stack.Screen 
          name="ViewImageScreen" 
          component={ViewImageScreen} 
          options={{ headerShown: false }} 
        />

        <Stack.Screen 
          name="Details" 
          component={DetailsScreen} 
          options={{ headerShown: false }} 
        />

        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ headerShown: false }} 
        />

        <Stack.Screen 
          name="Dashboard" 
          component={DashboardScreen} 
          options={{ headerShown: false }} 
        />

        <Stack.Screen 
          name="Devices" 
          component={DeviceScreen} 
          options={{ headerShown: false }} 
        />

        {/* New route for Device Details */}
        <Stack.Screen 
          name="DeviceDetail" 
          component={DeviceDetailsScreen} 
          options={{ headerShown: false }} 
        />
         {/* Added Parameter Screens */}
        <Stack.Screen 
          name="SoilMoisture" 
          component={SoilMoistureScreen} 
          options={{ title: 'Soil Moisture' }} 
        />

        <Stack.Screen 
          name="Temperature" 
          component={TemperatureScreen} 
          options={{ title: 'Temperature' }} 
        />

        <Stack.Screen 
          name="Humidity" 
          component={HumidityScreen} 
          options={{ title: 'Humidity' }} 
        />

        <Stack.Screen 
          name="PhLevel" 
          component={PhLevelScreen} 
          options={{ title: 'pH Level' }} 
        />
        <Stack.Screen 
          name="EcLevel" 
          component={EcLevelScreen} 
          options={{ title: 'EC Level' }} 
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}
