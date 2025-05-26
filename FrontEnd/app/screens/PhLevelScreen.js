import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Button } from 'react-native-paper';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig"; // Firestore reference
import COLORS from '../config/colors';

export default function PhLevelScreen({ navigation, route }) {
  const { userId, groupId } = route.params;
  // ✅ Get userId from navigation params
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phLevel, setPhLevel] = useState("6.8"); // Temporary adjusting value
  const [currentPhLevel, setCurrentPhLevel] = useState("6.8"); // Actual set value
  const [isSetting, setIsSetting] = useState(false);

  // ✅ Fetch user-specific pH control settings from Firestore
  useEffect(() => {
    if (!userId) {
      console.error("❌ No User ID provided!");
      return;
    }

    const fetchPhLevel = async () => {
      try {
        const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/control_settings`, "1");
        const docSnap = await getDoc(docRef);


        

        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("📡 Fetched User-Specific pH Target:", data.pHTarget);
          setPhLevel(data.pHTarget.toString());
          setCurrentPhLevel(data.pHTarget.toString());
        } else {
          console.log("❌ No pH target found in Firestore. Using default values");
        }
      } catch (error) {
        console.error("🔥 Firestore Error fetching pH Target:", error);
      }
    };

    fetchPhLevel();
  }, [userId]);

  // ✅ Simulated historical pH level data (Replace with Firestore query later)
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

  // ✅ Update Firestore with new pH level for the user
  const handleSetValue = async () => {
    if (!userId) {
      console.error("❌ No User ID provided!");
      return;
    }

    setIsSetting(true);

    try {
      const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/control_settings`, "1");
      await setDoc(docRef, { pHTarget: parseFloat(phLevel) }, { merge: true });


      console.log("✅ User-Specific pH Target updated in Firestore:", phLevel);
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

      {/* Manual Input for pH Level */}
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={phLevel}
        onChangeText={setPhLevel}
        placeholder="Enter new pH level"
      />

      {/* Set Value Button */}
      <Button mode="contained" onPress={handleSetValue} disabled={isSetting}>
        {isSetting ? "Setting..." : `Set to ${phLevel}`}
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
