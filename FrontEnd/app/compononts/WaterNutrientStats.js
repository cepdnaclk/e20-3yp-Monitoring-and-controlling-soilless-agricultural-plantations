// // import React, { useState, useEffect } from 'react';
// // import { View, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
// // import { Text, Card } from 'react-native-paper';
// // import Icon from 'react-native-vector-icons/MaterialIcons';
// // import { LineChart } from 'react-native-chart-kit';
// // import COLORS from '../config/colors';
// // import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
// // import { db } from "../firebaseConfig";

// // export default function WaterNutrientStatsScreen({ navigation, route }) {
// //   const { userId } = route.params; // ✅ Get user ID from navigation params
// //   const [chartData, setChartData] = useState(null);
// //   const [loading, setLoading] = useState(true);

// //   useEffect(() => {
// //     if (!userId) {
// //       console.error("❌ No User ID provided!");
// //       return;
// //     }

// //     // ✅ Fetch water and nutrient consumption data
// //     const q = query(collection(db, `users/${userId}/consumption`), orderBy("date", "desc"), limit(7));

// //     const unsubscribe = onSnapshot(q, (snapshot) => {
// //       if (!snapshot.empty) {
// //         const fetchedData = snapshot.docs.map((doc) => {
// //           const data = doc.data();
// //           return {
// //             waterUsage: data.water_usage || 0,
// //             nutrientUsage: data.nutrient_usage || 0,
// //             date: data.date?.toDate().toLocaleDateString() || "Unknown",
// //           };
// //         });

// //         console.log("🔥 User-Specific Water & Nutrient Data:", fetchedData);

// //         setChartData({
// //           labels: fetchedData.map(d => d.date),
// //           datasets: [
// //             { data: fetchedData.map(d => d.waterUsage), label: "Water Usage (L)" },
// //             { data: fetchedData.map(d => d.nutrientUsage), label: "Nutrient Usage (g)" },
// //           ],
// //         });
// //         setLoading(false);
// //       } else {
// //         console.error("❌ No water/nutrient data found for user:", userId);
// //       }
// //     }, (error) => {
// //       console.error("🚨 Firestore Query Error:", error);
// //     });

// //     return () => unsubscribe();
// //   }, [userId]);

// //   return (
// //     <ScrollView contentContainerStyle={styles.container}>
// //       <View style={styles.chartContainer}>
// //         {loading ? (
// //           <ActivityIndicator size="large" color={COLORS.green} />
// //         ) : (
// //           <LineChart
// //             data={{
// //               labels: chartData?.labels || [],
// //               datasets: [
// //                 {
// //                   data: chartData?.datasets[0]?.data || [],
// //                   label: "Water Usage (L)",
// //                   color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`, // Blue
// //                 },
// //                 {
// //                   data: chartData?.datasets[1]?.data || [],
// //                   label: "Nutrient Usage (g)",
// //                   color: (opacity = 1) => `rgba(255, 159, 64, ${opacity})`, // Orange
// //                 },
// //               ],
// //             }}
// //             width={Dimensions.get("window").width - 40}
// //             height={220}
// //             yAxisSuffix="L"
// //             chartConfig={{
// //               backgroundGradientFrom: "#fff",
// //               backgroundGradientTo: "#fff",
// //               decimalPlaces: 1,
// //               color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
// //               labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
// //               style: { borderRadius: 16 },
// //               propsForDots: { r: "5", strokeWidth: "2", stroke: "#000" },
// //             }}
// //             bezier
// //             style={{ marginVertical: 8, borderRadius: 16 }}
// //           />
// //         )}
// //       </View>

// //       <View style={styles.gridContainer}>
// //         <Card style={styles.card}>
// //           <Card.Content style={styles.cardContent}>
// //             <Icon name="local-water" size={30} color={COLORS.green} />
// //             <Text style={styles.cardTitle}>Water Usage</Text>
// //             <Text style={styles.cardText}>
// //               {chartData?.datasets[0]?.data.slice(-1)[0]} L
// //             </Text>
// //           </Card.Content>
// //         </Card>

// //         <Card style={styles.card}>
// //           <Card.Content style={styles.cardContent}>
// //             <Icon name="nature-people" size={30} color={COLORS.green} />
// //             <Text style={styles.cardTitle}>Nutrient Usage</Text>
// //             <Text style={styles.cardText}>
// //               {chartData?.datasets[1]?.data.slice(-1)[0]} g
// //             </Text>
// //           </Card.Content>
// //         </Card>
// //       </View>
// //     </ScrollView>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   chartContainer: {
// //     backgroundColor: "#fff",
// //     padding: 10,
// //     borderRadius: 10,
// //     marginVertical: 20,
// //     elevation: 5,
// //   },
// //   container: {
// //     flexGrow: 1,
// //     backgroundColor: COLORS.lightGreen,  // Set background color to light green
// //     padding: 20,
// //   },
// //   gridContainer: {
// //     flexDirection: 'row',
// //     flexWrap: 'wrap',
// //     justifyContent: 'space-between',
// //   },
// //   card: {
// //     width: '48%', // Make it 2-column layout
// //     backgroundColor: '#fff',
// //     padding: 10,
// //     marginVertical: 10,
// //     borderRadius: 12,
// //     shadowColor: '#000',
// //     shadowOffset: { width: 0, height: 3 },
// //     shadowOpacity: 0.1,
// //     shadowRadius: 4,
// //     elevation: 3,
// //     alignItems: 'center',
// //   },
// //   cardContent: {
// //     alignItems: 'center',
// //   },
// //   cardTitle: {
// //     fontSize: 18,
// //     fontWeight: 'bold',
// //     color: COLORS.green,  // Use green color for title
// //     marginTop: 5,
// //   },
// //   cardText: {
// //     fontSize: 19,
// //     color: '#555',
// //     marginTop: 3,
// //   },
// // });
// import React, { useState, useEffect } from 'react';
// import { View, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
// import { Text, Card } from 'react-native-paper';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import { LineChart } from 'react-native-chart-kit';
// import COLORS from '../config/colors';
// import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
// import { db } from "../firebaseConfig";

