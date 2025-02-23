import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import COLORS from '../config/colors';

const screenWidth = Dimensions.get("window").width;

export default function EcLevelScreen() {
  const [ecLevel, setEcLevel] = useState(2.5);
  const [currentEcLevel, setCurrentEcLevel] = useState(2.5);
  const [isSettingEc, setIsSettingEc] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setChartData({
        labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        datasets: [
          { 
            data: [2.5, 2.6, 2.5, 2.7, 2.6, 2.5, 2.7], 
            label: "EC Level",
            color: (opacity = 1) => `rgba(75, 192, 192, ${opacity * 0.6})`
          }
        ],
      });
      setLoading(false);
    }, 1000);
  }, []);

  const handleSetEcLevel = () => {
    setIsSettingEc(true);
    setTimeout(() => {
      setCurrentEcLevel(ecLevel);
      setIsSettingEc(false);
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EC Level Adjustment</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#3498db" />
      ) : (
        <LineChart
          data={chartData}
          width={screenWidth - 40}
          height={220}
          yAxisSuffix=""
          yAxisInterval={1}
          chartConfig={{
            backgroundColor: "#f5f5f5",
            backgroundGradientFrom: "#e3f2fd",
            backgroundGradientTo: "#bbdefb",
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 10 },
            propsForDots: { r: "5", strokeWidth: "2", stroke: "#3498db" },
          }}
          bezier
          style={{ marginVertical: 10, borderRadius: 10 }}
        />
      )}

      <View style={styles.currentValueContainer}>
        <Text style={styles.currentValueLabel}>Current EC Level:</Text>
        <Text style={styles.currentValueText}>{currentEcLevel}</Text>
      </View>

      <View style={styles.adjustingValueContainer}>
        <Text style={styles.currentValueLabel}>Adjusting EC Level:</Text>
        <Text style={styles.currentValueText}>{ecLevel.toFixed(1)}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={() => setEcLevel(prev => Math.max(0, prev - 0.1))} style={styles.iconButton}>
          <Ionicons name="remove-circle-outline" size={30} color="black" />
        </TouchableOpacity>

        <Slider
          style={{ width: 200, height: 40 }}
          minimumValue={0}
          maximumValue={10}
          step={0.1}
          value={ecLevel}
          onValueChange={setEcLevel}
          minimumTrackTintColor="#3498db"
        />

        <TouchableOpacity onPress={() => setEcLevel(prev => Math.min(10, prev + 0.1))} style={styles.iconButton}>
          <Ionicons name="add-circle-outline" size={30} color="black" />
        </TouchableOpacity>
      </View>

      <Button mode="contained" onPress={handleSetEcLevel} disabled={isSettingEc} style={styles.setButton}>
        {isSettingEc ? "Setting..." : `Set to ${ecLevel.toFixed(1)}`}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: COLORS.lightGreen || "#E8F5E9" },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  currentValue: { fontSize: 18, marginVertical: 10 },
  currentValueContainer: { 
    backgroundColor: "#dff0d8", 
    padding: 10, 
    borderRadius: 8, 
    alignItems: "center", 
    marginBottom: 10 
  },
  currentValueLabel: { fontSize: 16, fontWeight: "bold", color: "#2c662d" },
  currentValueText: { fontSize: 24, fontWeight: "bold", color: "#2c662d" },
  adjustingValueContainer: { 
    backgroundColor: "#f0e68c", 
    padding: 10, 
    borderRadius: 8, 
    alignItems: "center", 
    marginBottom: 10 
  },
  
  controlContainer: { marginTop: 20, alignItems: "center" },
  buttonContainer: { flexDirection: "row", alignItems: "center", marginTop: 10 , justifyContent: 'center'},
  iconButton: { padding: 5,alignItems: 'center'},

  setButton: {
    width: 150, 
    alignSelf: 'center', // Center the button horizontally
    marginTop: 10, //Adds a bit of space between the slider and button
  },
});
