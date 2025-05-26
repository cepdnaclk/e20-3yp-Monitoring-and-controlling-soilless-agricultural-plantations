import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";
import COLORS from "../config/colors";
import { sendControlCommand, sendStopCommand } from "../utils/controlCommands";

export default function AlertsScreen({ userId, groupId }) {
  const [alerts, setAlerts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const alertsMap = useRef(new Map());
  const unsubscribeFunctions = useRef([]); // Store cleanup functions

  useEffect(() => {
    if (!userId || !groupId) {
      console.error("❌ Missing userId or groupId in AlertsScreen");
      return;
    }

    // Clear previous state when groupId changes
    setAlerts([]);
    alertsMap.current.clear();
    
    // Clean up previous listeners
    unsubscribeFunctions.current.forEach(unsubscribe => unsubscribe());
    unsubscribeFunctions.current = [];

    fetchAlerts();

    // Cleanup function for useEffect
    return () => {
      unsubscribeFunctions.current.forEach(unsubscribe => unsubscribe());
      unsubscribeFunctions.current = [];
    };
  }, [userId, groupId]);

  const fetchAlerts = async () => {
    if (!userId || !groupId) {
      console.error("❌ Missing userId or groupId in AlertsScreen");
      return;
    }

    setRefreshing(true);

    const fetchControlSettings = async () => {
      try {
        const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/control_settings`, "1");
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
      } catch (error) {
        console.error("🔥 Firestore Error fetching control settings:", error);
        return null;
      }
    };

    // Active Commands Listener
    const activeCommandsQuery = collection(db, `users/${userId}/deviceGroups/${groupId}/active_commands`);
    const unsubscribeActiveCommands = onSnapshot(activeCommandsQuery, (snapshot) => {
      const activeCommands = snapshot.docs.filter(doc => doc.id !== 'init').map((doc) => ({
        id: `active-${doc.id}`,
        param: doc.data().action,
        message: `🚀 Active Command: ${doc.data().action} (Value: ${doc.data().value})`,
        timestamp: new Date(doc.data().timestamp.seconds * 1000).toLocaleString(),
      }));

      setAlerts((prevAlerts) => [
        ...prevAlerts.filter(a => !a.id.startsWith("active-")),
        ...activeCommands
      ]);
    });

    // Stop Commands Listener
    const stopCommandsQuery = collection(db, `users/${userId}/deviceGroups/${groupId}/stop_commands`);
    const unsubscribeStopCommands = onSnapshot(stopCommandsQuery, (snapshot) => {
      const stopCommands = snapshot.docs.filter(doc => doc.id !== 'init').map((doc) => ({
        id: `stop-${doc.id}`,
        param: doc.data().action,
        message: `🛑 Stop Command Sent: ${doc.data().action}`,
        timestamp: new Date(doc.data().timestamp.seconds * 1000).toLocaleString(),
      }));

      setAlerts((prevAlerts) => [
        ...prevAlerts.filter(a => !a.id.startsWith("stop-")),
        ...stopCommands
      ]);
    });

    // Sensor Data Listener
    const sensorDataQuery = collection(db, `users/${userId}/deviceGroups/${groupId}/sensor_data`);
    const unsubscribeSensorData = onSnapshot(sensorDataQuery, async (snapshot) => {
      if (!snapshot.empty) {
        const latestSensorData = snapshot.docs[0].data();
        console.log("📱 Latest Sensor Data:", latestSensorData);

        const controlSettings = await fetchControlSettings();
        if (!controlSettings) return;

        const newAlerts = [];

        const checkAndSendCommand = (param, current, target, actionIncrease, actionDecrease, threshold) => {
          const difference = current - target;
          const alertKey = `${groupId}-${param}-alert`; // This key is already group-specific

          if (Math.abs(difference) >= threshold) {
            const action = difference > 0 ? actionDecrease : actionIncrease;
            const value = Math.abs(difference);

            if (!alertsMap.current.has(alertKey) || alertsMap.current.get(alertKey).action !== action) {
              alertsMap.current.set(alertKey, {
                id: alertKey,
                param,
                action,
                message: `⚠️ ${param} is off! (Current: ${current.toFixed(2)}, Target: ${target.toFixed(2)})`,
                timestamp: new Date().toLocaleString(),
              });

              sendControlCommand(userId, groupId, action, value);
            }

            newAlerts.push(alertsMap.current.get(alertKey));
          } else {
            if (alertsMap.current.has(alertKey)) {
              const previousAction = alertsMap.current.get(alertKey).action;
              alertsMap.current.delete(alertKey);
              if (previousAction) {
                sendStopCommand(userId, groupId, previousAction);
              }
            }
          }
        };

        checkAndSendCommand("pH Level", latestSensorData.ph, controlSettings.pHTarget, "increase_pH", "decrease_pH", 1);
        checkAndSendCommand("EC Level", latestSensorData.ec, controlSettings.ecTarget, "increase_EC", "decrease_EC", 1);
        checkAndSendCommand("Soil Moisture", latestSensorData.soil_moisture, controlSettings.soilMoistureTarget, "increase_soil_moisture", "decrease_soil_moisture", 10);
        checkAndSendCommand("Temperature", latestSensorData.temperature, controlSettings.tempTarget, "increase_temp", "decrease_temp", 2);
        checkAndSendCommand("Humidity", latestSensorData.humidity, controlSettings.humidityTarget, "increase_humidity", "decrease_humidity", 5);

        setAlerts((prevAlerts) => [
          ...prevAlerts.filter(a => !a.id.endsWith("-alert")),
          ...newAlerts
        ]);
      }
    });

    // Store all unsubscribe functions for cleanup
    unsubscribeFunctions.current = [
      unsubscribeActiveCommands,
      unsubscribeStopCommands,
      unsubscribeSensorData
    ];

    setRefreshing(false);
  };

  const onRefresh = useCallback(() => {
    fetchAlerts();
  }, [userId, groupId]);

  const dismissAlert = async (id) => {
    alertsMap.current.delete(id);
    const updatedAlerts = alerts.filter((alert) => alert.id !== id);
    setAlerts(updatedAlerts);
    // Note: Consider if you really need AsyncStorage here, as it might persist across groups
    await AsyncStorage.setItem(`alerts-${groupId}`, JSON.stringify(updatedAlerts));
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#00C853"]}
          />
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