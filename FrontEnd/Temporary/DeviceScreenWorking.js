import React from 'react';
import { View, SafeAreaView, Image, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import COLORS from '../config/colors';

export default function DeviceDetailsScreen({ navigation, route }) {
  // Retrieve the device parameter passed from the previous screen
  const { device } = route.params || {};

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={28} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Device Details</Text>
        <TouchableOpacity onPress={() => alert('Edit feature coming soon!')}>
          <Icon name="edit" size={24} color={COLORS.dark} />
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

        {/* Device Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.labelContainer}>
            <View style={styles.line} />
            <Text style={styles.sectionTitle}>Device Information</Text>
          </View>

          <Text style={styles.deviceName}>{device.name || 'Unknown Device'}</Text>

          {/* About Section */}
          <View style={styles.aboutContainer}>
            <Text style={styles.subTitle}>About</Text>
            <Text style={styles.aboutText}>
              {device.description || 'No description available for this device.'}
            </Text>
          </View>

          {/* Device Specifications */}
          <View style={styles.specsContainer}>
            <Text style={styles.specsTitle}>Specifications:</Text>
            <Text style={styles.specsText}>🆔 Device ID: {device.id || 'N/A'}</Text>
            <Text style={styles.specsText}>⚙️ Type: {device.type || 'Unknown'}</Text>
            <Text style={styles.specsText}>📡 Connectivity: {device.connectivity || 'Not Available'}</Text>
            <Text style={styles.specsText}>⚡ Power: {device.power ? `${device.power}W` : 'Unknown'}</Text>
            <Text style={styles.specsText}>📍 Location: {device.location || 'Not Assigned'}</Text>
            <Text style={styles.specsText}>🔵 Status: {device.status || 'Unknown'}</Text>
          </View>
        </View>
      </ScrollView>
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
  deviceName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  aboutContainer: {
    marginTop: 10,
    paddingBottom: 10,
  },
  subTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  aboutText: {
    fontSize: 16,
    color: COLORS.grey,
    lineHeight: 22,
  },
  specsContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    elevation: 3,
  },
  specsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  specsText: {
    fontSize: 16,
    color: COLORS.grey,
    marginBottom: 5,
  },
});

