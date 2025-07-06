import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Button } from 'react-native-paper';
import { doc, getDoc, setDoc, collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig"; // Firestore reference
import COLORS from '../config/colors';

export default function EcLevelScreen({ navigation, route }) {
  const { userId, groupId } = route.params;
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ecLevel, setEcLevel] = useState("2.5"); // Manual input as string
  const [currentEcLevel, setCurrentEcLevel] = useState("2.5"); // Display value
  const [isSetting, setIsSetting] = useState(false);

  // Initialize with default data to prevent crashes
  const defaultChartData = {
    labels: Array(6).fill(''),
    datasets: [{
      data: Array(6).fill(0),
      color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
      strokeWidth: 2,
    }],
    legend: ["EC Level"]
  };

  // ✅ Fetch EC level from Firestore
  useEffect(() => {
    if (!userId || !groupId) {
      console.error("❌ No User ID or Group ID provided!");
      setLoading(false);
      return;
    }

    const fetchEcLevel = async () => {
      try {
        const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/control_settings`, "1");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("📡 Fetched User-Specific EC Target:", data.ecTarget);
          const ecValue = data.ecTarget?.toString() || "2.5";
          
          // Validate the fetched value
          const numericValue = parseFloat(ecValue);
          if (!isNaN(numericValue) && isFinite(numericValue)) {
            setEcLevel(ecValue);
            setCurrentEcLevel(ecValue);
          } else {
            setEcLevel("2.5");
            setCurrentEcLevel("2.5");
          }
        } else {
          console.log("⚠️ No EC target found. Using default and setting in Firestore...");
          await setDoc(docRef, { ecTarget: 2.5 }, { merge: true });
          setEcLevel("2.5");
          setCurrentEcLevel("2.5");
        }
      } catch (error) {
        console.error("🔥 Firestore Error fetching EC Target:", error);
        setEcLevel("2.5");
        setCurrentEcLevel("2.5");
      }
    };

    fetchEcLevel();
  }, [userId, groupId]);

  // ✅ Fetch real EC data from sensor history
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
          console.log("No EC data found, using default chart");
          setChartData(defaultChartData);
          setLoading(false);
          return;
        }

        const cleanData = snapshot.docs
          .filter(doc => {
            const data = doc.data();
            return data.timestamp && data.ec !== undefined && data.ec !== null;
          })
          .map(doc => {
            const d = doc.data();
            let ec = parseFloat(d.ec);
            
            // Ensure EC is a valid number
            if (isNaN(ec) || !isFinite(ec) || ec === null || ec === undefined) {
              ec = 0;
            }
            
            return {
              ec: ec,
              timestamp: d.timestamp.toDate()
            };
          })
          .reverse(); // From oldest to newest

        if (cleanData.length === 0) {
          console.log("No valid EC data after filtering, using default");
          setChartData(defaultChartData);
          setLoading(false);
          return;
        }

        // Ensure we have at least 2 data points for the chart
        const paddedData = [...cleanData];
        
        // Pad with zeros if we have less than 2 points
        while (paddedData.length < 2) {
          paddedData.push({
            ec: 0,
            timestamp: new Date()
          });
        }

        const validData = paddedData.map(d => {
          const ec = parseFloat(d.ec);
          return isNaN(ec) || !isFinite(ec) ? 0 : ec;
        });

        // Double-check all values are valid numbers
        const hasInvalidData = validData.some(val => 
          val === null || val === undefined || isNaN(val) || !isFinite(val)
        );

        if (hasInvalidData) {
          console.log("Found invalid EC data, using default");
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
              label: "EC Level",
              color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`
            }
          ],
        });

        setLoading(false);
      } catch (error) {
        console.error("❌ Error processing EC data:", error);
        setChartData(defaultChartData);
        setLoading(false);
      }
    }, error => {
      console.error("❌ Error fetching EC data:", error);
      setChartData(defaultChartData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, groupId]);

  // ✅ Save EC target to Firestore
  const handleSetValue = async () => {
    if (!userId || !groupId) {
      console.error("❌ No User ID or Group ID provided!");
      return;
    }

    const numericValue = parseFloat(ecLevel);
    if (isNaN(numericValue) || !isFinite(numericValue) || numericValue < 0 || numericValue > 10) {
      alert("Please enter a valid EC level between 0 and 10");
      return;
    }

    setIsSetting(true);

    try {
      const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/control_settings`, "1");
      await setDoc(docRef, { ecTarget: numericValue }, { merge: true });
      console.log("✅ EC Target updated:", numericValue);
      setCurrentEcLevel(ecLevel);
    } catch (error) {
      console.error("❌ Error updating EC Target:", error);
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
      <Text style={styles.title}>EC Level Monitoring</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading EC data...</Text>
        </View>
      ) : shouldRenderChart ? (
        <LineChart
          data={chartData}
          width={Dimensions.get("window").width - 40}
          height={220}
          yAxisSuffix=""
          chartConfig={{
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 16 },
          }}
          bezier
          style={{ marginVertical: 8, borderRadius: 16 }}
        />
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>📊 No EC data available</Text>
          <Text style={styles.noDataSubtext}>Check back later or ensure sensors are connected</Text>
        </View>
      )}

      {/* Current EC Level Display */}
      <View style={styles.currentValueContainer}>
        <Text style={styles.currentValueLabel}>Current EC:</Text>
        <Text style={styles.currentValueText}>{currentEcLevel}</Text>
      </View>

      {/* Manual Input for EC Level */}
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={ecLevel}
        onChangeText={setEcLevel}
        placeholder="Enter new EC level (0 - 10)"
      />

      {/* Set Value Button */}
      <Button mode="contained" onPress={handleSetValue} disabled={isSetting}>
        {isSetting ? "Setting..." : `Set to ${ecLevel}`}
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
    borderRadius: 16,
    marginVertical: 8
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
    marginBottom: 10
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
