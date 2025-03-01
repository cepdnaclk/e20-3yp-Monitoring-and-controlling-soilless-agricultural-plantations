import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import Slider from '@react-native-community/slider';
import { LineChart } from 'react-native-chart-kit';
import { Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig"; // Firestore reference
import COLORS from '../config/colors';

export default function SoilMoistureScreen({ navigation, route }) {
  const { userId } = route.params;  // ✅ Get userId from navigation params
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [moistureLevel, setMoistureLevel] = useState(78); // Temporary adjusting value
  const [currentMoistureLevel, setCurrentMoistureLevel] = useState(78); // Actual set value
  const [isSetting, setIsSetting] = useState(false);

  // ✅ Fetch user-specific Soil Moisture control settings from Firestore
  useEffect(() => {
    if (!userId) {
      console.error("❌ No User ID provided!");
      return;
    }

    const fetchMoistureLevel = async () => {
      try {
        const docRef = doc(db, `users/${userId}/control_settings`, "1");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("📡 Fetched User-Specific Soil Moisture Target:", data.soilMoistureTarget);
          setMoistureLevel(data.soilMoistureTarget);
          setCurrentMoistureLevel(data.soilMoistureTarget);
        } else {
          console.log("⚠️ No soil moisture target found in Firestore. Using default values...");

          // Automatically create default settings
          await setDoc(docRef, { soilMoistureTarget: 78 }, { merge: true });

          setMoistureLevel(78);
          setCurrentMoistureLevel(78);
        }
      } catch (error) {
        console.error("🔥 Firestore Error fetching Soil Moisture Target:", error);
      }
    };

    fetchMoistureLevel();
  }, [userId]);

  // ✅ Simulated historical Soil Moisture data (Replace with Firestore query later)
  useEffect(() => {
    setTimeout(() => {
      setChartData({
        labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        datasets: [
          { 
            data: [70, 72, 68, 74, 71, 73, 75], 
            label: "Soil Moisture (%)",
            color: (opacity = 1) => `rgba(153, 102, 255, ${opacity * 0.6})`
          }
        ],
      });
      setLoading(false);
    }, 1000);
  }, []);

  // ✅ Adjust the Soil Moisture target within 0-100%
  const adjustMoisture = (change) => {
    setMoistureLevel(prev => Math.min(100, Math.max(0, prev + change)));
  };

  // ✅ Update Firestore with new Soil Moisture target for the user
  const handleSetValue = async () => {
    if (!userId) {
      console.error("❌ No User ID provided!");
      return;
    }

    setIsSetting(true);

    try {
      const docRef = doc(db, `users/${userId}/control_settings`, "1");
      await setDoc(docRef, { soilMoistureTarget: moistureLevel }, { merge: true });

      console.log("✅ User-Specific Soil Moisture Target updated in Firestore:", moistureLevel);
      setCurrentMoistureLevel(moistureLevel);
    } catch (error) {
      console.error("❌ Firestore Error updating Soil Moisture Target:", error);
    }

    setIsSetting(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Soil Moisture Adjustment</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#3498db" />
      ) : (
        <LineChart
          data={chartData}
          width={Dimensions.get("window").width - 40}
          height={220}
          yAxisSuffix="%"
          chartConfig={{
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(153, 102, 255, ${opacity * 0.6})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 16 },
          }}
          bezier
          style={{ marginVertical: 8, borderRadius: 16 }}
        />
      )}

      {/* Display Current Soil Moisture Level */}
      <View style={styles.currentValueContainer}>
        <Text style={styles.currentValueLabel}>Current Soil Moisture Level:</Text>
        <Text style={styles.currentValueText}>{currentMoistureLevel}%</Text>
      </View>

      {/* Adjusting Value */}
      <View style={styles.adjustingValueContainer}>
        <Text style={styles.currentValue}>Adjusting Value: {moistureLevel}%</Text>
      </View>

      {/* Adjustment Controls */}
      <View style={styles.controlContainer}>
        <Text>Adjust Soil Moisture Level:</Text>

        {/* Slider Controls */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={() => adjustMoisture(-1)} style={styles.iconButton}>
            <Ionicons name="remove-circle-outline" size={30} color="black" />
          </TouchableOpacity>

          <Slider
            style={{ width: 200, height: 40 }}
            minimumValue={0}
            maximumValue={100}
            step={1}
            value={moistureLevel}
            onValueChange={setMoistureLevel}
            minimumTrackTintColor={COLORS.green || "#00C853"} 
            maximumTrackTintColor="#ccc"
            thumbTintColor="#000"
          />

          <TouchableOpacity onPress={() => adjustMoisture(1)} style={styles.iconButton}>
            <Ionicons name="add-circle-outline" size={30} color="black" />
          </TouchableOpacity>
        </View>

        {/* Set Value Button */}
        <Button mode="contained" onPress={handleSetValue} disabled={isSetting}>
          {isSetting ? "Setting..." : `Set to ${moistureLevel}%`}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: COLORS.lightGreen || "#E8F5E9" },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
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
  buttonContainer: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  iconButton: { padding: 5 },
});
