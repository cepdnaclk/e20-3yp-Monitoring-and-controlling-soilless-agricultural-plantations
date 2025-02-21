import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import COLORS from '../config/colors';
import devicesData from '../config/devices'; // Import predefined devices

export default function DeviceScreen() {
  const [deviceName, setDeviceName] = useState('');
  const [devices, setDevices] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const storedDevices = await AsyncStorage.getItem('devices');
      if (storedDevices) {
        setDevices([...devicesData, ...JSON.parse(storedDevices)]);
      } else {
        setDevices(devicesData);
      }
    } catch (error) {
      console.log('Error loading devices:', error);
    }
  };

  const addDevice = async () => {
    if (!deviceName.trim()) {
      Alert.alert('Error', 'Device name cannot be empty');
      return;
    }

    const newDevice = {
      id: Date.now().toString(),
      name: deviceName,
      type: 'Custom Device', // Placeholder
      status: 'Unknown',
      connectivity: 'Unknown',
      icon: 'device-thermostat',
    };

    const updatedDevices = [...devices, newDevice];
    setDevices(updatedDevices);
    await AsyncStorage.setItem('devices', JSON.stringify(updatedDevices));
    setDeviceName('');
  };

  const removeDevice = async (id) => {
    const updatedDevices = devices.filter(device => device.id !== id);
    setDevices(updatedDevices);
    await AsyncStorage.setItem('devices', JSON.stringify(updatedDevices));
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

      <FlatList
  data={devices}
  keyExtractor={(item, index) => `${item.id}-${index}`} // Ensure uniqueness
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
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  deviceIcon: { marginRight: 10 },
  deviceText: { color: '#333', fontSize: 18 },
  deleteText: { color: 'red', fontSize: 16 },
});
