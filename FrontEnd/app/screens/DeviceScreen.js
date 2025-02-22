import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { Camera, CameraView } from 'expo-camera'; // ✅ Correct Import
import COLORS from '../config/colors';
import devicesData from '../config/devices';

export default function DeviceScreen() {
  const [deviceName, setDeviceName] = useState('');
  const [devices, setDevices] = useState([]);
  const [hasPermission, setHasPermission] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false); // New state to prevent multiple scans
  const navigation = useNavigation();

  useEffect(() => {
    loadDevices();
    requestCameraPermission();
  }, []);

  // Load devices from AsyncStorage
  const loadDevices = async () => {
    try {
      const storedDevices = await AsyncStorage.getItem('devices');
      if (storedDevices) {
        setDevices(JSON.parse(storedDevices));
      } else {
        setDevices([]); // or setDevices([]) to start with an empty list
      }
    } catch (error) {
      console.log('Error loading devices:', error);
    }
  };

  // Request Camera Permissions
  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  // Manually add a new device
  const addDevice = async () => {
    if (!deviceName.trim()) {
      Alert.alert('Error', 'Device name cannot be empty');
      return;
    }

    const newDevice = {
      id: Date.now().toString(),
      name: deviceName,
      type: 'Custom Device',
      status: 'Unknown',
      connectivity: 'Unknown',
      icon: 'device-thermostat',
    };

    const updatedDevices = [...devices, newDevice];
    setDevices(updatedDevices);
    await AsyncStorage.setItem('devices', JSON.stringify(updatedDevices));
    setDeviceName('');
  };

  // Remove a device
  const removeDevice = async (id) => {
    const updatedDevices = devices.filter(device => device.id !== id);
    setDevices(updatedDevices);
    await AsyncStorage.setItem('devices', JSON.stringify(updatedDevices));
  };

  // Handle QR Code Scan
  const handleQRCodeScan = async ({ data }) => {
    if (scanned) return; // Prevent multiple scans
    setScanned(true);
    
    try {
      const scannedData = JSON.parse(data); // Extract scanned QR code data

      if (!scannedData.id || !scannedData.name || !scannedData.type) {
        Alert.alert('Invalid QR Code', 'The scanned QR code does not contain valid device information.');
        setScanned(false); // Reset flag so user can try again
        return;
      }

      const newDevice = {
        id: scannedData.id,
        name: scannedData.name,
        type: scannedData.type,
        status: scannedData.status || 'Unknown',
        connectivity: scannedData.connectivity || 'Unknown',
        icon: scannedData.icon || 'device-thermostat',
        description: scannedData.description || 'No description available.',
        power: scannedData.power || 'Unknown',
        img: scannedData.imageUrl || null,
      };

      const updatedDevices = [...devices, newDevice];
      setDevices(updatedDevices);
      await AsyncStorage.setItem('devices', JSON.stringify(updatedDevices));

      Alert.alert(
        'Success',
        `${scannedData.name} added successfully!`,
        [
          {
            text: 'OK',
            onPress: () => {
              setIsScanning(false); // Close the modal
              setScanned(false);    // Reset the scanned flag for future scans
              // If you want to navigate back to a previous screen, uncomment the next line:
              // navigation.goBack();
            }
          }
        ]
      );
      
    } catch (error) {
      Alert.alert('Error', 'Failed to process QR code.');
      console.error('QR Scan Error:', error);
      setScanned(false); // Reset flag in case of error
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Devices</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Enter device name"
        placeholderTextColor="#aaa"
        value={deviceName}
        onChangeText={setDeviceName}
      />

      <TouchableOpacity style={styles.addButton} onPress={addDevice}>
        <Text style={styles.addButtonText}>Add Device</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.scanButton} onPress={() => setIsScanning(true)}>
        <Text style={styles.scanButtonText}>Scan QR Code</Text>
      </TouchableOpacity>

      {/* QR Scanner Modal */}
      <Modal visible={isScanning} animationType="slide">
        <View style={styles.fullScreen}>
          {hasPermission === null ? (
            <Text>Requesting camera permission...</Text>
          ) : hasPermission === false ? (
            <Text>No access to camera</Text>
          ) : (
            <CameraView
              style={styles.cameraView}
              onBarcodeScanned={handleQRCodeScan}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            />
          )}
          <TouchableOpacity style={styles.cancelButton} onPress={() => { setIsScanning(false); setScanned(false); }}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <FlatList
        data={devices}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('DeviceDetail', { device: item })}>
            <View style={styles.deviceItem}>
              <Icon name={item.icon || 'device-thermostat'} size={30} color={COLORS.green} style={styles.deviceIcon} />
              <Text style={styles.deviceText}>{item.name}</Text>
              <TouchableOpacity onPress={() => removeDevice(item.id)}>
                <Text style={styles.deleteText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#E8F5E9' },
  title: { fontSize: 30, fontWeight: 'bold', color: COLORS.green },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 10,
    color: '#333',
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: '#447055',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scanButton: {
    backgroundColor: '#2D6A4F',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  scanButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  fullScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' },
  cameraView: { flex: 1, width: '100%' },
  cancelButton: { position: 'absolute', bottom: 40, backgroundColor: 'red', padding: 10, borderRadius: 8 },
  cancelButtonText: { color: '#fff', fontSize: 16 },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  deviceText: { color: '#333', fontSize: 18 },
  deleteText: { color: 'red', fontSize: 16 },
});
