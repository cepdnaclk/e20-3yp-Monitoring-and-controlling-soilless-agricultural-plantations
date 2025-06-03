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
            temperature: d.temperature || 0,
            timestamp: d.timestamp.toDate()
          };
        })
        .reverse(); // oldest to newest

      

      setChartData({
        labels: data.map((d, index) =>
  index % 6 === 0
    ? d.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ""
),

        datasets: [
          {
            data: data.map(d => d.temperature),
            color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
            strokeWidth: 2,
          }
        ],
        legend: ["Temperature"]
      });

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
        if (data.temperature !== undefined) {
          setCurrentTemperature(parseFloat(data.temperature));
        }
      }
    } catch (error) {
      console.error("❌ Error fetching current temperature:", error);
    }
  };

  fetchCurrentTemperature();
}, [userId, groupId]);


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Temperature Monitoring</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#3498db" />
      ) : (
        chartData && (
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
        )
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
