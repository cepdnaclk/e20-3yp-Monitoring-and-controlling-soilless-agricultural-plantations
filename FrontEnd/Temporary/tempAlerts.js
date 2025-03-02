import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";
import COLORS from "../config/colors";
import { sendControlCommand, sendStopCommand } from "../utils/controlCommands"; 

export default function AlertsScreen({ route }) {
  const { userId } = route.params;
  const [alerts, setAlerts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const alertsMap = new Map(); // ✅ Track active commands per parameter

  useEffect(() => {
    fetchAlerts();
  }, [userId]);

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
    const unsubscribe = onSnapshot(sensorDataQuery, async (snapshot) => {
      if (!snapshot.empty) {
        const latestSensorData = snapshot.docs[0].data();
        console.log("📡 Latest Sensor Data:", latestSensorData);

        const controlSettings = await fetchControlSettings();
        if (!controlSettings) return;

        const newAlerts = [];

        const checkAndSendCommand = (param, current, target, actionIncrease, actionDecrease, threshold) => {
  const difference = current - target;
  const alertKey = `${param}-alert`;

  if (Math.abs(difference) >= threshold) {
    // ✅ Determine which command needs to be sent
    const action = difference > 0 ? actionDecrease : actionIncrease;
    const value = Math.abs(difference);

    if (!alertsMap.has(alertKey) || alertsMap.get(alertKey).action !== action) {
      // ✅ Store alert and track the exact action
      alertsMap.set(alertKey, {
        id: alertKey,
        param, // ✅ Track the specific parameter
        action, // ✅ Store the actual command sent
        message: `⚠️ ${param} is off! (Current: ${current.toFixed(2)}, Target: ${target.toFixed(2)})`,
        timestamp: new Date().toLocaleString(),
      });

      sendControlCommand(userId, action, value);
    }

    newAlerts.push(alertsMap.get(alertKey));
  } else {
    // ✅ Remove alert + send stop command ONLY for the correct action
    if (alertsMap.has(alertKey)) {
      const previousAction = alertsMap.get(alertKey).action; // ✅ Get the last action that was sent
      alertsMap.delete(alertKey);

      if (previousAction) {
        sendStopCommand(userId, previousAction); // ✅ Stop ONLY the specific action
      }
    }
  }
};

        

        // ✅ Apply the fix to all parameters (pH, EC, Soil Moisture)
        checkAndSendCommand("pH Level", latestSensorData.ph, controlSettings.pHTarget, "increase_pH", "decrease_pH", 1);
        checkAndSendCommand("EC Level", latestSensorData.ec, controlSettings.ecTarget, "increase_EC", "decrease_EC", 1);
        checkAndSendCommand("Soil Moisture", latestSensorData.soil_moisture, controlSettings.soilMoistureTarget, "increase_soil_moisture", "decrease_soil_moisture", 10);
        checkAndSendCommand("Temperature", latestSensorData.temperature, controlSettings.tempTarget, "increase_temp", "decrease_temp", 2);
        checkAndSendCommand("Humidity", latestSensorData.humidity, controlSettings.humidityTarget, "increase_humidity", "decrease_humidity", 5);

        setAlerts([...newAlerts]); 
        saveAlerts(newAlerts);
      }
      setRefreshing(false);
    });

    return () => unsubscribe();
  };

  const onRefresh = useCallback(() => {
    fetchAlerts();
  }, []);

  const saveAlerts = async (alerts) => {
    await AsyncStorage.setItem("alerts", JSON.stringify(alerts));
  };

  const dismissAlert = async (id) => {
    alertsMap.delete(id);
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
  title: { fontSize: 30, fontWeight: "bold", color: COLORS.green },
  alertItem: { backgroundColor: "#C8E6C9", padding: 15, borderRadius: 10, marginBottom: 10 },
  alertText: { color: "#333", fontSize: 16 },
  timestamp: { color: "#555", fontSize: 12, marginTop: 5 },
  dismissText: { color: "#EF4444", fontSize: 14, marginTop: 5, fontWeight: "bold" },
});
