import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import COLORS from '../config/colors';

const screenWidth = Dimensions.get("window").width;

// Mapping qualitative water levels to numeric values for charting
const levelMap = {
  critical: 1,
  low: 2,
  normal: 3
};

export default function WaterLevelScreen({ route }) {
  const { userId, groupId } = route.params;

  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentWaterLevel, setCurrentWaterLevel] = useState("N/A");

  // Initialize with default data to prevent crashes
  const defaultChartData = {
    labels: Array(6).fill(''),
    datasets: [{
      data: Array(6).fill(0),
      color: (opacity = 1) => `rgba(30, 144, 255, ${opacity})`,
      strokeWidth: 2,
    }],
    legend: ["Water Level Status (1: Critical, 2: Low, 3: Normal)"]
  };

  useEffect(() => {
    if (!userId || !groupId) {
      setLoading(false);
      return;
    }

    // Fetch historical water level states
    const q = query(
      collection(db, `users/${userId}/deviceGroups/${groupId}/sensor_history`),
      orderBy("timestamp", "desc"),
      limit(24)
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      try {
        if (snapshot.empty) {
          console.log("No water level data found");
          setChartData(defaultChartData);
          setCurrentWaterLevel("N/A");
          setLoading(false);
          return;
        }

        const cleanData = snapshot.docs
          .filter(doc => {
            const data = doc.data();
            return data.timestamp && data.water_level !== undefined && data.water_level !== null;
          })
          .map(doc => {
            const d = doc.data();
            const state = (d.water_level || "").toString().trim().toLowerCase();
            
            // Get numeric value for chart
            let waterLevel = levelMap[state];
            
            // Ensure water level is a valid number
            if (waterLevel === undefined || isNaN(waterLevel) || !isFinite(waterLevel)) {
              waterLevel = 0;
            }

            return {
              waterLevel: waterLevel,
              label: state.charAt(0).toUpperCase() + state.slice(1) || "Unknown",
              timestamp: d.timestamp.toDate()
            };
          })
          .reverse(); // Oldest to newest

        if (cleanData.length === 0) {
          console.log("No valid water level data after filtering");
          setChartData(defaultChartData);
          setCurrentWaterLevel("N/A");
          setLoading(false);
          return;
        }

        // Set current water level state
        const latestData = cleanData[cleanData.length - 1];
        if (latestData && latestData.label) {
          setCurrentWaterLevel(latestData.label);
        } else {
          setCurrentWaterLevel("N/A");
        }

        // Ensure we have at least 2 data points for the chart
        const paddedData = [...cleanData];
        
        // Pad with zeros if we have less than 2 points
        while (paddedData.length < 2) {
          paddedData.push({
            waterLevel: 0,
            label: "Unknown",
            timestamp: new Date()
          });
        }

        const validData = paddedData.map(d => {
          const level = parseFloat(d.waterLevel);
          return isNaN(level) || !isFinite(level) ? 0 : level;
        });

        // Double-check all values are valid numbers
        const hasInvalidData = validData.some(val => 
          val === null || val === undefined || isNaN(val) || !isFinite(val)
        );

        if (hasInvalidData) {
          console.log("Found invalid water level data, using default");
          setChartData(defaultChartData);
          setLoading(false);
          return;
        }

        setChartData({
          labels: paddedData.map((d, index) =>
            index % Math.max(1, Math.floor(paddedData.length / 6)) === 0
              ? d.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : ""
          ),
          datasets: [
            {
              data: validData,
              color: (opacity = 1) => `rgba(30, 144, 255, ${opacity})`,
              strokeWidth: 2,
            }
          ],
          legend: ["Water Level Status (1: Critical, 2: Low, 3: Normal)"]
        });

        setLoading(false);
      } catch (error) {
        console.error("❌ Error processing water level data:", error);
        setChartData(defaultChartData);
        setCurrentWaterLevel("N/A");
        setLoading(false);
      }
    }, error => {
      console.error("❌ Error fetching water level data:", error);
      setChartData(defaultChartData);
      setCurrentWaterLevel("N/A");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, groupId]);

  // Don't render chart until we have valid data
  const shouldRenderChart = chartData && 
    chartData.datasets && 
    chartData.datasets[0] && 
    chartData.datasets[0].data && 
    chartData.datasets[0].data.length >= 2 &&
    chartData.datasets[0].data.every(val => 
      typeof val === 'number' && isFinite(val) && !isNaN(val)
    );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Water Level Monitoring</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading water level data...</Text>
        </View>
      ) : shouldRenderChart ? (
        <LineChart
          data={chartData}
          width={screenWidth - 40}
          height={220}
          yAxisSuffix=""
          yAxisInterval={1}
          chartConfig={{
            backgroundColor: "#f5f5f5",
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(30, 144, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 10 },
            propsForDots: { r: "5", strokeWidth: "2", stroke: "#1E90FF" },
          }}
          bezier
          style={{ marginVertical: 10, borderRadius: 10 }}
        />
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>📊 No water level data available</Text>
          <Text style={styles.noDataSubtext}>Check back later or ensure sensors are connected</Text>
        </View>
      )}

      <View style={styles.currentValueContainer}>
        <Text style={styles.currentValueLabel}>Current Water Level:</Text>
        <Text style={styles.currentValueText}>
          {currentWaterLevel}
        </Text>
      </View>

      {/* Legend for water level values */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Water Level Scale:</Text>
        <Text>1 = Critical</Text>
        <Text>2 = Low</Text>
        <Text>3 = Normal</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: COLORS.lightGreen || "#E8F5E9" 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 10 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 220
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    marginVertical: 10
  },
  noDataText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold'
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center'
  },
  legend: {
    marginTop: 10,
    backgroundColor: "#f0f8ff",
    padding: 10,
    borderRadius: 8
  },
  legendTitle: { 
    fontWeight: 'bold', 
    marginBottom: 4 
  },
  currentValueContainer: {
    backgroundColor: "#dff0d8",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20
  },
  currentValueLabel: { 
    fontSize: 16, 
    fontWeight: "bold", 
    color: "#2c662d" 
  },
  currentValueText: { 
    fontSize: 24, 
    fontWeight: "bold", 
    color: "#2c662d" 
  },
});
