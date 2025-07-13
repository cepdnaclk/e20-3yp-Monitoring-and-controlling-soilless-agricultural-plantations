import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import COLORS from '../config/colors';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const screenWidth = Dimensions.get("window").width;

export default function HumidityScreen({ route }) {
  const { userId, groupId } = route.params;
  const [currentHumidity, setCurrentHumidity] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState('');

  // Initialize with default data to prevent crashes
  const defaultChartData = {
    labels: Array(6).fill(''),
    datasets: [{
      data: Array(6).fill(0),
      color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
      strokeWidth: 2,
    }],
    legend: ["Humidity (%)"]
  };

  // Try to get current humidity from sensor_data first
  useEffect(() => {
    if (!userId || !groupId) return;

    const fetchCurrentHumidity = async () => {
      try {
        const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/sensor_data`, "1");
        const docSnap = await getDoc(docRef);
        
        console.log("🔍 Checking sensor_data document...");
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("📊 sensor_data document:", data);
          
          if (data.humidity !== undefined && data.humidity !== null) {
            const humidity = parseFloat(data.humidity);
            if (!isNaN(humidity) && isFinite(humidity)) {
              setCurrentHumidity(humidity);
              setDebugInfo(`Found in sensor_data: ${humidity}%`);
              console.log("✅ Current humidity from sensor_data:", humidity);
            } else {
              setDebugInfo(`Invalid humidity in sensor_data: ${data.humidity}`);
            }
          } else {
            setDebugInfo('No humidity field in sensor_data');
          }
        } else {
          setDebugInfo('sensor_data document does not exist');
          console.log("❌ sensor_data document does not exist");
        }
      } catch (error) {
        console.error("❌ Error fetching current humidity:", error);
        setDebugInfo(`Error: ${error.message}`);
      }
    };

    fetchCurrentHumidity();
  }, [userId, groupId]);

  useEffect(() => {
    if (!userId || !groupId) {
      setLoading(false);
      return;
    }

    console.log("🔍 Starting humidity data fetch for:", { userId, groupId });

    const q = query(
      collection(db, `users/${userId}/deviceGroups/${groupId}/sensor_history`),
      orderBy("timestamp", "desc"),
      limit(24)
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      try {
        console.log("📦 Snapshot received, docs count:", snapshot.docs.length);
        
        if (snapshot.empty) {
          console.log("❌ No humidity data found in sensor_history");
          setChartData(defaultChartData);
          setLoading(false);
          return;
        }

        // Debug: Log all documents
        snapshot.docs.forEach((doc, index) => {
          const data = doc.data();
          console.log(`📄 Doc ${index}:`, {
            id: doc.id,
            humidity: data.humidity,
            timestamp: data.timestamp?.toDate?.(),
            allFields: Object.keys(data)
          });
        });

        const cleanData = snapshot.docs
          .filter(doc => {
            const data = doc.data();
            const hasTimestamp = data.timestamp;
            const hasHumidity = data.humidity !== undefined && data.humidity !== null;
            
            console.log(`🔍 Doc filter check:`, {
              hasTimestamp,
              hasHumidity,
              humidity: data.humidity,
              passed: hasTimestamp && hasHumidity
            });
            
            return hasTimestamp && hasHumidity;
          })
          .map(doc => {
            const d = doc.data();
            let humidity = parseFloat(d.humidity);
            
            console.log(`🔢 Processing humidity:`, {
              original: d.humidity,
              parsed: humidity,
              isValid: !isNaN(humidity) && isFinite(humidity)
            });
            
            // Ensure humidity is a valid number
            if (isNaN(humidity) || !isFinite(humidity) || humidity === null || humidity === undefined) {
              humidity = 0;
            }
            
            return {
              humidity: humidity,
              timestamp: d.timestamp.toDate()
            };
          })
          .reverse(); // Sort oldest → newest

        console.log("✅ Clean data count:", cleanData.length);

        if (cleanData.length === 0) {
          console.log("❌ No valid humidity data after filtering");
          setChartData(defaultChartData);
          setLoading(false);
          return;
        }

        // Set current humidity from the latest valid reading if not already set
        if (currentHumidity === null) {
          const latestHumidity = cleanData[cleanData.length - 1].humidity;
          if (typeof latestHumidity === 'number' && isFinite(latestHumidity) && !isNaN(latestHumidity)) {
            setCurrentHumidity(latestHumidity);
            setDebugInfo(`Found in sensor_history: ${latestHumidity}%`);
            console.log("✅ Current humidity from sensor_history:", latestHumidity);
          }
        }

        // Ensure we have at least 2 data points for the chart
        const paddedData = [...cleanData];
        
        // Pad with zeros if we have less than 2 points
        while (paddedData.length < 2) {
          paddedData.push({
            humidity: 0,
            timestamp: new Date()
          });
        }

        const validData = paddedData.map(d => {
          const humidity = parseFloat(d.humidity);
          return isNaN(humidity) || !isFinite(humidity) ? 0 : humidity;
        });

        // Double-check all values are valid numbers
        const hasInvalidData = validData.some(val => 
          val === null || val === undefined || isNaN(val) || !isFinite(val)
        );

        if (hasInvalidData) {
          console.log("❌ Found invalid humidity data, using default");
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
              color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
              strokeWidth: 2,
            }
          ],
          legend: ["Humidity (%)"]
        });

        setLoading(false);
      } catch (error) {
        console.error("❌ Error processing humidity data:", error);
        setChartData(defaultChartData);
        setCurrentHumidity(null);
        setLoading(false);
      }
    }, error => {
      console.error("❌ Error fetching humidity data:", error);
      setChartData(defaultChartData);
      setCurrentHumidity(null);
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
      <Text style={styles.title}>Humidity Monitoring</Text>

      

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading humidity data...</Text>
        </View>
      ) : shouldRenderChart ? (
        <LineChart
          data={chartData}
          width={screenWidth - 40}
          height={220}
          yAxisSuffix="%"
          yAxisInterval={1}
          chartConfig={{
            backgroundColor: "#f5f5f5",
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 10 },
            propsForDots: { r: "5", strokeWidth: "2", stroke: "#4CAF50" },
          }}
          bezier
          style={{ marginVertical: 10, borderRadius: 10 }}
        />
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>📊 No humidity data available</Text>
          <Text style={styles.noDataSubtext}>Check back later or ensure sensors are connected</Text>
        </View>
      )}

      <View style={styles.currentValueContainer}>
        <Text style={styles.currentValueLabel}>Current Humidity:</Text>
        <Text style={styles.currentValueText}>
          {currentHumidity !== null ? `${currentHumidity.toFixed(1)}%` : "N/A"}
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
  debugContainer: {
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10
  },
  debugText: {
    fontSize: 12,
    color: '#856404'
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
