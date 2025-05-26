import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { Text, Card } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import COLORS from '../config/colors';
import { collection, query, orderBy, limit, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function DashboardScreen({navigation, route, userId, onGroupChange }) {

  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const groupRef = collection(db, `users/${userId}/deviceGroups`);
        const snapshot = await getDocs(groupRef);
        const groupList = snapshot.docs.map(doc => doc.id);
        setGroups(groupList);

        if (groupList.length > 0) {
          setSelectedGroup(groupList[0]);
          if (onGroupChange) onGroupChange(groupList[0]); // ✅ update parent
        }
      } catch (err) {
        console.error("Failed to load groups:", err);
      }
    };

    fetchGroups();
  }, [userId]);

  useEffect(() => {
    if (!userId || !selectedGroup) return;

    setLoading(true);

    const q = query(
      collection(db, `users/${userId}/deviceGroups/${selectedGroup}/sensor_data`),
      orderBy("timestamp", "desc"),
      limit(7)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          temperature: data.temperature || 0,
          humidity: data.humidity || 0,
          pH: data.ph || 0,
          EC: data.water_level || 0,
          soilMoisture: data.light_intensity || 0,
          timestamp: data.timestamp?.toDate().toLocaleString() || "Unknown",
        };
      });

      setChartData({
        labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        datasets: [
          { data: fetchedData.map(d => d.temperature) },
          { data: fetchedData.map(d => d.humidity) },
          { data: fetchedData.map(d => d.pH) },
          { data: fetchedData.map(d => d.EC) },
          { data: fetchedData.map(d => d.soilMoisture) },
        ],
      });

      setLoading(false);
    }, (error) => {
      console.error("Firestore Query Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, selectedGroup]);

  const getStatusColor = (value, type) => {
    if (value === "N/A") return "gray";

    switch (type) {
      case "temperature": return value >= 18 && value <= 25 ? "green" : value < 18 || value > 30 ? "red" : "yellow";
      case "humidity": return value >= 50 && value <= 70 ? "green" : value < 40 || value > 80 ? "red" : "yellow";
      case "pH": return value >= 5.5 && value <= 6.5 ? "green" : value < 8.0 || value > 7.0 ? "yellow" : "red";
      case "EC": return value === "Normal" ? "green" : value === "critical" ? "red" : value === "Above Normal" ? "orange" : value === "below normal" ? "yellow" : "blue";
      case "soilMoisture": return value >= 10000 ? "green" : value < 5000 ? "red" : "yellow";
      default: return "blue";
    }
  };

  const getLatestReading = (index) => {
    return chartData?.datasets[index]?.data.slice(-1)[0] || "N/A";
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.groupPickerContainer}>
        <Text style={styles.title}>Select Group:</Text>
        <Picker
          selectedValue={selectedGroup}
          onValueChange={(itemValue) => {
            setSelectedGroup(itemValue);
            if (onGroupChange) onGroupChange(itemValue); // ✅ notify HomeScreen
            setLoading(true);
          }}
          style={styles.picker}
        >
          {groups.map((groupId) => (
            <Picker.Item label={groupId} value={groupId} key={groupId} />
          ))}
        </Picker>
      </View>

      <View style={styles.gridContainer}>
        <Card style={styles.card}
  onPress={() => navigation.navigate('Temperature', { userId, groupId: selectedGroup })}>
  <Card.Content style={styles.cardContent}>
    <Icon name="device-thermostat" size={30} color={COLORS.green} />
    <Text style={styles.cardTitle}>Temperature</Text>
    <View style={styles.cardTextRow}>
      <Text style={styles.cardText}>{getLatestReading(0)}°C</Text>
      <View style={[styles.statusDot, { backgroundColor: getStatusColor(getLatestReading(0), "temperature") }]} />
    </View>
  </Card.Content>
</Card>

<Card style={styles.card}
  onPress={() => navigation.navigate('Humidity', { userId, groupId: selectedGroup })}>
  <Card.Content style={styles.cardContent}>
    <Icon name="water-drop" size={30} color={COLORS.green} />
    <Text style={styles.cardTitle}>Humidity</Text>
    <View style={styles.cardTextRow}>
      <Text style={styles.cardText}>{getLatestReading(1)}%</Text>
      <View style={[styles.statusDot, { backgroundColor: getStatusColor(getLatestReading(1), "humidity") }]} />
    </View>
  </Card.Content>
</Card>

<Card style={styles.card}
  onPress={() => navigation.navigate('PhLevel', { userId, groupId: selectedGroup })}>
  <Card.Content style={styles.cardContent}>
    <Icon name="science" size={30} color={COLORS.green} />
    <Text style={styles.cardTitle}>pH Level</Text>
    <View style={styles.cardTextRow}>
      <Text style={styles.cardText}>{getLatestReading(2)}</Text>
      <View style={[styles.statusDot, { backgroundColor: getStatusColor(getLatestReading(2), "pH") }]} />
    </View>
  </Card.Content>
</Card>

<Card style={styles.card}
  onPress={() => navigation.navigate('EcLevel', { userId, groupId: selectedGroup })}>
  <Card.Content style={styles.cardContent}>
    <Icon name="water" size={30} color={COLORS.green} />
    <Text style={styles.cardTitle}>Water Level</Text>
    <View style={styles.cardTextRow}>
      <Text style={styles.cardText}>{getLatestReading(3)}</Text>
      <View style={[styles.statusDot, { backgroundColor: getStatusColor(getLatestReading(3), "EC") }]} />
    </View>
  </Card.Content>
</Card>

<Card style={styles.card}
  onPress={() => navigation.navigate('LightIntensity', { userId, groupId: selectedGroup })}>
  <Card.Content style={styles.cardContent}>
    <Icon name="wb-sunny" size={30} color={COLORS.green} />
    <Text style={styles.cardTitle}>Light Intensity</Text>
    <View style={styles.cardTextRow}>
      <Text style={styles.cardText}>{getLatestReading(4)} Lux</Text>
      <View style={[styles.statusDot, { backgroundColor: getStatusColor(getLatestReading(4), "soilMoisture") }]} />
    </View>
  </Card.Content>
</Card>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.lightGreen,
    padding: 20,
  },
  groupPickerContainer: {
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: COLORS.green,
  },
  picker: {
    backgroundColor: '#f0f0f0',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 10,
    marginVertical: 10,
    borderRadius: 12,
    elevation: 3,
    alignItems: 'center',
  },
  cardContent: {
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.green,
    marginTop: 5,
  },
  cardText: {
    fontSize: 19,
    color: '#555',
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 5,
  },
  cardTextRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 3,
},

});
