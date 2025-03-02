
// import React, { useState, useEffect } from 'react';
// import { View, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
// import { Text, Card } from 'react-native-paper';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import { LineChart } from 'react-native-chart-kit';
// import COLORS from '../config/colors';
// import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
// import { db } from "../firebaseConfig"; 

// export default function DashboardScreen({ navigation, route }) {
//   const { userId } = route.params; // ✅ Get user ID from navigation params
//   const [chartData, setChartData] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (!userId) {
//       console.error("❌ No User ID provided!");
//       return;
//     }

//     // ✅ Fetch user-specific sensor data
//     const q = query(collection(db, `users/${userId}/sensor_data`), orderBy("timestamp", "desc"), limit(7));

//     const unsubscribe = onSnapshot(q, (snapshot) => {
//       if (!snapshot.empty) {
//         const fetchedData = snapshot.docs.map((doc) => {
//           const data = doc.data();
//           return {
//             temperature: data.temperature || 0,
//             humidity: data.humidity || 0,
//             pH: data.ph || 0,
//             EC: data.ec || 0,
//             soilMoisture: data.soil_moisture || 0,
//             timestamp: data.timestamp?.toDate().toLocaleString() || "Unknown"
//           };
//         });

//         console.log("🔥 User-Specific Sensor Data:", fetchedData);

//         setChartData({
//           labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
//           datasets: [
//             { data: fetchedData.map(d => d.temperature), label: "Temperature (°C)" },
//             { data: fetchedData.map(d => d.humidity), label: "Humidity (%)" },
//             { data: fetchedData.map(d => d.pH), label: "pH Level" },
//             { data: fetchedData.map(d => d.EC), label: "EC Level (mS/cm)" },
//             { data: fetchedData.map(d => d.soilMoisture), label: "Soil Moisture (%)" },
//           ],
//         });
//         setLoading(false);
//       } else {
//         console.error("❌ No sensor data found for user:", userId);
//       }
//     }, (error) => {
//       console.error("🚨 Firestore Query Error:", error);
//     });

//     return () => unsubscribe();
//   }, [userId]);

//   const getStatusColor = (value, type) => {
//     if (value === "N/A") return "gray"; 
//     console.log(`Checking status color for ${type}:`, value);

//     switch (type) {
//       case "temperature":
//         return value >= 18 && value <= 25 ? "green" : value < 18 || value > 30 ? "red" : "yellow";
//       case "humidity":
//         return value >= 50 && value <= 70 ? "green" : value < 40 || value > 80 ? "red" : "yellow";
//       case "pH":
//         return value >= 5.5 && value <= 6.5 ? "green" : value < 8.0 || value > 7.0 ? "yellow" : "red";
//       case "EC":
//         return value >= 1.2 && value <= 2.5 ? "green" : value < 1.0 || value > 3.0 ? "red" : "yellow";
//       case "soilMoisture":
//         return value >= 60 && value <= 80 ? "green" : value < 50 || value > 90 ? "red" : "yellow";
//       default:
//         return "blue";
//     }
//   };

//   const getLatestReading = (index) => {
//     return chartData?.datasets[index]?.data.slice(-1)[0] || "N/A";
//   };

//   return (
//     <ScrollView contentContainerStyle={styles.container}>
//       <View style={styles.chartContainer}>
//         {loading ? (
//           <ActivityIndicator size="large" color={COLORS.green} />
//         ) : (
//           <LineChart
//   data={{
//     labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
//     datasets: [
//       {
//         data: chartData?.datasets[0]?.data || [],
//         label: "Temperature (°C)",
//         color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`, // Red
//       },
//       {
//         data: chartData?.datasets[1]?.data || [],
//         label: "Humidity (%)",
//         color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`, // Blue
//       },
//       {
//         data: chartData?.datasets[2]?.data || [],
//         label: "pH Level",
//         color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`, // Teal
//       },
//       {
//         data: chartData?.datasets[3]?.data || [],
//         label: "EC Level (mS/cm)",
//         color: (opacity = 1) => `rgba(255, 206, 86, ${opacity})`, // Yellow
//       },
//       {
//         data: chartData?.datasets[4]?.data || [],
//         label: "Soil Moisture (%)",
//         color: (opacity = 1) => `rgba(153, 102, 255, ${opacity})`, // Purple
//       }
//     ],
//   }}
//   width={Dimensions.get("window").width - 40}
//   height={220}
//   yAxisSuffix=""
//   chartConfig={{
//     backgroundGradientFrom: "#fff",
//     backgroundGradientTo: "#fff",
//     decimalPlaces: 1,
//     color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
//     labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
//     style: { borderRadius: 16 },
//     propsForDots: { r: "5", strokeWidth: "2", stroke: "#000" },
//   }}
//   bezier
//   style={{ marginVertical: 8, borderRadius: 16 }}
// />

