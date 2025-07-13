import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import COLORS from '../config/colors';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const screenWidth = Dimensions.get("window").width;

export default function TemperatureScreen({ route }) {
  const { userId, groupId } = route.params;
  const [currentTemperature, setCurrentTemperature] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize with default data to prevent crashes
  const defaultChartData = {
    labels: Array(6).fill(''),
    datasets: [{
      data: Array(6).fill(0),
      color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
      strokeWidth: 2,
    }],
    legend: ["Temperature"]
  };

  useEffect(() => {
    if (!userId || !groupId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, `users/${userId}/deviceGroups/${groupId}/sensor_history`),
      orderBy("timestamp", "desc"),
      limit(24)
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      try {
        if (snapshot.empty) {
          console.log("No temperature data found");
          setChartData(defaultChartData);
          setLoading(false);
          return;
        }

        const cleanData = snapshot.docs
          .filter(doc => {
            const data = doc.data();
            return data.timestamp && data.temperature !== undefined && data.temperature !== null;
          })
          .map(doc => {
            const d = doc.data();
            let temp = parseFloat(d.temperature);
            
            // Ensure temperature is a valid number
            if (isNaN(temp) || !isFinite(temp) || temp === null || temp === undefined) {
              temp = 0;
            }
            
            return {
              temperature: temp,
              timestamp: d.timestamp.toDate(),
            };
          })
          .reverse(); // From oldest to newest

        if (cleanData.length === 0) {
          console.log("No valid temperature data after filtering");
          setChartData(defaultChartData);
          setLoading(false);
          return;
        }

        // Ensure we have at least 2 data points for the chart
        const minDataPoints = Math.max(cleanData.length, 2);
        const paddedData = [...cleanData];
        
        // Pad with zeros if we have less than 2 points
        while (paddedData.length < 2) {
          paddedData.push({
            temperature: 0,
            timestamp: new Date()
          });
        }

        const validData = paddedData.map(d => {
          const temp = parseFloat(d.temperature);
          return isNaN(temp) || !isFinite(temp) ? 0 : temp;
        });

        // Double-check all values are valid numbers
        const hasInvalidData = validData.some(val => 
          val === null || val === undefined || isNaN(val) || !isFinite(val)
        );

        if (hasInvalidData) {
          console.log("Found invalid data, using default");
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
              color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
              strokeWidth: 2,
            }
          ],
          legend: ["Temperature"]
        });

        setLoading(false);
      } catch (error) {
        console.error("❌ Error processing temperature data:", error);
        setChartData(defaultChartData);
        setLoading(false);
      }
    }, error => {
      console.error("❌ Error fetching temperature data:", error);
      setChartData(defaultChartData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, groupId]);

  useEffect(() => {
    if (!userId || !groupId) return;

    const fetchCurrentTemperature = async () => {
      try {
        const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/sensor_data`, "1");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const temp = parseFloat(data.temperature);
          if (!isNaN(temp) && isFinite(temp)) {
            setCurrentTemperature(temp);
          } else {
            setCurrentTemperature(null);
          }
        } else {
          setCurrentTemperature(null);
        }
      } catch (error) {
        console.error("❌ Error fetching current temperature:", error);
        setCurrentTemperature(null);
      }
    };

    fetchCurrentTemperature();
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
      <Text style={styles.title}>Temperature Monitoring</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading temperature data...</Text>
        </View>
      ) : shouldRenderChart ? (
        <LineChart
          data={chartData}
          width={screenWidth - 40}
          height={220}
          yAxisSuffix="°C"
          yAxisInterval={1}
          chartConfig={{
            backgroundColor: "#f5f5f5",
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 10 },
            propsForDots: { r: "5", strokeWidth: "2", stroke: "#FF6347" },
          }}
          bezier
          style={{ marginVertical: 10, borderRadius: 10 }}
        />
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>📊 No temperature data available</Text>
          <Text style={styles.noDataSubtext}>Check back later or ensure sensors are connected</Text>
        </View>
      )}

      <View style={styles.currentValueContainer}>
        <Text style={styles.currentValueLabel}>Current Temperature:</Text>
        <Text style={styles.currentValueText}>
          {currentTemperature !== null ? `${currentTemperature}°C` : "N/A"}
        </Text>
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
