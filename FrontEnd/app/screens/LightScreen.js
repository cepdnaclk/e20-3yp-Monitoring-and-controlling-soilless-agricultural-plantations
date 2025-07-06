import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Button } from 'react-native-paper';
import { doc, getDoc, setDoc, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import COLORS from '../config/colors';

const screenWidth = Dimensions.get('window').width;

export default function LightIntensityScreen({ route }) {
  const { userId, groupId } = route.params;

  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightTarget, setLightTarget] = useState('700'); // input field
  const [currentLight, setCurrentLight] = useState(null); // live sensor value
  const [isSetting, setIsSetting] = useState(false);

  // Initialize with default data to prevent crashes
  const defaultChartData = {
    labels: Array(6).fill(''),
    datasets: [{
      data: Array(6).fill(0),
      color: (opacity = 1) => `rgba(255, 206, 86, ${opacity})`,
      strokeWidth: 2
    }],
    legend: ['Light Intensity']
  };

  // 🔁 Fetch live light intensity from sensor_data/1
  useEffect(() => {
    if (!userId || !groupId) return;

    const fetchCurrentLight = async () => {
      try {
        const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/sensor_data`, '1');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.light_intensity !== undefined && data.light_intensity !== null) {
            const light = parseFloat(data.light_intensity);
            if (!isNaN(light) && isFinite(light)) {
              setCurrentLight(light);
            } else {
              setCurrentLight(null);
            }
          } else {
            setCurrentLight(null);
          }
        } else {
          setCurrentLight(null);
        }
      } catch (error) {
        console.error('❌ Error fetching live light intensity:', error);
        setCurrentLight(null);
      }
    };

    fetchCurrentLight();
  }, [userId, groupId]);

  // 📊 Fetch historical light data for chart
  useEffect(() => {
    if (!userId || !groupId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, `users/${userId}/deviceGroups/${groupId}/sensor_history`),
      orderBy('timestamp', 'desc'),
      limit(24)
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      try {
        if (snapshot.empty) {
          console.log("No light intensity data found");
          setChartData(defaultChartData);
          setLoading(false);
          return;
        }

        const cleanData = snapshot.docs
          .filter(doc => {
            const data = doc.data();
            return data.timestamp && data.light_intensity !== undefined && data.light_intensity !== null;
          })
          .map(doc => {
            const d = doc.data();
            let light = parseFloat(d.light_intensity);
            
            // Ensure light intensity is a valid number
            if (isNaN(light) || !isFinite(light) || light === null || light === undefined) {
              light = 0;
            }
            
            return {
              value: light,
              timestamp: d.timestamp.toDate()
            };
          })
          .reverse(); // From oldest to newest

        if (cleanData.length === 0) {
          console.log("No valid light intensity data after filtering");
          setChartData(defaultChartData);
          setLoading(false);
          return;
        }

        // Ensure we have at least 2 data points for the chart
        const paddedData = [...cleanData];
        
        // Pad with zeros if we have less than 2 points
        while (paddedData.length < 2) {
          paddedData.push({
            value: 0,
            timestamp: new Date()
          });
        }

        const validData = paddedData.map(d => {
          const light = parseFloat(d.value);
          return isNaN(light) || !isFinite(light) ? 0 : light;
        });

        // Double-check all values are valid numbers
        const hasInvalidData = validData.some(val => 
          val === null || val === undefined || isNaN(val) || !isFinite(val)
        );

        if (hasInvalidData) {
          console.log("Found invalid light intensity data, using default");
          setChartData(defaultChartData);
          setLoading(false);
          return;
        }

        setChartData({
          labels: paddedData.map((d, index) =>
            index % Math.max(1, Math.floor(paddedData.length / 6)) === 0
              ? d.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : ''
          ),
          datasets: [
            {
              data: validData,
              color: (opacity = 1) => `rgba(255, 206, 86, ${opacity})`,
              strokeWidth: 2
            }
          ],
          legend: ['Light Intensity']
        });

        setLoading(false);
      } catch (error) {
        console.error("❌ Error processing light intensity data:", error);
        setChartData(defaultChartData);
        setLoading(false);
      }
    }, error => {
      console.error("❌ Error fetching light intensity data:", error);
      setChartData(defaultChartData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, groupId]);

  // 🎯 Fetch target value from control_settings/1
  useEffect(() => {
    if (!userId || !groupId) return;

    const fetchTarget = async () => {
      try {
        const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/control_settings`, '1');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.lightTarget !== undefined && data.lightTarget !== null) {
            const target = parseFloat(data.lightTarget);
            if (!isNaN(target) && isFinite(target)) {
              setLightTarget(target.toString());
            } else {
              setLightTarget('700'); // Default if invalid
            }
          } else {
            setLightTarget('700'); // Default if missing
          }
        } else {
          setLightTarget('700'); // Default if document doesn't exist
        }
      } catch (error) {
        console.error('❌ Error fetching light target:', error);
        setLightTarget('700'); // Default on error
      }
    };

    fetchTarget();
  }, [userId, groupId]);

  // ✅ Set new target
  const handleSetValue = async () => {
    if (!userId || !lightTarget) return;

    const targetValue = parseFloat(lightTarget);
    if (isNaN(targetValue) || !isFinite(targetValue)) {
      console.error("Invalid light intensity value:", lightTarget);
      return;
    }

    setIsSetting(true);

    try {
      const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/control_settings`, '1');
      await setDoc(docRef, { lightTarget: targetValue }, { merge: true });
      console.log('✅ Updated light intensity target:', targetValue);
    } catch (error) {
      console.error('❌ Error updating target:', error);
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
      <Text style={styles.title}>Light Intensity Monitoring</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f1c40f" />
          <Text style={styles.loadingText}>Loading light intensity data...</Text>
        </View>
      ) : shouldRenderChart ? (
        <LineChart
          data={chartData}
          width={screenWidth - 40}
          height={220}
          yAxisSuffix=" Lux"
          chartConfig={{
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 206, 86, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 16 }
          }}
          bezier
          style={{ marginVertical: 10, borderRadius: 16 }}
        />
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>📊 No light intensity data available</Text>
          <Text style={styles.noDataSubtext}>Check back later or ensure sensors are connected</Text>
        </View>
      )}

      {/* 📟 Current + Target Display */}
      <View style={styles.currentValueContainer}>
        <Text style={styles.currentValueLabel}>Current Light:</Text>
        <Text style={styles.currentValueText}>
          {currentLight !== null ? `${currentLight} Lux` : 'N/A'}
        </Text>
      </View>

      {/* 🎯 Manual Input */}
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={lightTarget}
        onChangeText={setLightTarget}
        placeholder="Enter desired Lux level"
      />

      <Button mode="contained" onPress={handleSetValue} disabled={isSetting}>
        {isSetting ? 'Setting...' : `Set to ${lightTarget} Lux`}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: COLORS.lightYellow || '#FFFDE7' 
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
    backgroundColor: '#fcf8e3',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20
  },
  currentValueLabel: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#8a6d3b' 
  },
  currentValueText: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#8a6d3b' 
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 18,
    marginBottom: 15,
    backgroundColor: '#fff'
  }
});
