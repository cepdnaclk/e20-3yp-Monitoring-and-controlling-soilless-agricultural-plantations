import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import Slider from '@react-native-community/slider';
import { LineChart } from 'react-native-chart-kit';
import { Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig"; // Firestore reference
import COLORS from '../config/colors';

export default function EcLevelScreen({ navigation, route }) {
  const { userId } = route.params;  // ✅ Get userId from navigation params
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ecLevel, setEcLevel] = useState(2.5); // Temporary adjusting value
  const [currentEcLevel, setCurrentEcLevel] = useState(2.5); // Actual set value
  const [isSetting, setIsSetting] = useState(false);

  // ✅ Fetch user-specific EC control settings from Firestore
  useEffect(() => {
    if (!userId) {
      console.error("❌ No User ID provided!");
      return;
    }

    const fetchEcLevel = async () => {
      try {
        const docRef = doc(db, `users/${userId}/control_settings`, "1");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("📡 Fetched User-Specific EC Target:", data.ecTarget);
          setEcLevel(data.ecTarget);
          setCurrentEcLevel(data.ecTarget);
        } else {
          console.log("⚠️ No EC target found in Firestore. Using default values...");

          // Automatically create default settings
          await setDoc(docRef, { ecTarget: 2.5 }, { merge: true });

          setEcLevel(2.5);
          setCurrentEcLevel(2.5);
        }
      } catch (error) {
        console.error("🔥 Firestore Error fetching EC Target:", error);
      }
    };

    fetchEcLevel();
  }, [userId]);

  // ✅ Simulated historical EC level data (Replace with Firestore query later)
  useEffect(() => {
    setTimeout(() => {
      setChartData({
        labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        datasets: [
          { 
            data: [2.5, 2.6, 2.5, 2.7, 2.6, 2.5, 2.7], 
            label: "EC Level",
            color: (opacity = 1) => `rgba(255, 206, 86, ${opacity * 0.6})`
          }
        ],
      });
      setLoading(false);
    }, 1000);
  }, []);

  // ✅ Adjust the EC target within 0-10 range
  const adjustEc = (change) => {
    setEcLevel(prev => Math.min(10, Math.max(0, prev + change)));
  };

  // ✅ Update Firestore with new EC target for the user
  const handleSetValue = async () => {
    if (!userId) {
      console.error("❌ No User ID provided!");
      return;
    }

    setIsSetting(true);

    try {
      const docRef = doc(db, `users/${userId}/control_settings`, "1");
      await setDoc(docRef, { ecTarget: ecLevel }, { merge: true });

      console.log("✅ User-Specific EC Target updated in Firestore:", ecLevel);
      setCurrentEcLevel(ecLevel);
    } catch (error) {
      console.error("❌ Firestore Error updating EC Target:", error);
    }

    setIsSetting(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EC Level Adjustment</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#3498db" />
      ) : (
        <LineChart
          data={chartData}
          width={Dimensions.get("window").width - 40}
          height={220}
          yAxisSuffix=""
          chartConfig={{
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 16 },
          }}
          bezier
          style={{ marginVertical: 8, borderRadius: 16 }}
        />
      )}

      {/* Display Current EC Level */}
      <View style={styles.currentValueContainer}>
        <Text style={styles.currentValueLabel}>Current EC Level:</Text>
        <Text style={styles.currentValueText}>{currentEcLevel}</Text>
      </View>

      {/* Adjusting Value */}
      <View style={styles.adjustingValueContainer}>
        <Text style={styles.currentValue}>Adjusting Value: {ecLevel}</Text>
      </View>

      {/* Adjustment Controls */}
      <View style={styles.controlContainer}>
        <Text>Adjust EC Level:</Text>

        {/* Slider Controls */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={() => adjustEc(-0.1)} style={styles.iconButton}>
            <Ionicons name="remove-circle-outline" size={30} color="black" />
          </TouchableOpacity>

          <Slider
            style={{ width: 200, height: 40 }}
            minimumValue={0}
            maximumValue={10}
            step={0.1}
            value={ecLevel}
            onValueChange={setEcLevel}
            minimumTrackTintColor={COLORS.green || "#00C853"} 
            maximumTrackTintColor="#ccc"
            thumbTintColor="#000"
          />

          <TouchableOpacity onPress={() => adjustEc(0.1)} style={styles.iconButton}>
            <Ionicons name="add-circle-outline" size={30} color="black" />
          </TouchableOpacity>
        </View>

        {/* Set Value Button */}
        <Button mode="contained" onPress={handleSetValue} disabled={isSetting}>
          {isSetting ? "Setting..." : `Set to ${ecLevel}`}
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
