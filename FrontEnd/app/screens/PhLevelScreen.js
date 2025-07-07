import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Button } from 'react-native-paper';
import { doc, getDoc, setDoc, collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";
import COLORS from '../config/colors';

const screenWidth = Dimensions.get("window").width;

export default function PhLevelScreen({ navigation, route }) {
  const { userId, groupId } = route.params;

  const [chartData, setChartData] = useState(null);
  const [currentPhLevel, setCurrentPhLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phLevel, setPhLevel] = useState(""); // Input field
  const [isSetting, setIsSetting] = useState(false);

  // Initialize with default data to prevent crashes
  const defaultChartData = {
    labels: Array(6).fill(''),
    datasets: [{
      data: Array(6).fill(0),
      color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
      strokeWidth: 2
    }],
    legend: ["pH Level"]
  };

  // 🔄 Real-time pH history listener
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

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        if (snapshot.empty) {
          console.log("No pH data found");
          setChartData(defaultChartData);
          setLoading(false);
          return;
        }

        const cleanData = snapshot.docs
          .filter(doc => {
            const data = doc.data();
            return data.timestamp && data.ph !== undefined && data.ph !== null;
          })
          .map(doc => {
            const d = doc.data();
            let ph = parseFloat(d.ph);
            
            // Ensure pH is a valid number
            if (isNaN(ph) || !isFinite(ph) || ph === null || ph === undefined) {
              ph = 0;
            }
            
            return {
              ph: ph,
              timestamp: d.timestamp.toDate()
            };
          })
          .reverse(); // Oldest first

        if (cleanData.length === 0) {
          console.log("No valid pH data after filtering");
          setChartData(defaultChartData);
          setLoading(false);
          return;
        }

        // Ensure we have at least 2 data points for the chart
        const paddedData = [...cleanData];
        
        // Pad with zeros if we have less than 2 points
        while (paddedData.length < 2) {
          paddedData.push({
            ph: 0,
            timestamp: new Date()
          });
        }

        const validData = paddedData.map(d => {
          const ph = parseFloat(d.ph);
          return isNaN(ph) || !isFinite(ph) ? 0 : ph;
        });

        // Double-check all values are valid numbers
        const hasInvalidData = validData.some(val => 
          val === null || val === undefined || isNaN(val) || !isFinite(val)
        );

        if (hasInvalidData) {
          console.log("Found invalid pH data, using default");
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
              color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
              strokeWidth: 2
            }
          ],
          legend: ["pH Level"]
        });

        setLoading(false);
      } catch (error) {
        console.error("❌ Error processing pH data:", error);
        setChartData(defaultChartData);
        setLoading(false);
      }
    }, error => {
      console.error("❌ Error fetching pH data:", error);
      setChartData(defaultChartData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, groupId]);

  useEffect(() => {
    if (!userId || !groupId) return;

    const fetchCurrentPh = async () => {
      try {
        const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/sensor_data`, "1");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.ph !== undefined && data.ph !== null) {
            const ph = parseFloat(data.ph);
            if (!isNaN(ph) && isFinite(ph)) {
              setCurrentPhLevel(ph);
            } else {
              setCurrentPhLevel(null);
            }
          } else {
            setCurrentPhLevel(null);
          }
        } else {
          setCurrentPhLevel(null);
        }
      } catch (error) {
        console.error("❌ Error fetching current pH:", error);
        setCurrentPhLevel(null);
      }
    };

    fetchCurrentPh();
  }, [userId, groupId]);

  // 🔄 Get current pH target for manual override field
  useEffect(() => {
    if (!userId || !groupId) return;

    const fetchPhTarget = async () => {
      try {
        const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/control_settings`, "1");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const target = parseFloat(data.pHTarget);
          if (!isNaN(target) && isFinite(target)) {
            setPhLevel(target.toString());
          } else {
            setPhLevel("6.8"); // Default if invalid
          }
        } else {
          setPhLevel("6.8"); // Default if missing
        }
      } catch (error) {
        console.error("❌ Firestore error loading pH target:", error);
        setPhLevel("6.8"); // Default on error
      }
    };

    fetchPhTarget();
  }, [userId, groupId]);

  // 🔘 Manually set target pH level in control_settings
  const handleSetValue = async () => {
    if (!userId || !phLevel) return;

    const targetValue = parseFloat(phLevel);
    if (isNaN(targetValue) || !isFinite(targetValue)) {
      console.error("Invalid pH value:", phLevel);
      return;
    }

    setIsSetting(true);

    try {
      const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/control_settings`, "1");
      await setDoc(docRef, { pHTarget: targetValue }, { merge: true });
      console.log("✅ Updated pH Target:", targetValue);
    } catch (error) {
      console.error("❌ Error updating pH target:", error);
    }

    setIsSetting(false);
  };

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
      <Text style={styles.title}>pH Level Monitoring</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading pH data...</Text>
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
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 10 },
            propsForDots: { r: "5", strokeWidth: "2", stroke: "#4CAF50" },
          }}
          bezier
          style={{ marginVertical: 10, borderRadius: 10 }}
        />
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>📊 No pH data available</Text>
          <Text style={styles.noDataSubtext}>Check back later or ensure sensors are connected</Text>
        </View>
      )}

      {/* 📊 Display current pH from sensor */}
      <View style={styles.currentValueContainer}>
        <Text style={styles.currentValueLabel}>Current pH:</Text>
        <Text style={styles.currentValueText}>
          {currentPhLevel !== null ? currentPhLevel.toFixed(2) : "N/A"}
        </Text>
      </View>

      {/* 🎯 Target pH input */}
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={phLevel}
        onChangeText={setPhLevel}
        placeholder="Enter target pH level"
      />

      <Button mode="contained" onPress={handleSetValue} disabled={isSetting}>
        {isSetting ? "Setting..." : `Set Target to ${phLevel}`}
      </Button>
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
    marginVertical: 20
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
  input: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 18,
    marginBottom: 15,
    backgroundColor: "#fff",
  }
});
