import React from 'react';
import { View, SafeAreaView, Image, Text, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import COLORS from '../config/colors';

export default function DeviceDetailsScreen({ navigation, route }) {
  // Retrieve the device parameter passed from the previous screen
  const { device } = route.params;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <Icon name="arrow-back" size={28} onPress={() => navigation.goBack()} />
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Device Image */}
        <View style={styles.imageContainer}>
          <Image source={device.img} style={{ resizeMode: 'contain', flex: 1 }} />
        </View>

        {/* Device Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.labelContainer}>
            <View style={styles.line} />
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Device Information</Text>
          </View>

          <View style={styles.titleContainer}>
            <Text style={{ fontSize: 22, fontWeight: 'bold' }}>{device.name}</Text>
          </View>

          <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold' }}>About</Text>
            <Text style={styles.aboutText}>{device.description}</Text>

            {/* Device Specifications */}
            <View style={styles.specsContainer}>
              <Text style={styles.specsTitle}>Specifications:</Text>
              <Text style={styles.specsText}>🆔 Device ID: {device.id}</Text>
              <Text style={styles.specsText}>⚙️ Type: {device.type}</Text>
              <Text style={styles.specsText}>📡 Connectivity: {device.connectivity}</Text>
              <Text style={styles.specsText}>⚡ Power: {device.power}W</Text>
              <Text style={styles.specsText}>📍 Location: {device.location}</Text>
              <Text style={styles.specsText}>🔵 Status: {device.status}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  imageContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: COLORS.light,
    marginHorizontal: 7,
    marginBottom: 7,
    borderRadius: 20,
    marginTop: 30,
    paddingTop: 30,
  },
  labelContainer: {
    marginLeft: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  line: {
    width: 25,
    height: 2,
    backgroundColor: COLORS.dark,
    marginBottom: 5,
    marginRight: 3,
  },
  titleContainer: {
    marginLeft: 20,
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aboutText: {
    color: 'grey',
    fontSize: 16,
    lineHeight: 22,
    marginTop: 10,
  },
  specsContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  specsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  specsText: {
    fontSize: 16,
    color: 'grey',
    marginBottom: 3,
  },
});
