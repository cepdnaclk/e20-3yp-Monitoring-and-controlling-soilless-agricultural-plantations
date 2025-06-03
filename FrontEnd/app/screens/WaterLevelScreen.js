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

  useEffect(() => {
    if (!userId || !groupId) return;

    // Fetch historical water level states
    const q = query(
      collection(db, `users/${userId}/deviceGroups/${groupId}/sensor_history`),
      orderBy("timestamp", "desc"),
      limit(24)
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      const data = snapshot.docs
        .filter(doc => doc.data().timestamp)
        .map(doc => {
          const d = doc.data();
          const state = (d.water_level || "").trim().toLowerCase();


          return {
            waterLevel: levelMap[state] || 0,
            label: state.charAt(0).toUpperCase() + state.slice(1),
            timestamp: d.timestamp.toDate()
          };

        })
        .reverse(); // Oldest to newest

      // Set current water level state
      if (data.length > 0) {
        setCurrentWaterLevel(data[data.length - 1].label || "N/A");
      }

      setChartData({
        labels: data.map((d, index) =>
          index % 6 === 0
            ? d.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : ""
        ),
        datasets: [
          {
            data: data.map(d => d.waterLevel),
            color: (opacity = 1) => `rgba(30, 144, 255, ${opacity})`,
            strokeWidth: 2,
          }
        ],
        legend: ["Water Level Status (1: Critical, 2: Low, 3: Normal)"]
      });

      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, groupId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Water Level Monitoring</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#3498db" />
      ) : (
        chartData && (
          <>
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

            
          </>
        )
      )}

      <View style={styles.currentValueContainer}>
        <Text style={styles.currentValueLabel}>Current Water Level:</Text>
        <Text style={styles.currentValueText}>
          {currentWaterLevel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: COLORS.lightGreen || "#E8F5E9" },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  legend: {
    marginTop: 10,
    backgroundColor: "#f0f8ff",
    padding: 10,
    borderRadius: 8
  },
  legendTitle: { fontWeight: 'bold', marginBottom: 4 },
  currentValueContainer: {
    backgroundColor: "#dff0d8",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20
  },
  currentValueLabel: { fontSize: 16, fontWeight: "bold", color: "#2c662d" },
  currentValueText: { fontSize: 24, fontWeight: "bold", color: "#2c662d" },
});
