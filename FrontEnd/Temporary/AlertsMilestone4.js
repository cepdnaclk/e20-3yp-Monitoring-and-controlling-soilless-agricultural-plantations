import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";
import COLORS from "../config/colors";
import Icon from 'react-native-vector-icons/MaterialIcons';
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
  const [showAlertsInfo, setShowAlertsInfo] = useState(false); // New state for info visibility
  const alertsMap = useRef(new Map());
  const unsubscribeFunctions = useRef([]);
  const latestSensorDataRef = useRef(null);
  const latestControlSettingsRef = useRef(null);
  const deviceIdMapRef = useRef(null);

  useEffect(() => {
    if (!userId || !groupId) {
      console.error("Missing userId or groupId in AlertsScreen");
      return;
    }

    const initialize = async () => {
      setAlerts([]);
      alertsMap.current.clear();
      unsubscribeFunctions.current.forEach((unsub) => unsub());
      unsubscribeFunctions.current = [];

      const freshDeviceIdMap = await fetchDeviceIdMap(userId, groupId);
      deviceIdMapRef.current = freshDeviceIdMap;

      latestSensorDataRef.current = null;
      latestControlSettingsRef.current = null;

      fetchAlerts(freshDeviceIdMap);
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

    // Keep existing check function for pH and EC control commands
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
            message: `${param} is off target! (Current: ${current}, Target: ${target})`,
            timestamp: new Date().toLocaleString(),
            type: 'warning'
          });
          console.log("Triggering control command:", { groupId, action, value });
          sendControlCommand(userId, groupId, action, value, deviceIdMap);
        }
        newAlerts.push(alertsMap.current.get(key));
      } else if (alertsMap.current.has(key)) {
        const prev = alertsMap.current.get(key);
        alertsMap.current.delete(key);
        console.log("Triggering stop command:", { groupId, action: prev.action });
        sendStopCommand(userId, groupId, prev.action, deviceIdMap);
      }
    };

    // New function for warning-only alerts (no control commands)
    const checkWarningOnly = (param, current, condition, message) => {
      const key = `${groupId}-${param}-warning`;
      
      if (condition) {
        if (!alertsMap.current.has(key)) {
          alertsMap.current.set(key, {
            id: key,
            param,
            action: null,
            message,
            timestamp: new Date().toLocaleString(),
            type: 'warning'
          });
        }
        newAlerts.push(alertsMap.current.get(key));
      } else {
        if (alertsMap.current.has(key)) {
          alertsMap.current.delete(key);
        }
      }
    };

    // Keep existing pH and EC checks with control commands (unchanged)
    check("pH Level", sensor.ph, settings.pHTarget, "increase_pH", "decrease_pH", 1);
    check("EC Level", sensor.ec, settings.ecTarget, "increase_EC", "decrease_EC", 1);
    check("Soil Moisture", sensor.soil_moisture, settings.soilMoistureTarget, "increase_water_level", "decrease_water_level", 10);

    // NEW: Temperature warning-only alert (18-25°C ideal range)
    checkWarningOnly(
      "Temperature",
      sensor.temperature,
      sensor.temperature < 18 || sensor.temperature > 25,
      `Temperature is out of ideal range! (Current: ${sensor.temperature}°C, Ideal: 18-25°C)`
    );

    // NEW: Humidity warning-only alert (50-70% ideal range)
    checkWarningOnly(
      "Humidity",
      sensor.humidity,
      sensor.humidity < 50 || sensor.humidity > 70,
      `Humidity is out of ideal range! (Current: ${sensor.humidity}%, Ideal: 50-70%)`
    );

    // NEW: Light intensity warning-only alert (10000-50000 ideal range)
    checkWarningOnly(
      "Light Intensity",
      sensor.light_intensity,
      sensor.light_intensity < 10000 || sensor.light_intensity > 50000,
      `Light intensity is out of ideal range! (Current: ${sensor.light_intensity}, Ideal: 10000-50000)`
    );

    // NEW: Water level categorical warning
    checkWarningOnly(
      "Water Level",
      sensor.water_level,
      ['Low', 'Medium', 'Critical', 'Empty', 'Overflow'].includes(sensor.water_level),
      `Water level alert: ${sensor.water_level}`
    );

    // Remove the old temperature and humidity control commands
    setAlerts((prev) => [
      ...prev.filter(a => !a.id.endsWith("-alert") && !a.id.endsWith("-warning")), 
      ...newAlerts
    ]);
  };

  const fetchAlerts = async (deviceIdMap) => {
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

    for (const [type, deviceId] of Object.entries(deviceIdMap)) {
      const unsubActive = onSnapshot(
        collection(db, `users/${userId}/deviceGroups/${groupId}/devices/${deviceId}/active_commands`),
        (snapshot) => {
          const active = snapshot.docs.filter(doc => !doc.id.startsWith("init")).map(doc => ({
            id: `active-${type}-${doc.id}`,
            param: doc.id,
            message: `Active Command: ${doc.id} (Value: ${doc.data().value})`,
            timestamp: doc.data().timestamp?.seconds ? new Date(doc.data().timestamp.seconds * 1000).toLocaleString() : "No Timestamp",
            type: 'active'
          }));
          setAlerts((prev) => [...prev.filter(a => !a.id.startsWith(`active-${type}-`)), ...active]);
        }
      );
      unsubscribeDevices.push(unsubActive);

      const unsubStop = onSnapshot(
        collection(db, `users/${userId}/deviceGroups/${groupId}/devices/${deviceId}/stop_commands`),
        (snapshot) => {
          const stop = snapshot.docs.filter(doc => !doc.id.startsWith("init")).map(doc => ({
            id: `stop-${type}-${doc.id}`,
            param: doc.id,
            message: `Stop Command Sent: ${doc.data().action}`,
            timestamp: doc.data().timestamp?.seconds ? new Date(doc.data().timestamp.seconds * 1000).toLocaleString() : "No Timestamp",
            type: 'stop'
          }));
          setAlerts((prev) => [...prev.filter(a => !a.id.startsWith(`stop-${type}-`)), ...stop]);
        }
      );
      unsubscribeDevices.push(unsubStop);
    }

    unsubscribeFunctions.current = [unsubscribeControlSettings, unsubscribeSensorData, ...unsubscribeDevices];
    setRefreshing(false);
  };

  const dismissAlert = async (id) => {
    alertsMap.current.delete(id);
    const updatedAlerts = alerts.filter((alert) => alert.id !== id);
    setAlerts(updatedAlerts);
    await AsyncStorage.setItem(`alerts-${groupId}`, JSON.stringify(updatedAlerts));
  };

  // Function to toggle alerts info visibility
  const toggleAlertsInfo = () => {
    setShowAlertsInfo(!showAlertsInfo);
  };

  // Function to get alert icon based on type
  const getAlertIcon = (type) => {
    switch (type) {
      case 'warning':
        return 'warning';
      case 'active':
        return 'play-circle-filled';
      case 'stop':
        return 'stop-circle';
      default:
        return 'notification-important';
    }
  };

  // Function to get alert color based on type
  const getAlertColor = (type) => {
    switch (type) {
      case 'warning':
        return '#FF9800';
      case 'active':
        return '#4CAF50';
      case 'stop':
        return '#F44336';
      default:
        return '#2196F3';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Info Button */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={styles.titleSection}>
            <Icon name="notifications" size={24} color={COLORS.green} />
            <Text style={styles.title}>Alerts</Text>
          </View>
          <TouchableOpacity 
            onPress={toggleAlertsInfo}
            style={[
              styles.infoButton,
              showAlertsInfo && styles.infoButtonActive
            ]}
          >
            <Icon 
              name={showAlertsInfo ? "info" : "info-outline"} 
              size={18} 
              color={showAlertsInfo ? "#fff" : COLORS.green} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Conditional Alerts Information */}
      {showAlertsInfo && (
        <View style={styles.infoContainer}>
          <View style={styles.infoHeader}>
            <Icon name="priority-high" size={20} color={COLORS.green} />
            <Text style={styles.infoTitle}>About Alerts</Text>
            <TouchableOpacity 
              onPress={toggleAlertsInfo}
              style={styles.closeInfoButton}
            >
              <Icon name="close" size={16} color="#666" />
            </TouchableOpacity>
          </View>
          <Text style={styles.infoText}>
            <Text style={styles.criticalText}>CRITICAL: Pay immediate attention to all alerts!</Text>{'\n\n'}
            • <Text style={styles.boldText}>Warning Alerts:</Text> Sensor values are outside target ranges{'\n'}
            • <Text style={styles.boldText}>Active Commands:</Text> System is actively correcting conditions{'\n'}
            • <Text style={styles.boldText}>Stop Commands:</Text> Automated corrections have been halted{'\n'}
            • <Text style={styles.boldText}>Action Required:</Text> Review and address alerts promptly to maintain optimal growing conditions
          </Text>
        </View>
      )}

      {/* Alert Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Icon name="notifications-active" size={24} color={COLORS.green} />
          <Text style={styles.statNumber}>{alerts.length}</Text>
          <Text style={styles.statLabel}>Total Alerts</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="warning" size={24} color="#FF9800" />
          <Text style={styles.statNumber}>
            {alerts.filter(alert => alert.type === 'warning').length}
          </Text>
          <Text style={styles.statLabel}>Warnings</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="play-circle-filled" size={24} color="#4CAF50" />
          <Text style={styles.statNumber}>
            {alerts.filter(alert => alert.type === 'active').length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Icon name="notifications-off" size={64} color="#ccc" />
          <Text style={styles.emptyStateTitle}>No Active Alerts</Text>
          <Text style={styles.emptyStateText}>
            Your plantation is running smoothly. All sensor values are within target ranges.
          </Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[
              styles.alertItem,
              { borderLeftColor: getAlertColor(item.type) }
            ]}>
              <View style={styles.alertHeader}>
                <Icon 
                  name={getAlertIcon(item.type)} 
                  size={20} 
                  color={getAlertColor(item.type)} 
                />
                <Text style={styles.alertType}>
                  {item.type === 'warning' ? 'Warning' : 
                   item.type === 'active' ? 'Active Command' : 
                   item.type === 'stop' ? 'Stop Command' : 'Alert'}
                </Text>
                <TouchableOpacity 
                  onPress={() => dismissAlert(item.id)}
                  style={styles.dismissButton}
                >
                  <Icon name="close" size={16} color="#666" />
                </TouchableOpacity>
              </View>
              <Text style={styles.alertText}>{item.message}</Text>
              <View style={styles.alertFooter}>
                <Icon name="schedule" size={14} color="#666" />
                <Text style={styles.timestamp}>{item.timestamp}</Text>
              </View>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAlerts(deviceIdMapRef.current)}
              colors={[COLORS.green]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: "#E8F5E9" 
  },
  header: {
    marginBottom: 20
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  title: { 
    fontSize: 28, 
    fontWeight: "bold", 
    color: COLORS.green,
    marginLeft: 10
  },
  infoButton: {
    padding: 8,
    backgroundColor: '#E8F5E8',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 30,
    minHeight: 30
  },
  infoButtonActive: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green
  },
  infoContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    justifyContent: 'space-between'
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.green,
    marginLeft: 8,
    flex: 1
  },
  closeInfoButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#e9ecef'
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  criticalText: {
    fontWeight: 'bold',
    color: '#d32f2f',
    fontSize: 15
  },
  boldText: {
    fontWeight: 'bold',
    color: '#333'
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20
  },
  statItem: {
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.green,
    marginTop: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 20
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8
  },
  emptyStateText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20
  },
  alertItem: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  alertType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    flex: 1
  },
  dismissButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#f5f5f5'
  },
  alertText: { 
    color: "#333", 
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8
  },
  alertFooter: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  timestamp: { 
    color: "#666", 
    fontSize: 12,
    marginLeft: 4
  }
});
