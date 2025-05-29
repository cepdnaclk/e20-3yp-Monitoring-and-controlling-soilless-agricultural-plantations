import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Card } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import { LineChart } from 'react-native-chart-kit';
import COLORS from '../config/colors';
import { collection, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function DashboardScreen({ navigation, route, userId, onGroupChange }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [historyChartData, setHistoryChartData] = useState(null);
  const screenWidth = Dimensions.get('window').width;


  useEffect(() => {
    const fetchGroups = async () => {
      const groupRef = collection(db, `users/${userId}/deviceGroups`);
      const snapshot = await getDocs(groupRef);
      const groupList = snapshot.docs.map(doc => doc.id);
      setGroups(groupList);
      if (groupList.length > 0) {
        setSelectedGroup(groupList[0]);
        if (onGroupChange) onGroupChange(groupList[0]);
      }
    };
    fetchGroups();
  }, [userId]);

  useEffect(() => {
    if (!userId || !selectedGroup) return;

    const realtimeQuery = query(
      collection(db, `users/${userId}/deviceGroups/${selectedGroup}/sensor_data`),
      orderBy('timestamp', 'desc'),
      limit(7)
    );

    const unsubscribeRealtime = onSnapshot(realtimeQuery, snapshot => {
      const data = snapshot.docs.map(doc => doc.data());
      setChartData({
        labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        datasets: [
          { data: data.map(d => d.temperature || 0) },
          { data: data.map(d => d.humidity || 0) },
          { data: data.map(d => d.ph || 0) },
          { data: data.map(d => d.water_level || 0) },
          { data: data.map(d => d.light_intensity || 0) },
        ],
      });
    });

    const historyQuery = query(
      collection(db, `users/${userId}/deviceGroups/${selectedGroup}/sensor_history`),
      orderBy('timestamp', 'desc'),
      limit(24)
    );

    const unsubscribeHistory = onSnapshot(historyQuery, snapshot => {
  const historyData = snapshot.docs
    .filter(doc => doc.data().timestamp)
    .map(doc => {
      const d = doc.data();
      return {
        temperature: d.temperature || 0,
        humidity: d.humidity || 0,
        ph: d.ph || 0,
        water_level: d.water_level || 0,
        timestamp: d.timestamp.toDate(),
      };
    });

  if (historyData.length === 0) {
    // Set dummy flatline data if no history data
    const dummyLabels = Array(12).fill('').map((_, i) => `${i}:00`);
    const dummyValues = Array(12).fill(0);
    setHistoryChartData({
      labels: dummyLabels,
      datasets: [
        {
          data: dummyValues,
          color: () => COLORS.green,
          strokeWidth: 2,
          label: 'Temperature'
        },
        {
          data: dummyValues,
          color: () => 'rgba(0, 0, 255, 1)',
          strokeWidth: 2,
          label: 'Humidity'
        },
        {
          data: dummyValues,
          color: () => 'rgb(120, 43, 43)',
          strokeWidth: 2,
          label: 'pH Level'
        }
      ],
      legend: ['Temperature', 'Humidity', 'pH Level']
    });
    return;
  }

  setHistoryChartData({
    labels: historyData.map(d =>
      d.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    ),
    datasets: [
      {
        data: historyData.map(d => d.temperature),
        color: () => COLORS.green,
        strokeWidth: 2,
        label: 'Temperature'
      },
      {
        data: historyData.map(d => d.humidity),
        color: () => 'rgba(0, 0, 255, 1)',
        strokeWidth: 2,
        label: 'Humidity'
      },
      {
        data: historyData.map(d => d.ph),
        color: () => 'rgb(120, 43, 43)',
        strokeWidth: 2,
        label: 'pH Level'
      }
    ],
    legend: ['Temperature', 'Humidity','pH Level']
  });
});


    return () => {
      unsubscribeRealtime();
      unsubscribeHistory();
    };
  }, [userId, selectedGroup]);

  const getLatestReading = index =>
    chartData?.datasets[index]?.data.slice(-1)[0] || 'N/A';

  const getStatusColor = (value, type) => {
    if (value === 'N/A') return 'gray';
    switch (type) {
      case 'temperature':
        return value >= 18 && value <= 25 ? 'green' : value < 18 || value > 30 ? 'red' : 'yellow';
      case 'humidity':
        return value >= 50 && value <= 70 ? 'green' : value < 40 || value > 80 ? 'red' : 'yellow';
      case 'pH':
        return value >= 5.5 && value <= 6.5 ? 'green' : value < 5.5 || value > 7 ? 'yellow' : 'red';
      case 'EC':
        return value === 'Normal' ? 'green' : value === 'critical' ? 'red' : 'yellow';
      case 'soilMoisture':
        return value >= 10000 ? 'green' : value < 5000 ? 'red' : 'yellow';
      default:
        return 'blue';
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.groupPickerContainer}>
  <Text style={styles.title}>Select Device Group</Text>
  <Picker
    selectedValue={selectedGroup}
    onValueChange={(itemValue) => {
      setSelectedGroup(itemValue);
      if (onGroupChange) onGroupChange(itemValue);
    }}
    style={styles.picker}
  >
    {groups.map((groupId, index) => (
      <Picker.Item label={groupId} value={groupId} key={index} />
    ))}
  </Picker>
</View>

      {historyChartData && (
  <View style={{ marginBottom: 20 }}>
    <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
      Hourly Temperature & Humidity
    </Text>
    
    <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ width: screenWidth * 3 }}
      style={{ height: 280 }} // Increase height slightly
    >
      {/* Temperature Chart */}
      <View style={{ 
        width: Dimensions.get('window').width - 40,
        paddingHorizontal: 10,
        alignItems: 'center'
      }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 5 }}>🌡 Temperature (°C)</Text>
        <LineChart
          data={{
            labels: historyChartData.labels.map(label => 
              label.length > 5 ? label.substring(0, 5) : label
            ),
            datasets: [historyChartData.datasets[0]],
          }}
          width={Dimensions.get('window').width - 80} // More padding
          height={220}
          chartConfig={{
            backgroundGradientFrom: '#f0f0f0',
            backgroundGradientTo: '#f0f0f0',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            labelColor: () => '#333',
            style: { 
              borderRadius: 10,
              paddingRight: 40, // Increase right padding
            },
            propsForLabels: {
              fontSize: 10,
              paddingLeft: 0,
              paddingRight: 10,
              rotation: 0,
            },
            propsForBackgroundLines: {
              strokeDasharray: '',
            },
          }}
          bezier
          style={{ 
            borderRadius: 16,
            marginVertical: 8,
          }}
          withHorizontalLabels={true}
          withVerticalLabels={true}
          fromZero={false}
        />
      </View>

      {/* Ph Chart */}
      <View style={{ 
        width: Dimensions.get('window').width - 40,
        paddingHorizontal: 10,
        alignItems: 'center'
      }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 5 }}>ph Level</Text>
        <LineChart
          data={{
            labels: historyChartData.labels.map(label => 
              label.length > 5 ? label.substring(0, 5) : label
            ),
            datasets: [historyChartData.datasets[2]],
          }}
          width={Dimensions.get('window').width - 80} // More padding
          height={220}
          chartConfig={{
            backgroundGradientFrom: '#f0f0f0',
            backgroundGradientTo: '#f0f0f0',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            labelColor: () => '#333',
            style: { 
              borderRadius: 10,
              paddingRight: 40, // Increase right padding
            },
            propsForLabels: {
              fontSize: 10,
              paddingLeft: 0,
              paddingRight: 10,
              rotation: 0,
            },
            propsForBackgroundLines: {
              strokeDasharray: '',
            },
          }}
          bezier
          style={{ 
            borderRadius: 16,
            marginVertical: 8,
          }}
          withHorizontalLabels={true}
          withVerticalLabels={true}
          fromZero={false}
        />
      </View>

      {/* Humidity Chart */}
      <View style={{ 
        width: Dimensions.get('window').width - 40,
        paddingHorizontal: 10,
        alignItems: 'center'
      }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 5 }}>💧 Humidity (%)</Text>
        <LineChart
          data={{
            labels: historyChartData.labels.map(label => 
              label.length > 5 ? label.substring(0, 5) : label
            ),
            datasets: [historyChartData.datasets[1]],
          }}
          width={Dimensions.get('window').width - 80} // More padding
          height={220}
          chartConfig={{
            backgroundGradientFrom: '#f0f0f0',
            backgroundGradientTo: '#f0f0f0',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            labelColor: () => '#333',
            style: { 
              borderRadius: 16,
              paddingRight: 40, // Increase right padding
            },
            propsForLabels: {
              fontSize: 10,
              paddingLeft: 0,
              paddingRight: 10,
              rotation: 0,
            },
            propsForBackgroundLines: {
              strokeDasharray: '',
            },
          }}
          bezier
          style={{ 
            borderRadius: 16,
            marginVertical: 8,
          }}
          withHorizontalLabels={true}
          withVerticalLabels={true}
          fromZero={false}
        />
      </View>
    </ScrollView>
  </View>
)}



      <View style={styles.gridContainer}>
        {[
          { name: 'Temperature', icon: 'device-thermostat', value: getLatestReading(0), type: 'temperature', screen: 'Temperature', suffix: '°C' },
          { name: 'Humidity', icon: 'water-drop', value: getLatestReading(1), type: 'humidity', screen: 'Humidity', suffix: '%' },
          { name: 'pH Level', icon: 'science', value: getLatestReading(2), type: 'pH', screen: 'PhLevel', suffix: '' },
          { name: 'Water Level', icon: 'water', value: getLatestReading(3), type: 'EC', screen: 'EcLevel', suffix: '' },
          { name: 'Light Intensity', icon: 'wb-sunny', value: getLatestReading(4), type: 'soilMoisture', screen: 'LightIntensity', suffix: ' Lux' },
        ].map((param, index) => (
          <Card
            key={index}
            style={styles.card}
            onPress={() => navigation.navigate(param.screen, { userId, groupId: selectedGroup })}
          >
            <Card.Content style={styles.cardContent}>
              <Icon name={param.icon} size={30} color={COLORS.green} />
              <Text style={styles.cardTitle}>{param.name}</Text>
              <View style={styles.cardTextRow}>
                <Text style={styles.cardText}>{param.value}{param.suffix}</Text>
                <View
                  style={[styles.statusDot, { backgroundColor: getStatusColor(param.value, param.type) }]}
                />
              </View>
            </Card.Content>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.lightGreen, padding: 20 },
  groupPickerContainer: { marginBottom: 20, backgroundColor: '#fff', padding: 10, borderRadius: 10 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 5, color: COLORS.green },
  picker: { backgroundColor: '#f0f0f0' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#fff', padding: 10, marginVertical: 10, borderRadius: 12, elevation: 3, alignItems: 'center' },
  cardContent: { alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.green, marginTop: 5 },
  cardText: { fontSize: 19, color: '#555', marginTop: 3 },
  cardTextRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 5 },

  
});
