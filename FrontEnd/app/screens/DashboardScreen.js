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

  const levelMap = {
    critical: 1,
    low: 2,
    normal: 3
  };

  useEffect(() => {
  if (!userId) return;

  const groupRef = collection(db, `users/${userId}/deviceGroups`);
  const unsubscribe = onSnapshot(groupRef, (snapshot) => {
    const groupList = snapshot.docs.map(doc => doc.id);
    setGroups(groupList);

    // Auto-select first group if none selected
    if (!selectedGroup && groupList.length > 0) {
      setSelectedGroup(groupList[0]);
      if (onGroupChange) onGroupChange(groupList[0]);
    }
  }, (error) => {
    console.error('Error listening to groups:', error);
  });

  return () => unsubscribe(); // Clean up listener on unmount
}, [userId]);


  useEffect(() => {
    if (!userId || !selectedGroup) return;

    const realtimeQuery = query(
      collection(db, `users/${userId}/deviceGroups/${selectedGroup}/sensor_data`),
      orderBy('timestamp', 'desc'),
      limit(7)
    );

    const unsubscribeRealtime = onSnapshot(realtimeQuery, snapshot => {
      try {
        const data = snapshot.docs.map(doc => doc.data());
        setChartData({
          labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          datasets: [
            { data: data.map(d => d.temperature || 0) },
            { data: data.map(d => d.humidity || 0) },
            { data: data.map(d => d.ph || 0) },
            { data: data.map(d => d.water_level || 0) },
            { data: data.map(d => d.light_intensity || 0) },
            { data: data.map(d => d.ec || 0) },
          ],
        });
      } catch (error) {
        console.error('Error processing realtime data:', error);
        // Set fallback data to prevent crashes
        setChartData({
          labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          datasets: [
            { data: [0, 0, 0, 0, 0, 0, 0] },
            { data: [0, 0, 0, 0, 0, 0, 0] },
            { data: [0, 0, 0, 0, 0, 0, 0] },
            { data: [0, 0, 0, 0, 0, 0, 0] },
            { data: [0, 0, 0, 0, 0, 0, 0] },
            { data: [0, 0, 0, 0, 0, 0, 0] },
          ],
        });
      }
    }, error => {
      console.error('Error fetching realtime data:', error);
      // Set fallback data on permission error
      setChartData({
        labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        datasets: [
          { data: [0, 0, 0, 0, 0, 0, 0] },
          { data: [0, 0, 0, 0, 0, 0, 0] },
          { data: [0, 0, 0, 0, 0, 0, 0] },
          { data: [0, 0, 0, 0, 0, 0, 0] },
          { data: [0, 0, 0, 0, 0, 0, 0] },
          { data: [0, 0, 0, 0, 0, 0, 0] },
        ],
      });
    });

    const historyQuery = query(
      collection(db, `users/${userId}/deviceGroups/${selectedGroup}/sensor_history`),
      orderBy('timestamp', 'desc'),
      limit(24)
    );

    const unsubscribeHistory = onSnapshot(historyQuery, snapshot => {
      try {
        const historyData = snapshot.docs
          .filter(doc => doc.data().timestamp)
          .map(doc => {
            const d = doc.data();
            return {
              temperature: d.temperature || 0,
              humidity: d.humidity || 0,
              ph: d.ph || 0,
              water_level: d.water_level || 0,
              light_intensity: d.light_intensity || 0,
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
              },
              {
                data: dummyValues,
                color: () => 'rgb(182, 32, 190)',
                strokeWidth: 2,
                label: 'Light Intensity'
              },
              {
                data: dummyValues,
                color: () => 'rgb(25, 118, 210)',
                strokeWidth: 2,
                label: 'Water Level'
              }
            ],
            legend: ['Temperature', 'Humidity', 'pH Level', 'Light Intensity', 'Water Level']
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
            },
            {
              data: historyData.map(d => d.light_intensity),
              color: () => 'rgb(182, 32, 190)',
              strokeWidth: 2,
              label: 'Light Intensity'
            },
            {
              data: historyData.map(d => levelMap[(d.water_level || "").toString().trim().toLowerCase()] || 0),
              color: () => 'rgb(25, 118, 210)',
              strokeWidth: 2,
              label: 'Water Level (1: Critical, 2: Low, 3: Normal)'
            }
          ],
          legend: ['Temperature', 'Humidity', 'pH Level', 'Light Intensity', 'Water Level']
        });
      } catch (error) {
        console.error('Error processing history data:', error);
        // Set fallback data
        const dummyLabels = Array(12).fill('').map((_, i) => `${i}:00`);
        const dummyValues = Array(12).fill(0);
        setHistoryChartData({
          labels: dummyLabels,
          datasets: [
            { data: dummyValues, color: () => COLORS.green, strokeWidth: 2 },
            { data: dummyValues, color: () => 'rgba(0, 0, 255, 1)', strokeWidth: 2 },
            { data: dummyValues, color: () => 'rgb(120, 43, 43)', strokeWidth: 2 },
            { data: dummyValues, color: () => 'rgb(182, 32, 190)', strokeWidth: 2 },
            { data: dummyValues, color: () => 'rgb(25, 118, 210)', strokeWidth: 2 }
          ],
          legend: ['Temperature', 'Humidity', 'pH Level', 'Light Intensity', 'Water Level']
        });
      }
    }, error => {
      console.error('Error fetching history data:', error);
      // Set fallback data on permission error
      const dummyLabels = Array(12).fill('').map((_, i) => `${i}:00`);
      const dummyValues = Array(12).fill(0);
      setHistoryChartData({
        labels: dummyLabels,
        datasets: [
          { data: dummyValues, color: () => COLORS.green, strokeWidth: 2 },
          { data: dummyValues, color: () => 'rgba(0, 0, 255, 1)', strokeWidth: 2 },
          { data: dummyValues, color: () => 'rgb(120, 43, 43)', strokeWidth: 2 },
          { data: dummyValues, color: () => 'rgb(182, 32, 190)', strokeWidth: 2 },
          { data: dummyValues, color: () => 'rgb(25, 118, 210)', strokeWidth: 2 }
        ],
        legend: ['Temperature', 'Humidity', 'pH Level', 'Light Intensity', 'Water Level']
      });
    });

    return () => {
      unsubscribeRealtime();
      unsubscribeHistory();
    };
  }, [userId, selectedGroup]);

  const getLatestReading = index => {
    if (!chartData?.datasets[index]?.data) return 'N/A';
    const latestValue = chartData.datasets[index].data.slice(-1)[0];
    return latestValue !== undefined ? latestValue : 'N/A';
  };

  const getStatusColor = (value, type) => {
    if (value === 'N/A' || value === undefined || value === null) return 'gray';
    
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    switch (type) {
      case 'temperature':
        if (isNaN(numValue)) return 'gray';
        return numValue >= 18 && numValue <= 25 ? 'green' : numValue < 18 || numValue > 30 ? 'red' : 'yellow';
      case 'humidity':
        if (isNaN(numValue)) return 'gray';
        return numValue >= 50 && numValue <= 70 ? 'green' : numValue < 40 || numValue > 80 ? 'red' : 'yellow';
      case 'pH':
        if (isNaN(numValue)) return 'gray';
        return numValue >= 5.5 && numValue <= 6.5 ? 'green' : numValue < 5.5 || numValue > 7 ? 'yellow' : 'red';
      case 'EC':
        const ecStr = value.toString().toLowerCase();
        return ecStr === 'normal' ? 'green' : ecStr === 'critical' ? 'red' : 'yellow';
      case 'soilMoisture':
        if (isNaN(numValue)) return 'gray';
        return numValue >= 10000 ? 'green' : numValue < 5000 ? 'red' : 'yellow';
      case 'Water Level':
        const waterStr = value.toString().toLowerCase();
        return waterStr === 'normal' ? 'green' : waterStr === 'critical' ? 'red' : 'yellow';
      default:
        return 'blue';
    }
  };

  const renderChart = (title, emoji, datasetIndex, yAxisSuffix = '') => {
    // Safety check to ensure data exists before rendering
    if (!historyChartData?.datasets?.[datasetIndex]?.data || 
        !historyChartData?.labels || 
        historyChartData.datasets[datasetIndex].data.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>{emoji} {title} {yAxisSuffix}</Text>
          <View style={styles.noChartDataContainer}>
            <Text style={styles.noChartDataText}>No data available</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{emoji} {title} {yAxisSuffix}</Text>
        <LineChart
          data={{
            labels: historyChartData.labels.map((label, index) =>
              index % 4 === 0 ? label.substring(0, 5) : ''
            ),
            datasets: [historyChartData.datasets[datasetIndex]],
          }}
          width={screenWidth - 80}
          height={220}
          chartConfig={{
            backgroundGradientFrom: '#f0f0f0',
            backgroundGradientTo: '#f0f0f0',
            decimalPlaces: datasetIndex === 4 ? 0 : 1, // Water level should show integers
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            labelColor: () => '#333',
            style: {
              borderRadius: 10,
              paddingRight: 40,
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
          style={styles.chartStyle}
          withHorizontalLabels={true}
          withVerticalLabels={true}
          fromZero={datasetIndex === 4} // Only water level starts from zero
        />
      </View>
    );
  };

  if (!userId) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No user ID provided</Text>
      </View>
    );
  }

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

      {historyChartData && historyChartData.datasets && historyChartData.datasets.length > 0 ? (
        <View style={styles.chartsContainer}>
          <Text style={styles.sectionTitle}>Hourly Sensor Data</Text>
          
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ width: screenWidth * 5 }}
            style={styles.horizontalScrollView}
          >
            {renderChart('Temperature', '🌡', 0, '(°C)')}
            {renderChart('pH Level', '🧪', 2)}
            {renderChart('Humidity', '💧', 1, '(%)')}
            {renderChart('Light Intensity', '☀️', 3, '(Lux)')}
            {historyChartData.datasets.length > 4 && renderChart('Water Level', '🚰', 4, '(1: Critical, 2: Low, 3: Normal)')}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>
            📉 Loading sensor data... If this persists, check your Firebase permissions.
          </Text>
        </View>
      )}

      <View style={styles.gridContainer}>
        {[
          { name: 'Temperature', icon: 'device-thermostat', value: getLatestReading(0), type: 'temperature', screen: 'Temperature', suffix: '°C' },
          { name: 'Humidity', icon: 'water-drop', value: getLatestReading(1), type: 'humidity', screen: 'Humidity', suffix: '%' },
          { name: 'pH Level', icon: 'science', value: getLatestReading(2), type: 'pH', screen: 'PhLevel', suffix: '' },
          { name: 'EC', icon: 'flash-on', value: getLatestReading(5), type: 'EC', screen: 'EcLevel', suffix: '' },
          { name: 'Light Intensity', icon: 'wb-sunny', value: getLatestReading(4), type: 'soilMoisture', screen: 'LightIntensity', suffix: ' Lux' },
          { name: 'Water Level', icon: 'water', value: getLatestReading(3), type: 'Water Level', screen: 'WaterLevel', suffix: '' },
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
                <Text style={styles.cardText}>
                  {param.value !== 'N/A' ? param.value : 'N/A'}{param.value !== 'N/A' ? param.suffix : ''}
                </Text>
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
  container: { 
    flexGrow: 1, 
    backgroundColor: COLORS.lightGreen, 
    padding: 20 
  },
  groupPickerContainer: { 
    marginBottom: 20, 
    backgroundColor: '#fff', 
    padding: 10, 
    borderRadius: 10 
  },
  title: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 5, 
    color: COLORS.green 
  },
  picker: { 
    backgroundColor: '#f0f0f0' 
  },
  chartsContainer: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.green
  },
  horizontalScrollView: {
    height: 280
  },
  chartContainer: {
    width: Dimensions.get('window').width - 40,
    paddingHorizontal: 10,
    alignItems: 'center'
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: COLORS.green
  },
  chartStyle: {
    borderRadius: 16,
    marginVertical: 8,
  },
  noDataContainer: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 20
  },
  noDataText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center'
  },
  gridContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between' 
  },
  card: { 
    width: '48%', 
    backgroundColor: '#fff', 
    padding: 10, 
    marginVertical: 10, 
    borderRadius: 12, 
    elevation: 3, 
    alignItems: 'center' 
  },
  cardContent: { 
    alignItems: 'center' 
  },
  cardTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: COLORS.green, 
    marginTop: 5 
  },
  cardText: { 
    fontSize: 19, 
    color: '#555', 
    marginTop: 3 
  },
  cardTextRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 3 
  },
  statusDot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    marginLeft: 5 
  },
  noChartDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    marginVertical: 8,
  },
  noChartDataText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGreen
  },
  errorText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center'
  }
});