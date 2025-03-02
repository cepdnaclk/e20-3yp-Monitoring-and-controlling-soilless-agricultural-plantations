import React, { useState } from 'react';
import { 
  View, SafeAreaView, Image, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig"; // Ensure Firebase is correctly imported
import COLORS from '../config/colors';

export default function DeviceDetailsScreen({ navigation, route }) {
  // Retrieve the device parameter passed from the previous screen
  const { device } = route.params || {};
  const docId = device.docId;
  
  // Editable fields
  const [deviceName, setDeviceName] = useState(device.name);
  const [location, setLocation] = useState(device.location || "Not Assigned");
  const [ssid, setSSID] = useState("");
  const [password, setPassword] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  // ✅ Update Device Info in Firestore
  const updateDeviceInfo = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.error("🚨 No authenticated user found!");
      return;
    }

    try {
      const deviceRef = doc(db, `users/${userId}/devices/${docId}`);
      await setDoc(deviceRef, { name: deviceName, location }, { merge: true });
      Alert.alert("Success", "Device information updated!");
    } catch (error) {
      console.error("🔥 Firestore Error updating device:", error);
      Alert.alert("Error", "Failed to update device details.");
    }
  };

  // ✅ Save WiFi Credentials to Firestore
  const saveWiFiCredentials = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      const deviceRef = doc(db, `users/${userId}/devices/${docId}`);
      await setDoc(deviceRef, { wifiSSID: ssid, wifiPassword: password }, { merge: true });
      Alert.alert("Success", "WiFi credentials saved!");
      setModalVisible(false);
    } catch (error) {
      console.error("🔥 Firestore Error saving WiFi credentials:", error);
      Alert.alert("Error", "Failed to save WiFi details.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back & Edit Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={28} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Device Details</Text>
        <TouchableOpacity onPress={updateDeviceInfo}>
          <Icon name="save" size={24} color={COLORS.green} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Device Image */}
        <View style={styles.imageContainer}>
          {device.img ? (
            <Image source={{ uri: device.img }} style={styles.deviceImage} />
          ) : (
            <Icon name="image" size={100} color={COLORS.grey} />
          )}
        </View>

        {/* Editable Device Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.labelContainer}>
            <View style={styles.line} />
            <Text style={styles.sectionTitle}>Device Information</Text>
          </View>

          {/* Editable Device Name */}
          <TextInput 
            style={styles.input} 
            value={deviceName} 
            onChangeText={setDeviceName} 
            placeholder="Device Name"
          />

          {/* Editable Location */}
          <TextInput 
            style={styles.input} 
            value={location} 
            onChangeText={setLocation} 
            placeholder="Location"
          />

          {/* Device Specifications */}
          <View style={styles.specsContainer}>
            <Text style={styles.specsTitle}>Specifications:</Text>
            <Text style={styles.specsText}>🆔 Device ID: {device.id || 'N/A'}</Text>
            <Text style={styles.specsText}>⚙️ Type: {device.type || 'Unknown'}</Text>
            <Text style={styles.specsText}>📡 Connectivity: {device.connectivity || 'Not Available'}</Text>
            <Text style={styles.specsText}>⚡ Power: {device.power ? `${device.power}W` : 'Unknown'}</Text>
            <Text style={styles.specsText}>🔵 Status: {device.status || 'Unknown'}</Text>
          </View>

          {/* WiFi Settings Button */}
          <TouchableOpacity style={styles.wifiButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.wifiButtonText}>Edit WiFi Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* WiFi Credentials Modal */}
      <Modal visible={modalVisible} animationType="slide">
  <View style={styles.modalContainer}>
    <Text style={styles.modalTitle}>Update WiFi Settings</Text>

    <TextInput
      style={styles.input}
      placeholder="WiFi SSID"
      placeholderTextColor="#888" // Light grey for visibility
      value={ssid === "" ? null : ssid} // Fixes missing placeholder issue
      onChangeText={setSSID}
    />

    <TextInput
      style={styles.input}
      placeholder="WiFi Password"
      placeholderTextColor="#888" // Light grey for visibility
      secureTextEntry
      value={password === "" ? null : password} // Fixes missing placeholder issue
      onChangeText={setPassword}
    />

    <TouchableOpacity style={styles.saveButton} onPress={saveWiFiCredentials}>
      <Text style={styles.saveButtonText}>Save</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
      <Text style={styles.cancelButtonText}>Cancel</Text>
    </TouchableOpacity>
  </View>
</Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, justifyContent: 'space-between', backgroundColor: COLORS.light },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.dark },
  scrollContainer: { flexGrow: 1, paddingBottom: 20 },
  imageContainer: { alignItems: 'center', justifyContent: 'center', height: 250, backgroundColor: COLORS.light, margin: 15 },
  deviceImage: { width: '80%', height: '100%', resizeMode: 'contain' },
  detailsContainer: { backgroundColor: COLORS.light, marginHorizontal: 10, padding: 20, borderRadius: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  input: { backgroundColor: COLORS.white, borderRadius: 8, padding: 10, fontSize: 16, marginVertical: 5 },
  specsContainer: { marginTop: 15, padding: 15, backgroundColor: COLORS.white, borderRadius: 10 },
  specsTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  specsText: { fontSize: 16, color: COLORS.grey, marginBottom: 5 },
  wifiButton: { backgroundColor: COLORS.green, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  wifiButtonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'white'},
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  saveButton: { backgroundColor: COLORS.green, padding: 12, borderRadius: 8, marginTop: 10 },
  saveButtonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  cancelButton: { marginTop: 10 },
  cancelButtonText: { fontSize: 18, color: 'red' },
});

