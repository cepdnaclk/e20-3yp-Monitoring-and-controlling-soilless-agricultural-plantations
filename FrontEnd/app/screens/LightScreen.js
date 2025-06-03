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

  // 🔁 Fetch live light intensity from sensor_data/1
  useEffect(() => {
    if (!userId || !groupId) return;

    const fetchCurrentLight = async () => {
      try {
        const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/sensor_data`, '1');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.light_intensity !== undefined) {
            setCurrentLight(parseFloat(data.light_intensity));
          }
        }
      } catch (error) {
        console.error('❌ Error fetching live light intensity:', error);
      }
    };

    fetchCurrentLight();
  }, [userId, groupId]);

  // 📊 Fetch historical light data for chart
  useEffect(() => {
    if (!userId || !groupId) return;

    const q = query(
      collection(db, `users/${userId}/deviceGroups/${groupId}/sensor_history`),
      orderBy('timestamp', 'desc'),
      limit(24)
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      const data = snapshot.docs
        .filter(doc => doc.data().timestamp && doc.data().light_intensity !== undefined)
        .map(doc => {
          const d = doc.data();
          return {
            value: parseFloat(d.light_intensity),
            timestamp: d.timestamp.toDate()
          };
        })
        .reverse();

      setChartData({
        labels: data.map((d, index) =>
          index % 6 === 0
            ? d.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : ''
        ),
        datasets: [
          {
            data: data.map(d => d.value),
            color: (opacity = 1) => `rgba(255, 206, 86, ${opacity})`,
            strokeWidth: 2
          }
        ],
        legend: ['Light Intensity']
      });

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
          if (data.lightTarget !== undefined) {
            setLightTarget(data.lightTarget.toString());
          }
        }
      } catch (error) {
        console.error('❌ Error fetching light target:', error);
      }
    };

    fetchTarget();
  }, [userId, groupId]);

  // ✅ Set new target
  const handleSetValue = async () => {
    if (!userId || !lightTarget) return;
    setIsSetting(true);

    try {
      const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/control_settings`, '1');
      await setDoc(docRef, { lightTarget: parseFloat(lightTarget) }, { merge: true });
      console.log('✅ Updated light intensity target:', lightTarget);
    } catch (error) {
      console.error('❌ Error updating target:', error);
    }

    setIsSetting(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Light Intensity Monitoring</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#f1c40f" />
      ) : (
        chartData && (
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
        )
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
  container: { flex: 1, padding: 20, backgroundColor: COLORS.lightYellow || '#FFFDE7' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  currentValueContainer: {
    backgroundColor: '#fcf8e3',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20
  },
  currentValueLabel: { fontSize: 16, fontWeight: 'bold', color: '#8a6d3b' },
  currentValueText: { fontSize: 24, fontWeight: 'bold', color: '#8a6d3b' },
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
