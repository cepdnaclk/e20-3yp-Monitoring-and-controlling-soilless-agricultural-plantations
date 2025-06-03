import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Button } from 'react-native-paper';
import { doc, getDoc, setDoc, collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";
import COLORS from '../config/colors';

const screenWidth = Dimensions.get("window").width;

export default function PhLevelScreen({ navigation, route }) {
  const { userId, groupId } = route.params;

  const [chartData, setChartData] = useState(null);
  const [currentPhLevel, setCurrentPhLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phLevel, setPhLevel] = useState(""); // Input field
  const [isSetting, setIsSetting] = useState(false);

  // 🔄 Real-time pH history listener
  useEffect(() => {
    if (!userId || !groupId) return;

    const q = query(
      collection(db, `users/${userId}/deviceGroups/${groupId}/sensor_history`),
      orderBy("timestamp", "desc"),
      limit(24)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .filter(doc => doc.data().timestamp)
        .map(doc => {
          const d = doc.data();
          return {
            ph: d.ph || 0,
            timestamp: d.timestamp.toDate()
          };
        })
        .reverse(); // Oldest first

     

      setChartData({
        labels: data.map((d, index) =>
          index % 6 === 0
            ? d.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : ""
        ),
  datasets: [
    {
      data: data.map(d => d.ph),
      color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
      strokeWidth: 2
    }
  ],
  legend: ["pH Level"]
});


      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, groupId]);

useEffect(() => {
  if (!userId || !groupId) return;

  const fetchCurrentPh = async () => {
    try {
      const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/sensor_data`, "1");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.ph !== undefined) {
          setCurrentPhLevel(parseFloat(data.ph));
        }
      }
    } catch (error) {
      console.error("❌ Error fetching current pH:", error);
    }
  };

  fetchCurrentPh();
}, [userId, groupId]);



  // 🔄 Get current pH target for manual override field
  useEffect(() => {
    if (!userId || !groupId) return;

    const fetchPhTarget = async () => {
      try {
        const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/control_settings`, "1");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setPhLevel(data.pHTarget.toString());
        } else {
          setPhLevel("6.8"); // Default if missing
        }
      } catch (error) {
        console.error("❌ Firestore error loading pH target:", error);
      }
    };

    fetchPhTarget();
  }, [userId, groupId]);

  // 🔘 Manually set target pH level in control_settings
  const handleSetValue = async () => {
    if (!userId || !phLevel) return;

    setIsSetting(true);

    try {
      const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/control_settings`, "1");
      await setDoc(docRef, { pHTarget: parseFloat(phLevel) }, { merge: true });
      console.log("✅ Updated pH Target:", phLevel);
    } catch (error) {
      console.error("❌ Error updating pH target:", error);
    }

    setIsSetting(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>pH Level Monitoring</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#3498db" />
      ) : chartData ? (
        <LineChart
          data={chartData}
          width={screenWidth - 40}
          height={220}
          yAxisSuffix=""
          yAxisInterval={1}
          chartConfig={{
            backgroundColor: "#f5f5f5",
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 10 },
            propsForDots: { r: "5", strokeWidth: "2", stroke: "#4CAF50" },
          }}
          bezier
          style={{ marginVertical: 10, borderRadius: 10 }}
        />
      ) : null}

      {/* 📊 Display current pH from sensor */}
      <View style={styles.currentValueContainer}>
        <Text style={styles.currentValueLabel}>Current pH:</Text>
        <Text style={styles.currentValueText}>
          {currentPhLevel !== null ? currentPhLevel.toFixed(2) : "N/A"}
        </Text>
      </View>

      {/* 🎯 Target pH input */}
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={phLevel}
        onChangeText={setPhLevel}
        placeholder="Enter target pH level"
      />

      <Button mode="contained" onPress={handleSetValue} disabled={isSetting}>
        {isSetting ? "Setting..." : `Set Target to ${phLevel}`}
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
    marginVertical: 20
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
