import React, { useState, useEffect, useCallback } from "react";
import { 
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl 
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, doc, getDoc, getDocs, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";
import COLORS from "../config/colors";
import { sendControlCommand } from "../utils/controlCommands"; 

export default function AlertsScreen({ route }) {
  const { userId } = route.params;
  const [alerts, setAlerts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [userId]);

  // ✅ Fetch existing alerts from Firestore (only return messages)
  const getExistingAlerts = async () => {
    try {
      const alertsRef = collection(db, `users/${userId}/alerts`);
      const snapshot = await getDocs(alertsRef);
      return new Set(snapshot.docs.map(doc => doc.data().message)); // ✅ Use a Set for fast duplicate checking
    } catch (error) {
      console.error("🔥 Firestore Error fetching existing alerts:", error);
      return new Set();
    }
  };

  // ✅ Fetch alerts & prevent duplicates
  const fetchAlerts = async () => {
    if (!userId) {
      console.error("❌ No User ID provided!");
      return;
    }

    setRefreshing(true);

    const fetchControlSettings = async () => {
      try {
        const docRef = doc(db, `users/${userId}/control_settings`, "1");
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
      } catch (error) {
        console.error("🔥 Firestore Error fetching control settings:", error);
        return null;
      }
    };

    const sensorDataQuery = collection(db, `users/${userId}/sensor_data`);
    const existingAlerts = await getExistingAlerts(); // ✅ Fetch existing alerts first

    const unsubscribe = onSnapshot(sensorDataQuery, async (snapshot) => {
      if (snapshot.empty) return;

      const latestSensorData = snapshot.docs[0].data();
      console.log("📡 Latest Sensor Data:", latestSensorData);

      const controlSettings = await fetchControlSettings();
      if (!controlSettings) return;

      let newAlerts = [];

      // ✅ Compare values & check if alert exists before adding
      const checkAndSendCommand = (param, current, target, actionIncrease, actionDecrease, threshold) => {
        const difference = current - target;
        if (Math.abs(difference) >= threshold) {
          const action = difference > 0 ? actionDecrease : actionIncrease;
          const value = Math.abs(difference);
          const message = `⚠️ ${param} is off! (Current: ${current}, Target: ${target})`;

          if (!existingAlerts.has(message)) { // ✅ Check against Set
            newAlerts.push({
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              message,
              timestamp: new Date().toLocaleString(),
            });

            sendControlCommand(userId, action, value); // ✅ Send control command
          }
        }
      };

      // ✅ Check & send alerts for each parameter
      checkAndSendCommand("pH Level", latestSensorData.ph, controlSettings.pHTarget, "increase_pH", "decrease_pH", 1);
      checkAndSendCommand("EC Level", latestSensorData.ec, controlSettings.ecTarget, "increase_EC", "decrease_EC", 1);
      checkAndSendCommand("Soil Moisture", latestSensorData.soil_moisture, controlSettings.soilMoistureTarget, "increase_soil_moisture", "decrease_soil_moisture", 10);
      checkAndSendCommand("Temperature", latestSensorData.temperature, controlSettings.tempTarget, "increase_temp", "decrease_temp", 2);
      checkAndSendCommand("Humidity", latestSensorData.humidity, controlSettings.humidityTarget, "increase_humidity", "decrease_humidity", 5);

      if (newAlerts.length > 0) {
        await saveAlerts(newAlerts); // ✅ Save only new alerts
        setAlerts((prevAlerts) => [...prevAlerts, ...newAlerts]); // ✅ Update UI
      }

      setRefreshing(false);
    });

    return () => unsubscribe();
  };

  // ✅ Save new alerts (avoiding duplicates)
  const saveAlerts = async (alerts) => {
    const alertsRef = collection(db, `users/${userId}/alerts`);
    for (const alert of alerts) {
      try {
        const alertDoc = doc(alertsRef, alert.id);
        await setDoc(alertDoc, alert); // ✅ Save each alert uniquely
      } catch (error) {
        console.error("🔥 Firestore Error saving alerts:", error);
      }
    }
  };

  const onRefresh = useCallback(() => {
    fetchAlerts();
  }, []);

  const dismissAlert = async (id) => {
    const updatedAlerts = alerts.filter((alert) => alert.id !== id);
    setAlerts(updatedAlerts);
    await AsyncStorage.setItem("alerts", JSON.stringify(updatedAlerts));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚨 Alerts</Text>
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.alertItem}>
            <Text style={styles.alertText}>{item.message}</Text>
            <Text style={styles.timestamp}>{item.timestamp}</Text>
            <TouchableOpacity onPress={() => dismissAlert(item.id)}>
              <Text style={styles.dismissText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00C853"]} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#E8F5E9" },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: COLORS.green,
  },
  alertItem: {
    backgroundColor: "#C8E6C9",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  alertText: { color: "#333", fontSize: 16 },
  timestamp: { color: "#555", fontSize: 12, marginTop: 5 },
  dismissText: { color: "#EF4444", fontSize: 14, marginTop: 5, fontWeight: "bold" },
});
