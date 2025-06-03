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
  const unsubscribeFunctions = useRef([]);
  const latestSensorDataRef = useRef(null);
  const latestControlSettingsRef = useRef(null);

  useEffect(() => {
    if (!userId || !groupId) {
      console.error("❌ Missing userId or groupId in AlertsScreen");
      return;
    }

    setAlerts([]);
    alertsMap.current.clear();

    unsubscribeFunctions.current.forEach(unsub => unsub());
    unsubscribeFunctions.current = [];

    fetchAlerts();

    return () => {
      unsubscribeFunctions.current.forEach(unsub => unsub());
      unsubscribeFunctions.current = [];
    };
  }, [userId, groupId]);

  const tryTriggerAlerts = () => {
    const sensor = latestSensorDataRef.current;
    const settings = latestControlSettingsRef.current;
    if (!sensor || !settings) return;

    const newAlerts = [];

    const check = (param, current, target, inc, dec, threshold) => {
      const diff = current - target;
      const action = diff > 0 ? dec : inc;
      const value = Math.abs(diff);
      const key = `${groupId}-${param}-alert`;

      if (Math.abs(diff) >= threshold) {
        if (!alertsMap.current.has(key) || alertsMap.current.get(key).action !== action) {
          alertsMap.current.set(key, {
            id: key,
            param,
            action,
            message: `⚠️ ${param} is off! (Current: ${current}, Target: ${target})`,
            timestamp: new Date().toLocaleString(),
          });
          sendControlCommand(userId, groupId, action, value);
        }
        newAlerts.push(alertsMap.current.get(key));
      } else if (alertsMap.current.has(key)) {
        const prev = alertsMap.current.get(key);
        alertsMap.current.delete(key);
        sendStopCommand(userId, groupId, prev.action);
      }
    };

    check("pH Level", sensor.ph, settings.pHTarget, "increase_pH", "decrease_pH", 1);
    check("EC Level", sensor.ec, settings.ecTarget, "increase_EC", "decrease_EC", 1);
    check("Soil Moisture", sensor.soil_moisture, settings.soilMoistureTarget, "increase_soil_moisture", "decrease_soil_moisture", 10);
    check("Temperature", sensor.temperature, settings.tempTarget, "increase_temp", "decrease_temp", 2);
    check("Humidity", sensor.humidity, settings.humidityTarget, "increase_humidity", "decrease_humidity", 5);

    setAlerts((prev) => [...prev.filter(a => !a.id.endsWith("-alert")), ...newAlerts]);
  };

  const fetchAlerts = async () => {
    if (!userId || !groupId) return;
    setRefreshing(true);

    const controlSettingsRef = doc(db, `users/${userId}/deviceGroups/${groupId}/control_settings`, "1");
    const unsubscribeControlSettings = onSnapshot(controlSettingsRef, (docSnap) => {
      if (docSnap.exists()) {
        latestControlSettingsRef.current = docSnap.data();
        tryTriggerAlerts();
      }
    });

    const unsubscribeSensorData = onSnapshot(
      collection(db, `users/${userId}/deviceGroups/${groupId}/sensor_data`),
      (snapshot) => {
        if (!snapshot.empty) {
          latestSensorDataRef.current = snapshot.docs[0].data();
          tryTriggerAlerts();
        }
      }
    );

    const unsubscribeActiveCommands = onSnapshot(
      collection(db, `users/${userId}/deviceGroups/${groupId}/active_commands`),
      (snapshot) => {
        const activeCommands = snapshot.docs.filter(doc => doc.id !== 'init').map((doc) => ({
          id: `active-${doc.id}`,
          param: doc.data().action,
          message: `🚀 Active Command: ${doc.data().action} (Value: ${doc.data().value})`,
          timestamp: doc.data().timestamp?.seconds
            ? new Date(doc.data().timestamp.seconds * 1000).toLocaleString()
            : "No Timestamp",
        }));

        setAlerts((prev) => [...prev.filter(a => !a.id.startsWith("active-")), ...activeCommands]);
      }
    );

    const unsubscribeStopCommands = onSnapshot(
      collection(db, `users/${userId}/deviceGroups/${groupId}/stop_commands`),
      (snapshot) => {
        const stopCommands = snapshot.docs.filter(doc => doc.id !== 'init').map((doc) => ({
          id: `stop-${doc.id}`,
          param: doc.data().action,
          message: `🛑 Stop Command Sent: ${doc.data().action}`,
          timestamp: doc.data().timestamp?.seconds
            ? new Date(doc.data().timestamp.seconds * 1000).toLocaleString()
            : "No Timestamp",
        }));

        setAlerts((prev) => [...prev.filter(a => !a.id.startsWith("stop-")), ...stopCommands]);
      }
    );

    unsubscribeFunctions.current = [
      unsubscribeControlSettings,
      unsubscribeSensorData,
      unsubscribeActiveCommands,
      unsubscribeStopCommands
    ];

    setRefreshing(false);
  };

  const dismissAlert = async (id) => {
    alertsMap.current.delete(id);
    const updatedAlerts = alerts.filter((alert) => alert.id !== id);
    setAlerts(updatedAlerts);
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
            onRefresh={fetchAlerts}
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
  alertItem: {
    backgroundColor: "#C8E6C9",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  alertText: { color: "#333", fontSize: 16 },
  timestamp: { color: "#555", fontSize: 12, marginTop: 5 },
  dismissText: {
    color: "#EF4444",
    fontSize: 14,
    marginTop: 5,
    fontWeight: "bold",
  },
});
