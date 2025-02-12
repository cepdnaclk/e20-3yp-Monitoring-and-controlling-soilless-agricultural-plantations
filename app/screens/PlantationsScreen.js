// PlantationsScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PlantationsScreen = () => {
  return (
    <View style={styles.screenContainer}>
      <Text style={styles.text}>Welcome to Plantations!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
});

export default PlantationsScreen;