//         )}
//       </View>

//       {/* Cards Grid */}
//       <View style={styles.gridContainer}>
//         <Card style={styles.card} onPress={() => navigation.navigate('SoilMoisture', { userId })}>
//           <Card.Content style={styles.cardContent}>
//             <Icon name="opacity" size={30} color={COLORS.green} />
//             <Text style={styles.cardTitle}>Soil Moisture</Text>
//             <Text style={styles.cardText}>
//               {getLatestReading(4)}% <View style={[styles.statusDot, { backgroundColor: getStatusColor(getLatestReading(4), "soilMoisture") }]} />
//             </Text>
//           </Card.Content>
//         </Card>

//         <Card style={styles.card} onPress={() => navigation.navigate('Temperature', { userId })}>
//           <Card.Content style={styles.cardContent}>
//             <Icon name="device-thermostat" size={30} color={COLORS.green} />
//             <Text style={styles.cardTitle}>Temperature</Text>
//             <Text style={styles.cardText}>
//               {getLatestReading(0)}°C<View style={[styles.statusDot, { backgroundColor: getStatusColor(getLatestReading(0), "temperature") }]} />
//             </Text>
//           </Card.Content>
//         </Card>

//         <Card style={styles.card} onPress={() => navigation.navigate('Humidity', { userId })}>
//           <Card.Content style={styles.cardContent}>
//             <Icon name="water-drop" size={30} color={COLORS.green} />
//             <Text style={styles.cardTitle}>Humidity</Text>
//             <Text style={styles.cardText}>
//               {getLatestReading(1)}%<View style={[styles.statusDot, { backgroundColor: getStatusColor(getLatestReading(1), "humidity") }]} />
//             </Text>
//           </Card.Content>
//         </Card>

//         <Card style={styles.card} onPress={() => navigation.navigate('PhLevel', { userId })}>
//           <Card.Content style={styles.cardContent}>
//             <Icon name="science" size={30} color={COLORS.green} />
//             <Text style={styles.cardTitle}>pH Level</Text>
//             <Text style={styles.cardText}>
//               {getLatestReading(2)}<View style={[styles.statusDot, { backgroundColor: getStatusColor(getLatestReading(2), "pH") }]} />
//             </Text>
//           </Card.Content>
//         </Card>

//         <Card style={styles.card} onPress={() => navigation.navigate('EcLevel', { userId })}>
//           <Card.Content style={styles.cardContent}>
//             <Icon name="electrical-services" size={30} color={COLORS.green} />
//             <Text style={styles.cardTitle}>EC Level</Text>
//             <Text style={styles.cardText}>
//               {getLatestReading(3)} mS/cm<View style={[styles.statusDot, { backgroundColor: getStatusColor(getLatestReading(3), "EC") }]} />
//             </Text>
//           </Card.Content>
//         </Card>
//       </View>
//     </ScrollView>
//   );
// }
// const styles = StyleSheet.create({
//   chartContainer: {
//     backgroundColor: "#fff",
//     padding: 10,
//     borderRadius: 10,
//     marginVertical: 20,
//     elevation: 5,
//   },
  
