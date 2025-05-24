import React, { useState, useEffect } from 'react';
import { 
  View, SafeAreaView, Image, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig'; // Ensure Firebase is properly imported
import COLORS from '../config/colors';

export default function DeviceDetailsScreen({ navigation, route }) {
  const { device } = route.params || {};
  const id = device.id || 'unknown';
  const name = device.name || 'Unknown Device';

  const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const uniqueDocId = `${id}_${sanitizedName}`;

  console.log(`📌 Viewing Device Details for: ${device.name}`);
  console.log(`🆔 Firestore Document ID: ${uniqueDocId}`);

  // States
  const [modalVisible, setModalVisible] = useState(false);
  const [wifiSSID, setWifiSSID] = useState(device.wifiSSID || '');
  const [wifiPassword, setWifiPassword] = useState(device.wifiPassword || '');
  const [groupName, setGroupName] = useState('');

  // Fetch group name using groupId
  useEffect(() => {
    const fetchGroupName = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId || !device.groupId) return;

        const groupRef = doc(db, 'users', userId, 'deviceGroups', device.groupId);
        const groupSnap = await getDoc(groupRef);

        if (groupSnap.exists()) {
          const data = groupSnap.data();
          setGroupName(data.name || device.groupId);
        } else {
          setGroupName(device.groupId);
        }
      } catch (err) {
        console.error('Error fetching group name:', err);
      }
    };

    fetchGroupName();
  }, []);

  // Save updated WiFi details to Firestore
  const updateWiFiDetails = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert('Error', 'No authenticated user found.');
        console.error('❌ No authenticated user.');
        return;
      }

      const deviceRef = doc(db, `users/${userId}/devices/${uniqueDocId}`);

      const updatedData = {
        wifiSSID,
        wifiPassword
      };

      console.log('📤 Updating Firestore (WiFi Details):', updatedData);

      await setDoc(deviceRef, updatedData, { merge: true });

      Alert.alert('Success', 'WiFi details updated successfully!');
      console.log('✅ WiFi details updated in Firestore.');
      setModalVisible(false);
    } catch (error) {
      console.error('🔥 Firestore Update Error:', error);
      Alert.alert('Error', 'Failed to update WiFi details.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={28} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Device Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.imageContainer}>
          {device.img ? (
            <Image source={{ uri: device.img }} style={styles.deviceImage} />
          ) : (
            <Icon name="image" size={100} color={COLORS.grey} />
          )}
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.labelContainer}>
            <View style={styles.line} />
            <Text style={styles.sectionTitle}>Device Information</Text>
          </View>

          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={name}
            editable={false}
            placeholder="Device Name"
            placeholderTextColor="#888"
          />

          <TouchableOpacity style={styles.wifiButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.wifiButtonText}>Edit WiFi Settings</Text>
          </TouchableOpacity>

          <View style={styles.specsContainer}>
            <Text style={styles.specsTitle}>Specifications:</Text>
            <Text style={styles.specsText}>Type: {device.type || 'Unknown'}</Text>
            <Text style={styles.specsText}>Connectivity: {device.connectivity || 'Not Available'}</Text>
            <Text style={styles.specsText}>Power: {device.power ? `${device.power}W` : 'Unknown'}</Text>
            <Text style={styles.specsText}>Location: {device.location || 'Not Assigned'}</Text>
            <Text style={styles.specsText}>Group: {groupName || 'Not Assigned'}</Text>
            <Text style={styles.specsText}>Status: {device.status || 'Unknown'}</Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Update WiFi Settings</Text>

            <TextInput
              style={styles.input}
              value={wifiSSID}
              onChangeText={setWifiSSID}
              placeholder="WiFi SSID"
              placeholderTextColor="#888"
            />

            <TextInput
              style={styles.input}
              value={wifiPassword}
              onChangeText={setWifiPassword}
              placeholder="WiFi Password"
              placeholderTextColor="#888"
              secureTextEntry
            />

            <TouchableOpacity style={styles.saveButton} onPress={updateWiFiDetails}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    justifyContent: 'space-between',
    backgroundColor: COLORS.light,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 250,
    backgroundColor: COLORS.light,
    borderRadius: 10,
    margin: 15,
  },
  deviceImage: {
    width: '80%',
    height: '100%',
    resizeMode: 'contain',
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: COLORS.light,
    marginHorizontal: 10,
    borderRadius: 10,
    paddingVertical: 20,
    paddingHorizontal: 15,
    elevation: 2,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  line: {
    width: 25,
    height: 2,
    backgroundColor: COLORS.dark,
    marginRight: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  disabledInput: {
    backgroundColor: '#e0e0e0',
    color: '#888',
  },
  wifiButton: {
    backgroundColor: COLORS.green,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  wifiButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  specsContainer: {
    marginTop: 15,
  },
  specsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  specsText: {
    fontSize: 15,
    color: COLORS.dark,
    marginBottom: 3,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  saveButton: {
    backgroundColor: COLORS.green,
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButtonText: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
  },
});