// export default function WaterNutrientStatsScreen({ navigation, route }) {
//   const { userId } = route.params; // ✅ Get user ID from navigation params
//   const [chartData, setChartData] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (!userId) {
//       console.error("❌ No User ID provided!");
//       return;
//     }

//     // ✅ Fetch water and nutrient consumption data (using date as document ID)
//     const q = query(
//       collection(db, `users/${userId}/consumption`),
//       orderBy("date", "desc"), // Use document ID as the order
//       limit(7)
//     );

//     const unsubscribe = onSnapshot(q, (snapshot) => {
//       if (!snapshot.empty) {
//         const fetchedData = snapshot.docs.map((doc) => {
//           const data = doc.data();
//           return {
//             waterUsage: data.water_usage || 0,
//             nutrientUsage: data.nutrient_usage || 0,
//             date: doc.id,  // Use document ID (date)
//           };
//         });

//         console.log("🔥 User-Specific Water & Nutrient Data:", fetchedData);

//         setChartData({
//           labels: fetchedData.map(d => d.date),
//           datasets: [
//             { data: fetchedData.map(d => d.waterUsage), label: "Water Usage (L)" },
//             { data: fetchedData.map(d => d.nutrientUsage), label: "Nutrient Usage (g)" },
//           ],
//         });
//         setLoading(false);
//       } else {
//         console.error("❌ No water/nutrient data found for user:", userId);
//       }
//     }, (error) => {
//       console.error("🚨 Firestore Query Error:", error);
//     });

//     return () => unsubscribe();
//   }, [userId]);

//   return (
//     <ScrollView contentContainerStyle={styles.container}>
//       <View style={styles.chartContainer}>
//         {loading ? (
//           <ActivityIndicator size="large" color={COLORS.green} />
//         ) : (
//           <LineChart
//             data={{
//               labels: chartData?.labels || [],
//               datasets: [
//                 {
//                   data: chartData?.datasets[0]?.data || [],
//                   label: "Water Usage (L)",
//                   color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`, // Blue
//                 },
//                 {
//                   data: chartData?.datasets[1]?.data || [],
//                   label: "Nutrient Usage (g)",
//                   color: (opacity = 1) => `rgba(255, 159, 64, ${opacity})`, // Orange
//                 },
//               ],
//             }}
//             width={Dimensions.get("window").width - 40}
//             height={220}
//             yAxisSuffix="L"
//             chartConfig={{
//               backgroundGradientFrom: "#fff",
//               backgroundGradientTo: "#fff",
//               decimalPlaces: 1,
//               color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
//               labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
//               style: { borderRadius: 16 },
//               propsForDots: { r: "5", strokeWidth: "2", stroke: "#000" },
//             }}
//             bezier
//             style={{ marginVertical: 8, borderRadius: 16 }}
//           />
//         )}
//       </View>

//       <View style={styles.gridContainer}>
//         <Card style={styles.card}>
//           <Card.Content style={styles.cardContent}>
//             <Icon name="local-water" size={30} color={COLORS.green} />
//             <Text style={styles.cardTitle}>Water Usage</Text>
//             <Text style={styles.cardText}>
//               {chartData?.datasets[0]?.data.slice(-1)[0]} L
//             </Text>
//           </Card.Content>
//         </Card>

//         <Card style={styles.card}>
//           <Card.Content style={styles.cardContent}>
//             <Icon name="nature-people" size={30} color={COLORS.green} />
//             <Text style={styles.cardTitle}>Nutrient Usage</Text>
//             <Text style={styles.cardText}>
//               {chartData?.datasets[1]?.data.slice(-1)[0]} g
//             </Text>
//           </Card.Content>
//         </Card>
//       </View>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//     chartContainer: {
//       backgroundColor: "#fff",
//       padding: 10,
//       borderRadius: 10,
//       marginVertical: 20,
//       elevation: 5,
//     },
//     container: {
//       flexGrow: 1,
//       backgroundColor: COLORS.lightGreen,  // Set background color to light green
//       padding: 20,
//     },
//     gridContainer: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//     },
//     card: {
//       width: '48%', // Make it 2-column layout
//       backgroundColor: '#fff',
//       padding: 10,
//       marginVertical: 10,
//       borderRadius: 12,
//       shadowColor: '#000',
//       shadowOffset: { width: 0, height: 3 },
//       shadowOpacity: 0.1,
//       shadowRadius: 4,
//       elevation: 3,
//       alignItems: 'center',
//     },
//     cardContent: {
//       alignItems: 'center',
//     },
//     cardTitle: {
//       fontSize: 18,
//       fontWeight: 'bold',
//       color: COLORS.green,  // Use green color for title
//       marginTop: 5,
//     },
//     cardText: {
//       fontSize: 19,
//       color: '#555',
//       marginTop: 3,
//     },
//   });
