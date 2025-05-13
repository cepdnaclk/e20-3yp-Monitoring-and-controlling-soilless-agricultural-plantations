import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Button } from 'react-native-paper';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import COLORS from '../config/colors';

export default function LightIntensityScreen({ navigation, route }) {
  const { userId } = route.params;
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightLevel, setLightLevel] = useState("700"); // Temporary adjusting value
  const [currentLightLevel, setCurrentLightLevel] = useState("700"); // Actual set value
  const [isSetting, setIsSetting] = useState(false);

  useEffect(() => {
    if (!userId) {
      console.error("❌ No User ID provided!");
      return;
    }

    const fetchLightLevel = async () => {
      try {
        const docRef = doc(db, `users/${userId}/control_settings`, "1");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("📡 Fetched User-Specific Light Target:", data.lightTarget);
          setLightLevel(data.lightTarget.toString());
          setCurrentLightLevel(data.lightTarget.toString());
        } else {
          console.log("❌ No light target found. Using default values.");
        }
      } catch (error) {
        console.error("🔥 Firestore Error fetching light target:", error);
      }
    };

    fetchLightLevel();
  }, [userId]);

  useEffect(() => {
    setTimeout(() => {
      setChartData({
        labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        datasets: [
          {
            data: [700, 750, 720, 710, 730, 740, 725],
            color: (opacity = 1) => `rgba(255, 206, 86, ${opacity * 0.6})`, // yellow tone
          }
        ],
      });
      setLoading(false);
    }, 1000);
  }, []);

  const handleSetValue = async () => {
    if (!userId) {
      console.error("❌ No User ID provided!");
      return;
    }

    setIsSetting(true);
    try {
      const docRef = doc(db, `users/${userId}/control_settings`, "1");
      await setDoc(docRef, { lightTarget: parseFloat(lightLevel) }, { merge: true });

      console.log("✅ Light intensity target updated in Firestore:", lightLevel);
      setCurrentLightLevel(lightLevel);
    } catch (error) {
      console.error("❌ Firestore Error updating light target:", error);
    }
    setIsSetting(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Light Intensity Control</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#f1c40f" />
      ) : (
        <LineChart
          data={chartData}
          width={Dimensions.get("window").width - 40}
          height={220}
          yAxisSuffix=" Lux"
          chartConfig={{
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 206, 86, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 16 },
          }}
          bezier
          style={{ marginVertical: 8, borderRadius: 16 }}
        />
      )}

      <View style={styles.currentValueContainer}>
        <Text style={styles.currentValueLabel}>Current Light Target:</Text>
        <Text style={styles.currentValueText}>{currentLightLevel} Lux</Text>
      </View>

      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={lightLevel}
        onChangeText={setLightLevel}
        placeholder="Enter prefered light level Lux)"
      />

      <Button mode="contained" onPress={handleSetValue} disabled={isSetting}>
        {isSetting ? "Setting..." : `Set to ${lightLevel} Lux`}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: COLORS.lightYellow || "#FFFDE7" },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  currentValueContainer: {
    backgroundColor: "#fcf8e3",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10
  },
  currentValueLabel: { fontSize: 16, fontWeight: "bold", color: "#8a6d3b" },
  currentValueText: { fontSize: 24, fontWeight: "bold", color: "#8a6d3b" },
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
