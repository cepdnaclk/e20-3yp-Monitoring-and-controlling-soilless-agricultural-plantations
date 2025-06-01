import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, doc, getDoc, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";
import COLORS from "../config/colors";
import {
  sendControlCommand,
  sendStopCommand,
  fetchDeviceIdMap,
} from "../utils/controlCommands";

const ACTION_DEVICE_TYPE_MAP = {
  increase_pH: "nutrient_pump",
  decrease_pH: "water_pump",
  increase_EC: "nutrient_pump",
  decrease_EC: "water_pump",
  increase_water_level: "water_pump",
  decrease_water_level: "disposal_pump",
  water_circulation: "circulation_pump",
};

export default function AlertsScreen({ userId, groupId }) {
  const [alerts, setAlerts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const alertsMap = useRef(new Map());
  const unsubscribeFunctions = useRef([]);
  const latestSensorDataRef = useRef(null);
  const latestControlSettingsRef = useRef(null);
  const deviceIdMapRef = useRef(null); // Holds the map of { nutrient_pump: "1001", ... }

  useEffect(() => {
    if (!userId || !groupId) {
      console.error("❌ Missing userId or groupId in AlertsScreen");
      return;
    }

    const initialize = async () => {
      setAlerts([]);
      alertsMap.current.clear();
      unsubscribeFunctions.current.forEach((unsub) => unsub());
      unsubscribeFunctions.current = [];

      // Fetch device ID map
      const map = await fetchDeviceIdMap(userId, groupId);
      deviceIdMapRef.current = map;

      fetchAlerts();
    };

    initialize();

    return () => {
      unsubscribeFunctions.current.forEach((unsub) => unsub());
      unsubscribeFunctions.current = [];
    };
  }, [userId, groupId]);

  const tryTriggerAlerts = () => {
    const sensor = latestSensorDataRef.current;
    const settings = latestControlSettingsRef.current;
    const deviceIdMap = deviceIdMapRef.current;
    if (!sensor || !settings || !deviceIdMap) return;

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
          sendControlCommand(userId, groupId, action, value, deviceIdMap);
        }
        newAlerts.push(alertsMap.current.get(key));
      } else if (alertsMap.current.has(key)) {
        const prev = alertsMap.current.get(key);
        alertsMap.current.delete(key);
        sendStopCommand(userId, groupId, prev.action, deviceIdMap);
      }
    };

    check("pH Level", sensor.ph, settings.pHTarget, "increase_pH", "decrease_pH", 1);
    check("EC Level", sensor.ec, settings.ecTarget, "increase_EC", "decrease_EC", 1);
    check("Soil Moisture", sensor.soil_moisture, settings.soilMoistureTarget, "increase_water_level", "decrease_water_level", 10);
    check("Temperature", sensor.temperature, settings.tempTarget, "increase_temp", "decrease_temp", 2); // Optional – requires mapping if implemented
    check("Humidity", sensor.humidity, settings.humidityTarget, "increase_humidity", "decrease_humidity", 5); // Optional – same here

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

    const unsubscribeDevices = [];

    const deviceIdMap = deviceIdMapRef.current;
    if (deviceIdMap) {
      for (const [type, deviceId] of Object.entries(deviceIdMap)) {
        // Active
        const unsubActive = onSnapshot(
          collection(db, `users/${userId}/deviceGroups/${groupId}/devices/${deviceId}/active_commands`),
          (snapshot) => {
            const active = snapshot.docs.map((doc) => ({
              id: `active-${type}-${doc.id}`,
              param: doc.id,
              message: `🚀 Active Command: ${doc.id} (Value: ${doc.data().value})`,
              timestamp: doc.data().timestamp?.seconds
                ? new Date(doc.data().timestamp.seconds * 1000).toLocaleString()
                : "No Timestamp",
            }));
            setAlerts((prev) => [...prev.filter(a => !a.id.startsWith(`active-${type}-`)), ...active]);
          }
        );
        unsubscribeDevices.push(unsubActive);

        // Stop
        const unsubStop = onSnapshot(
          collection(db, `users/${userId}/deviceGroups/${groupId}/devices/${deviceId}/stop_commands`),
          (snapshot) => {
            const stop = snapshot.docs.map((doc) => ({
              id: `stop-${type}-${doc.id}`,
              param: doc.id,
              message: `🛑 Stop Command Sent: ${doc.data().action}`,
              timestamp: doc.data().timestamp?.seconds
                ? new Date(doc.data().timestamp.seconds * 1000).toLocaleString()
                : "No Timestamp",
            }));
            setAlerts((prev) => [...prev.filter(a => !a.id.startsWith(`stop-${type}-`)), ...stop]);
          }
        );
        unsubscribeDevices.push(unsubStop);
      }
    }

    unsubscribeFunctions.current = [
      unsubscribeControlSettings,
      unsubscribeSensorData,
      ...unsubscribeDevices,
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
