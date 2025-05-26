import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Button } from 'react-native-paper';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig"; // Firestore reference
import COLORS from '../config/colors';

export default function EcLevelScreen({ navigation, route }) {
  const { userId,groupId } = route.params;
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ecLevel, setEcLevel] = useState("2.5"); // Manual input as string
  const [currentEcLevel, setCurrentEcLevel] = useState("2.5"); // Display value
  const [isSetting, setIsSetting] = useState(false);

  // ✅ Fetch EC level from Firestore
  useEffect(() => {
    if (!userId) {
      console.error("❌ No User ID provided!");
      return;
    }

    const fetchEcLevel = async () => {
      try {
        const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/control_settings`, "1");
        const docSnap = await getDoc(docRef);


        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("📡 Fetched User-Specific EC Target:", data.ecTarget);
          const ecValue = data.ecTarget?.toString() || "2.5";
          setEcLevel(ecValue);
          setCurrentEcLevel(ecValue);
        } else {
          console.log("⚠️ No EC target found. Using default and setting in Firestore...");
          await setDoc(docRef, { ecTarget: 2.5 }, { merge: true });
          setEcLevel("2.5");
          setCurrentEcLevel("2.5");
        }
      } catch (error) {
        console.error("🔥 Firestore Error fetching EC Target:", error);
      }
    };

    fetchEcLevel();
  }, [userId]);

  // ✅ Simulated chart data (replace with actual later)
  useEffect(() => {
    setTimeout(() => {
      setChartData({
        labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        datasets: [
          {
            data: [2.5, 2.6, 2.5, 2.7, 2.6, 2.5, 2.7],
            label: "Water Level",
            color: (opacity = 1) => `rgba(255, 206, 86, ${opacity * 0.6})`
          }
        ],
      });
      setLoading(false);
    }, 1000);
  }, []);

  // ✅ Save EC target to Firestore
  const handleSetValue = async () => {
    if (!userId) {
      console.error("❌ No User ID provided!");
      return;
    }

    const numericValue = parseFloat(ecLevel);
    if (isNaN(numericValue) || numericValue < 0 || numericValue > 10) {
      alert("Please enter a valid EC level between 0 and 10");
      return;
    }

    setIsSetting(true);

    try {
      const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/control_settings`, "1");
      await setDoc(docRef, { ecTarget: numericValue }, { merge: true });
      console.log("✅ EC Target updated:", numericValue);
      setCurrentEcLevel(ecLevel);
    } catch (error) {
      console.error("❌ Error updating EC Target:", error);
    }

    setIsSetting(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Water Level Adjustment</Text>

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

      {/* Current EC Level Display */}
      <View style={styles.currentValueContainer}>
        <Text style={styles.currentValueLabel}>Current Water Level:</Text>
        <Text style={styles.currentValueText}>{currentEcLevel}</Text>
      </View>

      {/* Manual Input for EC Level */}
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={ecLevel}
        onChangeText={setEcLevel}
        placeholder="Enter new Water level (0 - 10)"
      />

      {/* Set Value Button */}
      <Button mode="contained" onPress={handleSetValue} disabled={isSetting}>
        {isSetting ? "Setting..." : `Set to ${ecLevel}`}
      </Button>
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
  input: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 18,
    marginBottom: 15,
    backgroundColor: "#fff",
  }
});
