import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { Text, Card } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LineChart } from 'react-native-chart-kit';
import COLORS from '../config/colors';

export default function DashboardScreen({ navigation }) {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated data for multiple readings
    setTimeout(() => {
      const newData = {
        labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        datasets: [
          { 
            data: [20, 21, 22, 23, 22, 21, 24], 
            label: "Temperature (°C)",
            color: (opacity = 1) => `rgba(255, 99, 132, ${opacity * 0.6})` // Red color
          },
          { 
            data: [50, 55, 53, 57, 56, 54, 58], 
            label: "Humidity (%)",
            color: (opacity = 1) => `rgba(54, 162, 235, ${opacity * 0.6})` // Blue color
          },
          { 
            data: [6.8, 6.9, 6.8, 6.7, 6.8, 6.9, 6.8], 
            label: "pH Level",
            color: (opacity = 1) => `rgba(75, 192, 192, ${opacity * 0.6})` // Green color
          },
          { 
            data: [2.0, 2.1, 2.0, 2.2, 2.1, 2.0, 2.3], 
            label: "EC Level (mS/cm)",
            color: (opacity = 1) => `rgba(255, 206, 86, ${opacity * 0.6})` // Yellow color
          },
          { 
            data: [70, 72, 68, 74, 71, 73, 75], 
            label: "Soil Moisture (%)",
            color: (opacity = 1) => `rgba(153, 102, 255, ${opacity * 0.6})` // Light Purple
          },
      ],
      };
      setChartData(newData);
      setLoading(false);
    }, 1000); // Simulate a network delay
  }, []);
  // // Extract latest readings from the chart data
  // const getLatestReading = (index) => {
  //   return chartData?.datasets[index]?.data.slice(-1)[0] || "N/A";
  // };

  const getStatusColor = (value) => {
    if (value === 'Optimal' || value === '25°C') {
      return 'green'; // Green for optimal status
    } else if (value === '55%' || value === '6.8 (Optimal)') {
      return 'yellow'; // Yellow for warning status
    } else {
      return 'red'; // Red for critical status
    }
  };

  return (
    
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.chartContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.green} />
        ) : (
          <LineChart
            data={chartData}
            width={Dimensions.get("window").width - 40}
            height={220}
            yAxisSuffix=""
            chartConfig={{
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(0, 128, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: "6", strokeWidth: "2", stroke: COLORS.green },
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
          />
        )}
      </View>

      
      {/* Header with Back Arrow and Title
      <View style={styles.header}>
        <Icon name="arrow-back" size={28} color="#fff" onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Dashboard</Text>
      </View> */}

      {/* Cards Grid */}
      <View style={styles.gridContainer}>
        {/* Soil Moisture */}
        <Card style={styles.card} onPress={() => navigation.navigate('SoilMoisture')}>
          <Card.Content style={styles.cardContent}>
            <Icon name="opacity" size={30} color={COLORS.green} />
            <Text style={styles.cardTitle}>Soil Moisture</Text>
            <Text style={styles.cardText}>
              (78%) <View style={[styles.statusDot, { backgroundColor: getStatusColor('Optimal') }]} />
            </Text>
          </Card.Content>
        </Card>

        {/* Temperature */}
        <Card style={styles.card} onPress={() => navigation.navigate('Temperature')}>
          <Card.Content style={styles.cardContent}>
            <Icon name="device-thermostat" size={30} color={COLORS.green} />
            <Text style={styles.cardTitle}>Temperature</Text>
            <Text style={styles.cardText}>
              25°C <View style={[styles.statusDot, { backgroundColor: getStatusColor('25°C') }]} />
            </Text>
          </Card.Content>
        </Card>

        {/* Humidity */}
        <Card style={styles.card} onPress={() => navigation.navigate('Humidity')}>
          <Card.Content style={styles.cardContent}>
            <Icon name="water-drop" size={30} color={COLORS.green} />
            <Text style={styles.cardTitle}>Humidity</Text>
            <Text style={styles.cardText}>
              (55%) <View style={[styles.statusDot, { backgroundColor: getStatusColor('55%') }]} />
            </Text>
          </Card.Content>
        </Card>

        {/* pH Level */}
        <Card style={styles.card} onPress={() => navigation.navigate('PhLevel')}>
          <Card.Content style={styles.cardContent}>
            <Icon name="science" size={30} color={COLORS.green} />
            <Text style={styles.cardTitle}>pH Level</Text>
            <Text style={styles.cardText}>
              6.8 <View style={[styles.statusDot, { backgroundColor: getStatusColor('6.8 (Optimal)') }]} />
            </Text>
          </Card.Content>
        </Card>

        {/* EC Level */}
        <Card style={styles.card} onPress={() => navigation.navigate('EcLevel')}>
          <Card.Content style={styles.cardContent}>
            <Icon name="electrical-services" size={30} color={COLORS.green} />
            <Text style={styles.cardTitle}>EC Level</Text>
            <Text style={styles.cardText}>
              2.0 mS/cm <View style={[styles.statusDot, { backgroundColor: getStatusColor('2.0 mS/cm (Optimal)') }]} />
            </Text>
          </Card.Content>
        </Card>
      </View>
      
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    marginVertical: 20,
    elevation: 5,
  },
  
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.lightGreen,  // Set background color to light green
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.green,  // Use the same green for header background
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%', // Make it 2-column layout
    backgroundColor: '#fff',
    padding: 10,
    marginVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  cardContent: {
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: 'bold',
    color: COLORS.green,  // Use green color for title
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
});
