import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView } from 'react-native';
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
  const [showInstructions, setShowInstructions] = useState(false); // New state for instructions

  const navigation = useNavigation();
  const route = useRoute();
  const userId = route.params?.userId;
  const db = getFirestore();

  // ... (keep all your existing useEffect and functions unchanged)

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
        groups[doc.id] = groupData.name || doc.id;
      });
      
      setGroupMap(groups);
    } catch (error) {
      console.error('Error loading group names:', error);
    }
  };

  // ... (keep all your existing functions unchanged - handleQRCodeScan, handleAssignGroup, removeDevice)

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

      console.log('🆔 Device ID:', device.id);

      const globalDeviceRef = doc(db, 'users', userId, 'devices', device.id);
      await setDoc(globalDeviceRef, deviceWithGroup);
      console.log('✅ Device saved to global path:', globalDeviceRef.path);

      const groupDeviceRef = doc(db, 'users', userId, 'deviceGroups', groupId, 'devices', device.id);
      await setDoc(groupDeviceRef, deviceWithGroup);
      console.log('✅ Device saved to group path:', groupDeviceRef.path);

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
      }

      console.log('🔧 Initializing group and device defaults...');
      try {
        const initResult = await initializeGroupDefaults(userId, groupId, device.id);
        if (initResult.success) {
          console.log(`✅ Initialized group and device defaults: ${groupId}`);
          console.log(`   - Success: ${initResult.results.success.length}`);
          console.log(`   - Skipped: ${initResult.results.skipped.length}`);
          console.log(`   - Errors: ${initResult.results.errors.length}`);
        } else {
          console.warn(`⚠️ Group/device initialized with some errors: ${groupId}`, initResult.results.errors);
        }
      } catch (initError) {
        console.error(`❌ Failed to initialize group/device defaults: ${groupId}`, initError);
      }

      if (isNewGroup) {
        setGroupMap(prev => ({
          ...prev,
          [groupId]: groupName || groupId
        }));
      }

      Alert.alert('Success', 'Device added to plantation successfully!');
      setProcessingQR(false);
      setScanned(false);
    } catch (error) {
      console.error('❌ Error assigning device to group:', error);
      Alert.alert('Error', 'Failed to assign device to plantation. Please try again.');
      setProcessingQR(false);
      setScanned(false);
    }

    setPendingDevice(null);
  };

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

  // Function to toggle instructions visibility
  const toggleInstructions = () => {
    setShowInstructions(!showInstructions);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Icon name="settings" size={24} color={COLORS.green} />
            <Text style={styles.title}>Manage Devices</Text>
            <TouchableOpacity 
              onPress={toggleInstructions}
              style={[
                styles.infoButton,
                showInstructions && styles.infoButtonActive
              ]}
            >
              <Icon 
                name={showInstructions ? "info" : "info-outline"} 
                size={18} 
                color={COLORS.green} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Conditional QR Scanning Instructions */}
        {showInstructions && (
          <View style={styles.instructionContainer}>
            <View style={styles.instructionHeader}>
              <Icon name="qr-code-scanner" size={20} color={COLORS.green} />
              <Text style={styles.instructionTitle}>How to Add Devices</Text>
              <TouchableOpacity 
                onPress={toggleInstructions}
                style={styles.closeInstructionsButton}
              >
                <Icon name="close" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.instructionText}>
              1. Tap "Scan Device QR Code" below{'\n'}
              2. Point your camera at the QR code on your sensor device{'\n'}
              3. Choose an existing plantation or create a new one{'\n'}
              4. Your device will be added and ready for monitoring
            </Text>
          </View>
        )}

        {/* Device Count Display */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Icon name="devices" size={24} color={COLORS.green} />
            <Text style={styles.statNumber}>{devices.length}</Text>
            <Text style={styles.statLabel}>Total Devices</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="eco" size={24} color={COLORS.green} />
            <Text style={styles.statNumber}>{Object.keys(groupMap).length}</Text>
            <Text style={styles.statLabel}>Plantations</Text>
          </View>
        </View>

        {/* Main Action Button */}
        <TouchableOpacity 
          style={styles.scanButton} 
          onPress={() => setIsScanning(true)}
        >
          <Icon name="qr-code-scanner" size={24} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.scanButtonText}>Scan Device QR Code</Text>
        </TouchableOpacity>

        {/* ... (keep all your existing Modal and device list code unchanged) */}

        {/* Camera Modal */}
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
              <View style={styles.permissionScreen}>
                <Icon name="camera" size={48} color="#fff" />
                <Text style={styles.permissionText}>Requesting camera permission...</Text>
              </View>
            ) : hasPermission === false ? (
              <View style={styles.permissionScreen}>
                <Icon name="camera-off" size={48} color="#fff" />
                <Text style={styles.permissionText}>Camera access denied</Text>
                <Text style={styles.permissionSubText}>Please enable camera permissions in your device settings</Text>
              </View>
            ) : processingQR ? (
              <View style={styles.successScreen}>
                <Icon name="check-circle" size={64} color="#4CAF50" />
                <Text style={styles.successText}>Device Scanned Successfully!</Text>
                <Text style={styles.successSubText}>
                  Now choose a plantation to assign this device to, or create a new plantation
                </Text>
              </View>
            ) : (
              <>
                <CameraView
                  style={styles.cameraView}
                  onBarcodeScanned={scanned ? undefined : handleQRCodeScan}
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                />
                <View style={styles.scanOverlay}>
                  <View style={styles.scanInstructions}>
                    <Icon name="center-focus-strong" size={32} color="#fff" />
                    <Text style={styles.scanInstructionText}>
                      Point your camera at the QR code on your device
                    </Text>
                  </View>
                </View>
              </>
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
              <Icon name="close" size={20} color="#fff" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        {/* Devices List */}
        {devices.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Icon name="devices" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Devices Added Yet</Text>
            <Text style={styles.emptyStateText}>
              Scan your first device's QR code to start monitoring your plantation
            </Text>
          </View>
        ) : (
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
                <View style={styles.groupHeader}>
                  <Icon name="eco" size={20} color={COLORS.green} />
                  <Text style={styles.groupTitle}>
                    {groupId === 'ungrouped'
                      ? 'Ungrouped Devices'
                      : `${groupMap[groupId] || groupId}`}
                  </Text>
                  <Text style={styles.deviceCount}>({groupDevices.length})</Text>
                </View>

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
                      <View style={styles.deviceInfo}>
                        <Text style={styles.deviceText}>{item.name}</Text>
                        <Text style={styles.deviceType}>{item.type}</Text>
                      </View>
                      <TouchableOpacity 
                        onPress={() => removeDevice(item.id)}
                        style={styles.removeButton}
                      >
                        <Icon name="delete" size={20} color="#ff4444" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

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
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: '#E8F5E9' 
  },
  header: { 
    marginBottom: 20 
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: COLORS.green,
    flex: 1,
    marginLeft: 10
  },
  infoButton: {
    padding: 8,
    backgroundColor: '#F1F8E9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36
  },
  infoButtonActive: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green
  },
  instructionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.green,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    justifyContent: 'space-between'
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.green,
    marginLeft: 8,
    flex: 1
  },
  closeInstructionsButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#f5f5f5'
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
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
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.green,
    marginTop: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  scanButton: {
    backgroundColor: '#2D6A4F',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  buttonIcon: {
    marginRight: 8
  },
  scanButtonText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  fullScreen: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'black' 
  },
  cameraView: { 
    flex: 1, 
    width: '100%' 
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scanInstructions: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 100
  },
  scanInstructionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10
  },
  permissionScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E3837',
    width: '100%',
    padding: 20
  },
  permissionText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center'
  },
  permissionSubText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8
  },
  cancelButton: { 
    position: 'absolute', 
    bottom: 40, 
    backgroundColor: '#ff4444', 
    padding: 12, 
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  cancelButtonText: { 
    color: '#fff', 
    fontSize: 16,
    marginLeft: 4
  },
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
    marginTop: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  successSubText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22
  },
  emptyStateContainer: {
    alignItems: 'center',
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
  groupedContainer: {
    marginTop: 10,
  },
  groupSection: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden'
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F1F8E9',
    borderBottomWidth: 1,
    borderBottomColor: '#E8F5E9'
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.green,
    marginLeft: 8,
    flex: 1
  },
  deviceCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold'
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  deviceIcon: {
    marginRight: 12
  },
  deviceInfo: {
    flex: 1
  },
  deviceText: { 
    color: '#333', 
    fontSize: 16,
    fontWeight: '500'
  },
  deviceType: {
    color: '#666',
    fontSize: 12,
    marginTop: 2
  },
  removeButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#ffebee'
  }
});
