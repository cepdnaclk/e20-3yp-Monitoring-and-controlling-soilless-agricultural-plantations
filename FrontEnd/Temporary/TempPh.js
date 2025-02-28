import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import Slider from '@react-native-community/slider';
import { LineChart } from 'react-native-chart-kit';
import { Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig"; // Firestore reference
import COLORS from '../config/colors';

export default function PhLevelScreen({ navigation }) {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phLevel, setPhLevel] = useState(6.8); // Temporary adjusting value
  const [currentPhLevel, setCurrentPhLevel] = useState(6.8); // Actual set value
  const [isSetting, setIsSetting] = useState(false);

  // 📌 Fetch the current pH level from Firestore when component loads
  useEffect(() => {
    const fetchPhLevel = async () => {
      try {
        const docRef = doc(db, "control_settings", "y4oEy6hH89sgZA7qrX90");  
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("📡 Fetched pH Target from Firestore:", data.pHTarget);
          setPhLevel(data.pHTarget);
          setCurrentPhLevel(data.pHTarget);
        } else {
          console.log("❌ No pH target found in Firestore. Using default value.");
        }
      } catch (error) {
        console.error("🔥 Firestore Error fetching pH Target:", error);
      }
    };

    fetchPhLevel();
  }, []);

  // 📌 Simulated historical pH level data (Replace with Firestore query later)
  useEffect(() => {
    setTimeout(() => {
      setChartData({
        labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        datasets: [
          { 
            data: [6.8, 6.9, 6.8, 6.7, 6.8, 6.9, 6.8], 
            label: "pH Level",
            color: (opacity = 1) => `rgba(75, 192, 192, ${opacity * 0.6})`
          }
        ],
      });
      setLoading(false);
    }, 1000);
  }, []);


  // 📌 Adjust the pH level within 0-14
  const adjustPh = (change) => {
    setPhLevel(prev => Math.min(14, Math.max(0, prev + change)));
  };

  // 📌 Update Firestore with new pH level
  const handleSetValue = async () => {
    setIsSetting(true);

    try {
      const docRef = doc(db, "control_settings", "y4oEy6hH89sgZA7qrX90");  
      await setDoc(docRef, { pHTarget: phLevel }, { merge: true });

      console.log("✅ pH Target updated in Firestore:", phLevel);
      setCurrentPhLevel(phLevel);
    } catch (error) {
      console.error("❌ Firestore Error updating pH Target:", error);
    }

    setIsSetting(false);


  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>pH Level Adjustment</Text>

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

      {/* Display Current pH Level */}
      <View style={styles.currentValueContainer}>
        <Text style={styles.currentValueLabel}>Current pH Level:</Text>
        <Text style={styles.currentValueText}>{currentPhLevel}</Text>
      </View>

      {/* Adjusting Value */}
      <View style={styles.adjustingValueContainer}>
        <Text style={styles.currentValue}>Adjusting Value: {phLevel}</Text>
      </View>

      {/* Adjustment Controls */}
      <View style={styles.controlContainer}>
        <Text>Adjust pH Level:</Text>

        {/* Slider Controls */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={() => adjustPh(-0.1)} style={styles.iconButton}>
            <Ionicons name="remove-circle-outline" size={30} color="black" />
          </TouchableOpacity>


          <Slider
            style={{ width: 200, height: 40 }}
            minimumValue={0}
            maximumValue={14}
            step={0.1}
            value={phLevel}
            onValueChange={setPhLevel}
            minimumTrackTintColor={COLORS.green || "#00C853"} 
            maximumTrackTintColor="#ccc"
            thumbTintColor="#000"
          />

          <TouchableOpacity onPress={() => adjustPh(0.1)} style={styles.iconButton}>
            <Ionicons name="add-circle-outline" size={30} color="black" />
          </TouchableOpacity>
        </View>

        {/* Set Value Button */}
        <Button mode="contained" onPress={handleSetValue} disabled={isSetting}>
          {isSetting ? "Setting..." : `Set to ${phLevel}`}
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
