import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Camera, CameraView } from 'expo-camera';
import { getFirestore, collection, doc, setDoc, addDoc, getDocs, getDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import COLORS from '../config/colors';
import devicesData from '../config/devices';
import GroupPickerModal from '../modals/GroupPickerModal';
import { initializeGroupDefaults } from '../utils/initializeGroupDefaults';

export default function DeviceScreen() {
  const [deviceName, setDeviceName] = useState('');
  const [devices, setDevices] = useState([]);
  const [hasPermission, setHasPermission] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [processingQR, setProcessingQR] = useState(false);
  const [groupPickerVisible, setGroupPickerVisible] = useState(false);
  const [pendingDevice, setPendingDevice] = useState(null);
  const [groupMap, setGroupMap] = useState({});

  const navigation = useNavigation();
  const route = useRoute();
  const userId = route.params?.userId;
  const db = getFirestore();

  useEffect(() => {
    if (!userId) return;

    const userDevicesRef = collection(db, 'users', userId, 'devices');
    
    console.log('DeviceScreen: User ID:', userId);
    
    // Request camera permissions
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();

    // Load group names for display
    loadGroupNames();

    // Firestore real-time listener for devices
    const unsubscribe = onSnapshot(userDevicesRef, (querySnapshot) => {
      const updatedDevices = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setDevices(updatedDevices);
    });

    return () => unsubscribe();
  }, [userId]);

  // Load group names for display
  const loadGroupNames = async () => {
    if (!userId) return;

    try {
      const groupsRef = collection(db, 'users', userId, 'deviceGroups');
      const groupsSnapshot = await getDocs(groupsRef);
      
      const groups = {};
      groupsSnapshot.docs.forEach(doc => {
        const groupData = doc.data();
        groups[doc.id] = groupData.name || doc.id; // Use group name if available, otherwise use ID
      });
      
      setGroupMap(groups);
    } catch (error) {
      console.error('Error loading group names:', error);
    }
  };

  // Load devices from Firestore
  const loadDevices = async () => {
    if (!userId) return;

    try {
      const userDevicesRef = collection(db, 'users', userId, 'devices');
      const querySnapshot = await getDocs(userDevicesRef);
      
      const loadedDevices = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setDevices(loadedDevices);
    } catch (error) {
      console.log('Error fetching devices from Firestore:', error);
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
    
    if (userId) {
      try {
        const userDevicesRef = collection(db, 'users', userId, 'devices');
        await addDoc(userDevicesRef, newDevice);
        console.log('Device added to Firestore');
      } catch (error) {
        console.error('Error adding device to Firestore:', error);
      }
    }
    
    setDeviceName('');
  };

  // Remove a device
  const removeDevice = async (id) => {
    if (!userId) return;

    try {
      const deviceDocRef = doc(db, 'users', userId, 'devices', id);
      await deleteDoc(deviceDocRef);

      Alert.alert('Success', 'Device removed successfully.');
    } catch (error) {
      console.error('Error removing device from Firestore:', error);
      Alert.alert('Error', 'Failed to remove device.');
    }
  };

  // Handle QR Code Scan
  const handleQRCodeScan = async ({ data }) => {
    if (scanned || processingQR) return;

    setScanned(true);
    setProcessingQR(true);

    try {
      console.log('Processing QR code data:', data);
      let scannedData;

      try {
        scannedData = JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse QR data:', e);
        Alert.alert('Invalid QR Code', 'The scanned QR code contains invalid JSON data.');
        setProcessingQR(false);
        setScanned(false);
        return;
      }

      if (!scannedData.id || !scannedData.name || !scannedData.type) {
        Alert.alert('Invalid QR Code', 'The scanned QR code does not contain valid device information.');
        setProcessingQR(false);
        setScanned(false);
        return;
      }

      // Device object to be saved
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
        dateAdded: new Date().toISOString(),
        wifiSSID: "DEFAULT_SSID",
        wifiPassword: "DEFAULT_PASSWORD"
      };

      console.log('📝 Writing device to Firestore with WiFi credentials:', newDevice.wifiSSID, newDevice.wifiPassword);

      if (userId) {
        const deviceDocRef = doc(db, 'users', userId, 'devices', scannedData.id);
        const existingDevice = await getDoc(deviceDocRef);

        if (existingDevice.exists()) {
          Alert.alert('Duplicate Device', 'This device already exists.');
          setProcessingQR(false);
          setScanned(false);
          return;
        }

        setPendingDevice({ device: newDevice, type: 'sensor' });
        setGroupPickerVisible(true);

        console.log('✅ Scanned device ready for group assignment with ID:', scannedData.id);
      }

    } catch (error) {
      Alert.alert('Error', 'Failed to process QR code.');
      console.error('QR Scan Error:', error);
      setProcessingQR(false);
      setScanned(false);
    }
  };

  const handleAssignGroup = async (groupId, isNewGroup = false, groupName = null) => {
  setGroupPickerVisible(false);

  console.log('📌 handleAssignGroup triggered');
  console.log('🧾 userId:', userId);
  console.log('📦 groupId:', groupId);
  console.log('🆕 isNewGroup:', isNewGroup);
  console.log('📝 groupName:', groupName);

  if (!pendingDevice || !userId) {
    console.warn('⚠️ Missing device or user ID');
    setPendingDevice(null);
    return;
  }

  try {
    const { device } = pendingDevice;
    const deviceWithGroup = {
      ...device,
      groupId,
      userId,
    };

    // Step 1: Save to global device list
    const globalDeviceRef = doc(db, 'users', userId, 'devices', device.id);
    await setDoc(globalDeviceRef, deviceWithGroup);
    console.log('✅ Device saved to global path:', globalDeviceRef.path);

    // Step 2: Save to group-specific devices subcollection
    const groupDeviceRef = doc(db, 'users', userId, 'deviceGroups', groupId, 'devices', device.id);
    await setDoc(groupDeviceRef, deviceWithGroup);
    console.log('✅ Device saved to group path:', groupDeviceRef.path);

    // Step 3: Create group document if new
    const groupDocRef = doc(db, 'users', userId, 'deviceGroups', groupId);
    const groupDocSnap = await getDoc(groupDocRef);

    if (isNewGroup) {
      await setDoc(groupDocRef, {
        name: groupName,
        createdAt: serverTimestamp()
      });
      console.log('✅ Group document created:', groupDocRef.path);
    } else if (!groupDocSnap.exists()) {
      console.log('ℹ️ Group did not exist, creating...');
      await setDoc(groupDocRef, { createdAt: serverTimestamp() });
      try {
        const initResult = await initializeGroupDefaults(userId, groupId);
        if (initResult.success) {
          console.log(`✅ Initialized existing group: ${groupId}`);
        } else {
          console.warn(`⚠️ Group initialized with some errors: ${groupId}`, initResult.results.errors);
        }
      } catch (initError) {
        console.error(`❌ Failed to initialize group defaults: ${groupId}`, initError);
      }
    }

    // Step 4: Ensure sensor_data exists
    const sensorDataRef = doc(db, `users/${userId}/deviceGroups/${groupId}/sensor_data`, '1');
    const sensorSnap = await getDoc(sensorDataRef);
    if (!sensorSnap.exists()) {
      await setDoc(sensorDataRef, {
        ec: 3.5,
        humidity: 45,
        light_intensity: 75,
        ph: 12,
        soil_moisture: 31,
        temperature: 26.3,
        water_level: "critical",
        timestamp: serverTimestamp()
      });
      console.log('✅ sensor_data created at:', sensorDataRef.path);
    }

    // Step 5: Ensure active_commands exists
    const activeRef = doc(db, `users/${userId}/deviceGroups/${groupId}/active_commands`, 'init');
    const activeSnap = await getDoc(activeRef);
    if (!activeSnap.exists()) {
      await setDoc(activeRef, {
        createdAt: serverTimestamp(),
        status: 'init'
      });
      console.log('✅ active_commands created at:', activeRef.path);
    }

    // Step 6: Ensure stop_commands exists
    const stopRef = doc(db, `users/${userId}/deviceGroups/${groupId}/stop_commands`, 'init');
    const stopSnap = await getDoc(stopRef);
    if (!stopSnap.exists()) {
      await setDoc(stopRef, {
        createdAt: serverTimestamp(),
        status: 'init'
      });
      console.log('✅ stop_commands created at:', stopRef.path);
    }
    // Step 7: Ensure control_settings exists
const controlRef = doc(db, `users/${userId}/deviceGroups/${groupId}/control_settings`, 'init');
const controlSnap = await getDoc(controlRef);
if (!controlSnap.exists()) {
  await setDoc(controlRef, {
    threshold_ph: 7,
    threshold_ec: 2.0,
    threshold_moisture: 35,
    mode: 'auto',
    createdAt: serverTimestamp()
  });
  console.log('✅ control_settings created at:', controlRef.path);
}


    // Step 7: Update UI map if new group
    if (isNewGroup) {
      setGroupMap(prev => ({
        ...prev,
        [groupId]: groupName || groupId
      }));
    }

    Alert.alert('Success', 'Device added to group successfully!');
    setProcessingQR(false);
    setScanned(false);
  } catch (error) {
    console.error('❌ Error assigning device to group:', error);
    Alert.alert('Error', 'Failed to assign device to group. Please try again.');
    setProcessingQR(false);
    setScanned(false);
  }

  setPendingDevice(null);
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

      <TouchableOpacity style={styles.scanButton} onPress={() => setIsScanning(true)}>
        <Text style={styles.scanButtonText}>Add Device</Text>
      </TouchableOpacity>

      <Modal 
        visible={isScanning} 
        animationType="slide"
        onRequestClose={() => {
          setIsScanning(false);
          setScanned(false);
          setProcessingQR(false);
        }}
      >
        <View style={styles.fullScreen}>
          {hasPermission === null ? (
            <Text>Requesting camera permission...</Text>
          ) : hasPermission === false ? (
            <Text>No access to camera</Text>
          ) : processingQR ? (
            <View style={styles.successScreen}>
              <Text style={styles.successText}>Processing Device...</Text>
              <Text style={styles.successSubText}>Please select a group for your device</Text>
            </View>
          ) : (
            <CameraView
              style={styles.cameraView}
              onBarcodeScanned={scanned ? undefined : handleQRCodeScan}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            />
          )}
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => {
              setIsScanning(false);
              setScanned(false);
              setProcessingQR(false);
              setPendingDevice(null);
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <View style={styles.groupedContainer}>
        {Object.entries(
          devices.reduce((acc, device) => {
            const group = device.groupId || 'ungrouped';
            if (!acc[group]) acc[group] = [];
            acc[group].push(device);
            return acc;
          }, {})
        ).map(([groupId, groupDevices]) => (
          <View key={groupId} style={styles.groupSection}>
            <Text style={styles.groupTitle}>
              {groupId === 'ungrouped'
                ? 'Ungrouped Devices'
                : `${groupMap[groupId] || groupId}`}
            </Text>

            {groupDevices.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => navigation.navigate('DeviceDetail', { device: item })}
              >
                <View style={styles.deviceItem}>
                  <Icon
                    name={item.icon || 'device-thermostat'}
                    size={30}
                    color={COLORS.green}
                    style={styles.deviceIcon}
                  />
                  <Text style={styles.deviceText}>{item.name}</Text>
                  <TouchableOpacity onPress={() => removeDevice(item.id)}>
                    <Text style={styles.deleteText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      <GroupPickerModal
        visible={groupPickerVisible}
        userId={userId}
        onSelectGroup={handleAssignGroup}
        onClose={() => {
          setGroupPickerVisible(false);
          setPendingDevice(null);
          setProcessingQR(false);
          setScanned(false);
        }}
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
  successScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E3837',
    width: '100%',
    padding: 20,
  },
  successText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  successSubText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
  },
  scanAgainButton: {
    backgroundColor: '#2D6A4F',
    padding: 15,
    borderRadius: 8,
    width: '80%', 
    alignItems: 'center',
  },
  scanAgainButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  groupedContainer: {
    marginTop: 10,
  },
  groupSection: {
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 5,
    paddingLeft: 5,
  },
});