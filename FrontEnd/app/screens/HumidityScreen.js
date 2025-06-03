import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import COLORS from '../config/colors';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const screenWidth = Dimensions.get("window").width;

export default function HumidityScreen({ route }) {
  const { userId, groupId } = route.params;
  const [currentHumidity, setCurrentHumidity] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !groupId) return;

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
          return {
            humidity: d.humidity || 0,
            timestamp: d.timestamp.toDate()
          };
        })
        .reverse(); // Sort oldest → newest

      if (data.length > 0) {
        setCurrentHumidity(data[data.length - 1].humidity);
      }

      setChartData({
        labels: data.map((d, index) =>
  index % 6 === 0
    ? d.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ""
),

        datasets: [
          {
            data: data.map(d => d.humidity),
            color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
            strokeWidth: 2,
          }
        ],
        legend: ["Humidity (%)"]
      });

      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, groupId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Humidity Monitoring</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#3498db" />
      ) : (
        chartData && (
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
        )
      )}

      <View style={styles.currentValueContainer}>
        <Text style={styles.currentValueLabel}>Current Humidity:</Text>
        <Text style={styles.currentValueText}>
          {currentHumidity !== null ? `${currentHumidity}%` : "N/A"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: COLORS.lightGreen || "#E8F5E9" },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
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
