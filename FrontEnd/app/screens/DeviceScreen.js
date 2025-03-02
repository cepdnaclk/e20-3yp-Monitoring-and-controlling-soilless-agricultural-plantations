import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Camera, CameraView } from 'expo-camera';
import { getFirestore, collection, doc, setDoc, addDoc,getDocs,getDoc, deleteDoc,onSnapshot  } from 'firebase/firestore';
import COLORS from '../config/colors';
import devicesData from '../config/devices';


export default function DeviceScreen() {
  const [deviceName, setDeviceName] = useState('');
  const [devices, setDevices] = useState([]);
  const [hasPermission, setHasPermission] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [processingQR, setProcessingQR] = useState(false);
  
  const navigation = useNavigation();
  const route = useRoute();
  const userId = route.params?.userId; // Get userId from route params
  const db = getFirestore();
  
  

  useEffect(() => {
    if (!userId) return;
  
    const userDevicesRef = collection(db, 'users', userId, 'devices');
    
    console.log('DeviceScreen: User ID:', userId);
    
    
    // Properly request camera permissions
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  
    // Firestore real-time listener
    const unsubscribe = onSnapshot(userDevicesRef, (querySnapshot) => {
      const updatedDevices = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setDevices(updatedDevices);
    });
  
    return () => unsubscribe(); // Cleanup listener on unmount
  }, [userId]);


  // Load devices from AsyncStorage
  const loadDevices = async () => {
    if (!userId) return;
  
    try {
      const userDevicesRef = collection(db, 'users', userId, 'devices');
      const querySnapshot = await getDocs(userDevicesRef);
      
      const loadedDevices = querySnapshot.docs.map(doc => ({
        id: doc.id,  // Firestore document ID
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
    
    // Add to Firestore if userId is available
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
  const removeDevice = async (id, name) => {
    
    if (!userId) return;
  
    try {
      const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const uniqueDocId = `${id}_${sanitizedName}`;
      console.log('Removing device:', uniqueDocId);
  
      const deviceDocRef = doc(db, 'users', userId, 'devices', uniqueDocId);
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
  
      const sanitizedName = scannedData.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const uniqueDocId = `${scannedData.id}_${sanitizedName}`;
  
      if (userId) {
        const deviceDocRef = doc(db, 'users', userId, 'devices', uniqueDocId);
        const existingDevice = await getDoc(deviceDocRef);
  
        if (existingDevice.exists()) {
          Alert.alert('Duplicate Device', 'This device already exists.');
          setProcessingQR(false);
          setScanned(false);
          return;
        }
      }
  
      // Create the device object with explicitly set WiFi credentials
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
        // Always set these fields explicitly, regardless of QR content
        wifiSSID: "DEFAULT_SSID",  
        wifiPassword: "DEFAULT_PASSWORD" 
      };
  
      console.log('📝 Writing device to Firestore with WiFi credentials:', 
        newDevice.wifiSSID, newDevice.wifiPassword);
  
      if (userId) {
        const userDevicesRef = collection(db, 'users', userId, 'devices');
        
        // Option 1: Use setDoc with a specific document ID
        const deviceDocRef = doc(userDevicesRef, uniqueDocId);
        await setDoc(deviceDocRef, newDevice);
        
        console.log('✅ Scanned device added to Firestore with ID:', uniqueDocId);
      }
  
    } catch (error) {
      Alert.alert('Error', 'Failed to process QR code.');
      console.error('QR Scan Error:', error);
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
      // Show the success screen with Scan Another button when processing is complete
      <View style={styles.successScreen}>
        <Text style={styles.successText}>Device Added Successfully!</Text>
        <TouchableOpacity 
          style={styles.scanAgainButton} 
          onPress={() => {
            setScanned(false);
            setProcessingQR(false);
          }}
        >
          <Text style={styles.scanAgainButtonText}>Add another device</Text>
        </TouchableOpacity>
      </View>
    ) : (
      // Show camera when not processing
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
      }}
    >
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
              <TouchableOpacity onPress={() => removeDevice(item.id, item.name)}>
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
    marginBottom: 30,
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
  }
});