//   container: {
//     flexGrow: 1,
//     backgroundColor: COLORS.lightGreen,  // Set background color to light green
//     padding: 20,
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: COLORS.green,  // Use the same green for header background
//     paddingVertical: 15,
//     paddingHorizontal: 20,
//     borderRadius: 10,
//     marginBottom: 20,
//   },
//   title: {
//     fontSize: 26,
//     fontWeight: 'bold',
//     color: '#fff',
//     marginLeft: 10,
//   },
//   gridContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'space-between',
//   },
//   card: {
//     width: '48%', // Make it 2-column layout
//     backgroundColor: '#fff',
//     padding: 10,
//     marginVertical: 10,
//     borderRadius: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 3 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//     alignItems: 'center',
//   },
//   cardContent: {
//     alignItems: 'center',
//   },
//   cardTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: COLORS.green,  // Use green color for title
//     marginTop: 5,
//   },
//   cardText: {
//     fontSize: 19,
//     color: '#555',
//     marginTop: 3,
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   statusDot: {
//     width: 10,
//     height: 10,
//     borderRadius: 5,
//     marginLeft: 5,
//   },
// });



import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';
import COLORS from '../config/colors';
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function DashboardScreen({ navigation, route }) {
  const { userId } = route.params; // Get user ID from navigation params
  const [consumptionChartData, setConsumptionChartData] = useState(null);
  const [loadingConsumption, setLoadingConsumption] = useState(true);
  const [sensorData, setSensorData] = useState(null);
  const [loadingSensor, setLoadingSensor] = useState(true);

  // Fetch consumption data (water & nutrients)
  useEffect(() => {
    if (!userId) {
      console.error("❌ No User ID provided!");
      return;
    }

    const fetchConsumptionData = async () => {
      try {
        const consumptionRef = collection(db, `users/${userId}/consumption`);
        const snapshot = await getDocs(consumptionRef);

        if (!snapshot.empty) {
          const data = snapshot.docs.map((doc) => ({
            date: doc.id, // Date is the document ID
            waterUsed: doc.data().water_used || 0,
            nutrientUsed: doc.data().nutrient_used || 0,
          }));

          // Sort by date
          data.sort((a, b) => new Date(a.date) - new Date(b.date));

          setConsumptionChartData({
            labels: data.map(d => d.date.slice(-5)), // Display only MM-DD
            datasets: [
              { data: data.map(d => d.waterUsed), label: "Water Used (L)" },
              { data: data.map(d => d.nutrientUsed), label: "Nutrient Used (g)" },
            ],
          });
        } else {
          console.warn("⚠️ No consumption data found.");
        }
        setLoadingConsumption(false);
      } catch (error) {
        console.error("🚨 Firestore Fetch Error (Consumption Data):", error);
        setLoadingConsumption(false);
      }
    };

    const fetchSensorData = async () => {
      const q = collection(db, `users/${userId}/sensor_data`);
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const fetchedData = snapshot.docs.map((doc) => doc.data());
        setSensorData(fetchedData[0]);
        setLoadingSensor(false);
      } else {
        console.error("❌ No sensor data found for user:", userId);
      }
    };

    fetchConsumptionData();
    fetchSensorData();
  }, [userId]);

  const getStatusColor = (value, type) => {
    if (value === "N/A") return "gray"; 

    switch (type) {
      case "temperature":
        return value >= 18 && value <= 25 ? "green" : value < 18 || value > 30 ? "red" : "yellow";
      case "humidity":
        return value >= 50 && value <= 70 ? "green" : value < 40 || value > 80 ? "red" : "yellow";
      case "pH":
        return value >= 5.5 && value <= 6.5 ? "green" : value < 8.0 || value > 7.0 ? "yellow" : "red";
      case "EC":
        return value >= 1.2 && value <= 2.5 ? "green" : value < 1.0 || value > 3.0 ? "red" : "yellow";
      case "soilMoisture":
        return value >= 60 && value <= 80 ? "green" : value < 50 || value > 90 ? "red" : "yellow";
      default:
        return "blue";
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* Consumption Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Water & Nutrient Consumption</Text>
        {loadingConsumption ? (
          <ActivityIndicator size="large" color={COLORS.green} />
        ) : (
          <View>
            <LineChart
              data={{
                labels: consumptionChartData?.labels || [],
                datasets: [
                  { data: consumptionChartData?.datasets[0]?.data || [], label: "Water Used (L)", color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})` },
                  { data: consumptionChartData?.datasets[1]?.data || [], label: "Nutrient Used (g)", color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})` },
                ],
              }}
              width={Dimensions.get("window").width - 40}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chartStyle}
            />

            {/* Custom Legend */}
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: 'rgba(54, 162, 235, 1)' }]} />
                <Text style={styles.legendText}>Water Used (L)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: 'rgba(255, 99, 132, 1)' }]} />
                <Text style={styles.legendText}>Nutrient Used (L)</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Cards Grid for Sensor Data */}
      <View style={styles.gridContainer}>
        {loadingSensor ? (
          <ActivityIndicator size="large" color={COLORS.green} />
        ) : (
          <>
            <Card style={styles.card} onPress={() => navigation.navigate('SoilMoisture', { userId })}>
              <Card.Content style={styles.cardContent}>
                <Icon name="opacity" size={30} color={COLORS.green} />
                <Text style={styles.cardTitle}>Soil Moisture</Text>
                <Text style={styles.cardText}>
                  {sensorData.soil_moisture}% <View style={[styles.statusDot, { backgroundColor: getStatusColor(sensorData.soilMoisture, "soilMoisture") }]} />
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.card} onPress={() => navigation.navigate('Temperature', { userId })}>
              <Card.Content style={styles.cardContent}>
                <Icon name="device-thermostat" size={30} color={COLORS.green} />
                <Text style={styles.cardTitle}>Temperature</Text>
                <Text style={styles.cardText}>
                  {sensorData.temperature}°C <View style={[styles.statusDot, { backgroundColor: getStatusColor(sensorData.temperature, "temperature") }]} />
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.card} onPress={() => navigation.navigate('Humidity', { userId })}>
              <Card.Content style={styles.cardContent}>
                <Icon name="water-drop" size={30} color={COLORS.green} />
                <Text style={styles.cardTitle}>Humidity</Text>
                <Text style={styles.cardText}>
                  {sensorData.humidity}% <View style={[styles.statusDot, { backgroundColor: getStatusColor(sensorData.humidity, "humidity") }]} />
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.card} onPress={() => navigation.navigate('PhLevel', { userId })}>
              <Card.Content style={styles.cardContent}>
                <Icon name="science" size={30} color={COLORS.green} />
                <Text style={styles.cardTitle}>pH Level</Text>
                <Text style={styles.cardText}>
                  {sensorData.ph} <View style={[styles.statusDot, { backgroundColor: getStatusColor(sensorData.pH, "pH") }]} />
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.card} onPress={() => navigation.navigate('EcLevel', { userId })}>
              <Card.Content style={styles.cardContent}>
                <Icon name="electrical-services" size={30} color={COLORS.green} />
                <Text style={styles.cardTitle}>EC Level</Text>
                <Text style={styles.cardText}>
                  {sensorData.ec} mS/cm <View style={[styles.statusDot, { backgroundColor: getStatusColor(sensorData.EC, "EC") }]} />
                </Text>
              </Card.Content>
            </Card>
          </>
        )}
      </View>
      
    </ScrollView>
  );
}

const chartConfig = {
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: { borderRadius: 16 },
  propsForDots: { r: "5", strokeWidth: "2", stroke: "#000" },
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.lightGreen, padding: 20 },
  chartContainer: { backgroundColor: "#fff", padding: 10, borderRadius: 10, marginVertical: 20, elevation: 5 },
  chartTitle: { fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 10 },
  chartStyle: { marginVertical: 8, borderRadius: 16 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#fff', padding: 10, marginVertical: 10, borderRadius: 12, elevation: 3, alignItems: 'center' },
  cardContent: { alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.green, marginTop: 5 },
  cardText: { fontSize: 19, color: '#555', marginTop: 3, flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 5 },
  legendContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
  legendDot: { width: 15, height: 15, borderRadius: 8, marginRight: 5 },
  legendText: { fontSize: 14, color: '#555' },
});
