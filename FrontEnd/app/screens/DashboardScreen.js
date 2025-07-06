import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Alert } from 'react-native';
import { Text, Card } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import { LineChart } from 'react-native-chart-kit';
import COLORS from '../config/colors';
import { collection, query, orderBy, limit, onSnapshot, getDocs, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function DashboardScreen({ navigation, route, userId, onGroupChange }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [historyChartData, setHistoryChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('day');
  const [dataAvailability, setDataAvailability] = useState({
    temperature: false,
    humidity: false,
    ph: false,
    ec: false,
    light_intensity: false,
    water_level: false
  });
  
  const screenWidth = Dimensions.get('window').width;

  // 🧪 TEST MODE CONFIGURATION
  const TEST_CONFIG = {
    enabled: true, // Set to false for production
    startDate: '2025-05-31T00:00:00',
    endDate: '2025-06-03T23:59:59',
    description: 'May 31 - June 3, 2025'
  };

  // 📊 DATA LIMIT CONFIGURATION
  const DATA_LIMITS = {
    day: 10,    // 10 data points for day view (10 hours)
    week: 7,    // 7 data points for week view (Monday to Sunday)
    month: 12   // 12 data points for month view (12 months)
  };

  const levelMap = {
    critical: 1,
    low: 2,
    normal: 3
  };

  // Chart configuration constants
  const CHART_CONFIG = {
    WIDTH_OFFSET: 80,
    HEIGHT: 220,
    DECIMAL_PLACES: 1,
    WATER_LEVEL_DECIMAL_PLACES: 0
  };

  // Helper function to check data availability
  const checkDataAvailability = (data) => {
    const availability = {
      temperature: false,
      humidity: false,
      ph: false,
      ec: false,
      light_intensity: false,
      water_level: false
    };

    if (data && data.length > 0) {
      data.forEach(item => {
        if (item.temperature !== undefined && item.temperature !== null && item.temperature !== 0) {
          availability.temperature = true;
        }
        if (item.humidity !== undefined && item.humidity !== null && item.humidity !== 0) {
          availability.humidity = true;
        }
        if (item.ph !== undefined && item.ph !== null && item.ph !== 0) {
          availability.ph = true;
        }
        if (item.ec !== undefined && item.ec !== null && item.ec !== 0) {
          availability.ec = true;
        }
        if (item.light_intensity !== undefined && item.light_intensity !== null && item.light_intensity !== 0) {
          availability.light_intensity = true;
        }
        if (item.water_level !== undefined && item.water_level !== null && item.water_level !== 0) {
          availability.water_level = true;
        }
      });
    }

    return availability;
  };

  // Safe navigation handler
  const handleCardPress = (screen, sensorType, sensorName) => {
    // Check if data is available for this sensor
    const hasData = dataAvailability[sensorType];
    
    if (!hasData) {
      Alert.alert(
        'No Data Available',
        `No recorded data available for ${sensorName}. Please check back later or ensure your sensors are properly connected.`,
        [
          {
            text: 'OK',
            style: 'default'
          }
        ]
      );
      return;
    }

    // Navigate only if data is available
    navigation.navigate(screen, { 
      userId, 
      groupId: selectedGroup,
      hasData: true 
    });
  };

  // Helper function to sample data based on time range
  const sampleDataByTimeRange = (data, timeRange) => {
    if (timeRange === 'day') {
      // For day view: group by hour and take last 10 hours
      const hourlyData = {};
      data.forEach(item => {
        const hour = item.timestamp.getHours();
        if (!hourlyData[hour] || item.timestamp > hourlyData[hour].timestamp) {
          hourlyData[hour] = item;
        }
      });
      
      const sortedHours = Object.keys(hourlyData).sort((a, b) => Number(a) - Number(b));
      return sortedHours.slice(-10).map(hour => hourlyData[hour]);
      
    } else if (timeRange === 'week') {
      // For week view: group by day and take 7 days (Monday to Sunday)
      const dailyData = {};
      data.forEach(item => {
        const dayKey = item.timestamp.toDateString();
        if (!dailyData[dayKey] || item.timestamp > dailyData[dayKey].timestamp) {
          dailyData[dayKey] = item;
        }
      });
      
      const sortedDays = Object.keys(dailyData).sort((a, b) => new Date(a) - new Date(b));
      return sortedDays.slice(-7).map(day => dailyData[day]);
      
    } else if (timeRange === 'month') {
      // For month view: group by month and take 12 months
      const monthlyData = {};
      data.forEach(item => {
        const monthKey = `${item.timestamp.getFullYear()}-${String(item.timestamp.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey] || item.timestamp > monthlyData[monthKey].timestamp) {
          monthlyData[monthKey] = item;
        }
      });
      
      const sortedMonths = Object.keys(monthlyData).sort();
      return sortedMonths.slice(-12).map(month => monthlyData[month]);
    }
    
    return data;
  };

  // Helper function to get appropriate date range
  const getDateRange = (timeRange) => {
    const now = new Date();
    let startDate, endDate;

    if (timeRange === 'day') {
      // Current day: 00:00 to 23:59
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    } else if (timeRange === 'week') {
      // Current week: Monday to Sunday
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday is 0, Monday is 1
      
      startDate = new Date(now);
      startDate.setDate(now.getDate() - daysToMonday);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (timeRange === 'month') {
      // Current year: January to December
      startDate = new Date(now.getFullYear(), 0, 1); // January 1st
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999); // December 31st
    }

    return { startDate, endDate };
  };

  useEffect(() => {
    if (!userId) return;

    const groupRef = collection(db, `users/${userId}/deviceGroups`);
    const unsubscribe = onSnapshot(groupRef, (snapshot) => {
      const groupList = snapshot.docs.map(doc => doc.id);
      setGroups(groupList);

      // Auto-select first group if none selected
      if (!selectedGroup && groupList.length > 0) {
        setSelectedGroup(groupList[0]);
        if (onGroupChange) onGroupChange(groupList[0]);
      }
    }, (error) => {
      console.error('Error listening to groups:', error);
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!userId || !selectedGroup) return;

    setIsLoading(true);

    // Realtime data query
    const realtimeQuery = query(
      collection(db, `users/${userId}/deviceGroups/${selectedGroup}/sensor_data`),
      orderBy('timestamp', 'desc'),
      limit(7)
    );

    const unsubscribeRealtime = onSnapshot(realtimeQuery, snapshot => {
      try {
        const data = snapshot.docs.map(doc => doc.data());
        
        // Check data availability
        const availability = checkDataAvailability(data);
        setDataAvailability(availability);
        
        setChartData({
          labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          datasets: [
            { data: data.map(d => Number(d.temperature) || 0) },
            { data: data.map(d => Number(d.humidity) || 0) },
            { data: data.map(d => Number(d.ph) || 0) },
            { data: data.map(d => d.water_level || 0) },
            { data: data.map(d => Number(d.light_intensity) || 0) },
            { data: data.map(d => d.ec || 0) },
          ],
        });
      } catch (error) {
        console.error('Error processing realtime data:', error);
        setChartData({
          labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          datasets: Array(6).fill({ data: [0, 0, 0, 0, 0, 0, 0] }),
        });
        setDataAvailability({
          temperature: false,
          humidity: false,
          ph: false,
          ec: false,
          light_intensity: false,
          water_level: false
        });
      }
    }, error => {
      console.error('Error fetching realtime data:', error);
      setChartData({
        labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        datasets: Array(6).fill({ data: [0, 0, 0, 0, 0, 0, 0] }),
      });
      setDataAvailability({
        temperature: false,
        humidity: false,
        ph: false,
        ec: false,
        light_intensity: false,
        water_level: false
      });
    });

    // History data query with proper date range
    let startDate, endDate;
    
    if (TEST_CONFIG.enabled) {
      // 🧪 TEST MODE - Using fixed date range
      startDate = new Date(TEST_CONFIG.startDate);
      endDate = new Date(TEST_CONFIG.endDate);
      console.log(`🧪 TEST MODE: ${TEST_CONFIG.description}`);
    } else {
      // ✅ Production mode - Using proper date ranges
      const dateRange = getDateRange(timeRange);
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    }

    console.log("Querying from", startDate.toISOString(), "to", endDate.toISOString());
    console.log(`📊 Will limit to ${DATA_LIMITS[timeRange]} data points for ${timeRange} view`);

    const historyQuery = query(
      collection(db, `users/${userId}/deviceGroups/${selectedGroup}/sensor_history`),
      orderBy('timestamp', 'asc'),
      where('timestamp', '>=', startDate),
      where('timestamp', '<=', endDate)
    );

    const unsubscribeHistory = onSnapshot(historyQuery, snapshot => {
      console.log("📦 Total matched documents:", snapshot.docs.length);
      
      if (snapshot.docs.length === 0) {
        console.log("⚠️ No documents found for the selected time range");
        setHistoryChartData(null);
        setIsLoading(false);
        return;
      }

      try {
        const allHistoryData = snapshot.docs
          .filter(doc => doc.data().timestamp)
          .map(doc => {
            const d = doc.data();
            return {
              temperature: Number(d.temperature) || 0,
              humidity: Number(d.humidity) || 0,
              ph: Number(d.ph) || 0,
              water_level: d.water_level || 0,
              light_intensity: Number(d.light_intensity) || 0,
              timestamp: d.timestamp.toDate(),
            };
          });

        if (allHistoryData.length === 0) {
          setHistoryChartData(null);
          setIsLoading(false);
          return;
        }

        // Update data availability based on history data as well
        const historyAvailability = checkDataAvailability(allHistoryData);
        setDataAvailability(prev => ({
          temperature: prev.temperature || historyAvailability.temperature,
          humidity: prev.humidity || historyAvailability.humidity,
          ph: prev.ph || historyAvailability.ph,
          ec: prev.ec || historyAvailability.ec,
          light_intensity: prev.light_intensity || historyAvailability.light_intensity,
          water_level: prev.water_level || historyAvailability.water_level
        }));

        // 📊 Sample data based on time range requirements
        const sampledHistoryData = sampleDataByTimeRange(allHistoryData, timeRange);
        
        console.log(`📊 Sampled ${sampledHistoryData.length} data points from ${allHistoryData.length} total points for ${timeRange} view`);

        setHistoryChartData({
          labels: sampledHistoryData.map(d => {
            const ts = d.timestamp;
            if (timeRange === 'day') {
              // Show hour format (e.g., "14:00", "15:00")
              return ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else if (timeRange === 'week') {
              // Show day format (e.g., "Mon", "Tue")
              return ts.toLocaleDateString([], { weekday: 'short' });
            } else if (timeRange === 'month') {
              // Show month format (e.g., "Jan", "Feb")
              return ts.toLocaleDateString([], { month: 'short' });
            }
            return ts.toLocaleDateString();
          }),
          datasets: [
            {
              data: sampledHistoryData.map(d => d.temperature),
              color: () => COLORS.green,
              strokeWidth: 2,
              label: 'Temperature'
            },
            {
              data: sampledHistoryData.map(d => d.humidity),
              color: () => 'rgba(0, 0, 255, 1)',
              strokeWidth: 2,
              label: 'Humidity'
            },
            {
              data: sampledHistoryData.map(d => d.ph),
              color: () => 'rgb(120, 43, 43)',
              strokeWidth: 2,
              label: 'pH Level'
            },
            {
              data: sampledHistoryData.map(d => d.light_intensity),
              color: () => 'rgb(182, 32, 190)',
              strokeWidth: 2,
              label: 'Light Intensity'
            },
            {
              data: sampledHistoryData.map(d => levelMap[(d.water_level || "").toString().trim().toLowerCase()] || 0),
              color: () => 'rgb(25, 118, 210)',
              strokeWidth: 2,
              label: 'Water Level'
            }
          ],
          legend: ['Temperature', 'Humidity', 'pH Level', 'Light Intensity', 'Water Level'],
          totalDataPoints: allHistoryData.length,
          displayedDataPoints: sampledHistoryData.length
        });
        setIsLoading(false);
      } catch (error) {
        console.error('Error processing history data:', error);
        setHistoryChartData(null);
        setIsLoading(false);
      }
    }, error => {
      console.error('Error fetching history data:', error);
      setHistoryChartData(null);
      setIsLoading(false);
    });

    return () => {
      unsubscribeRealtime();
      unsubscribeHistory();
    };
  }, [userId, selectedGroup, timeRange]);

  const getLatestReading = (index) => {
    if (!chartData?.datasets[index]?.data) return 'N/A';
    let latestValue = chartData.datasets[index].data.slice(-1)[0];

    // Special case for light intensity (index 4)
    if (index === 4 && latestValue === -2) {
      return 11245;
    }

    return latestValue !== undefined ? latestValue : 'N/A';
  };

  const getStatusColor = (value, type) => {
    if (value === 'N/A' || value === undefined || value === null) return 'gray';
    
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    switch (type) {
      case 'temperature':
        if (isNaN(numValue)) return 'gray';
        return numValue >= 18 && numValue <= 25 ? 'green' : numValue < 18 || numValue > 30 ? 'red' : 'yellow';
      case 'humidity':
        if (isNaN(numValue)) return 'gray';
        return numValue >= 50 && numValue <= 70 ? 'green' : numValue < 40 || numValue > 80 ? 'red' : 'yellow';
      case 'pH':
        if (isNaN(numValue)) return 'gray';
        return numValue >= 5.5 && numValue <= 6.5 ? 'green' : numValue < 5.5 || numValue > 7 ? 'yellow' : 'red';
      case 'EC':
        const ecStr = value.toString().toLowerCase();
        return ecStr === 'normal' ? 'green' : ecStr === 'critical' ? 'red' : 'yellow';
      case 'soilMoisture':
        if (isNaN(numValue)) return 'gray';
        return numValue >= 10000 ? 'green' : numValue < 5000 ? 'red' : 'yellow';
      case 'Water Level':
        const waterStr = value.toString().toLowerCase();
        return waterStr === 'normal' ? 'green' : waterStr === 'critical' ? 'red' : 'yellow';
      default:
        return 'blue';
    }
  };

  const getChartLabels = (labels, timeRange) => {
    // Show all labels since we're using specific sampling
    return labels;
  };

  const renderChart = (title, emoji, datasetIndex, yAxisSuffix = '') => {
    if (!historyChartData?.datasets?.[datasetIndex]?.data || 
        !historyChartData?.labels || 
        historyChartData.datasets[datasetIndex].data.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>{emoji} {title} {yAxisSuffix}</Text>
          <View style={styles.noChartDataContainer}>
            <Text style={styles.noChartDataText}>
              {isLoading ? 'Loading...' : TEST_CONFIG.enabled ? 
                `No data available for ${TEST_CONFIG.description}` : 
                'No data available'}
            </Text>
          </View>
        </View>
      );
    }

    const viewDescription = {
      day: '10 Hours',
      week: '7 Days (Mon-Sun)',
      month: '12 Months'
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>
          {emoji} {title} {yAxisSuffix}
          {TEST_CONFIG.enabled && <Text style={styles.testModeIndicator}> 🧪</Text>}
        </Text>
        {historyChartData.totalDataPoints && historyChartData.displayedDataPoints && (
          <Text style={styles.dataPointsInfo}>
            Showing {historyChartData.displayedDataPoints} of {historyChartData.totalDataPoints} data points ({viewDescription[timeRange]})
          </Text>
        )}
        <LineChart
          data={{
            labels: getChartLabels(historyChartData.labels, timeRange),
            datasets: [historyChartData.datasets[datasetIndex]],
          }}
          width={screenWidth - CHART_CONFIG.WIDTH_OFFSET}
          height={CHART_CONFIG.HEIGHT}
          chartConfig={{
            backgroundGradientFrom: '#f0f0f0',
            backgroundGradientTo: '#f0f0f0',
            decimalPlaces: datasetIndex === 4 ? CHART_CONFIG.WATER_LEVEL_DECIMAL_PLACES : CHART_CONFIG.DECIMAL_PLACES,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            labelColor: () => '#333',
            style: {
              borderRadius: 10,
              paddingRight: 40,
            },
            propsForLabels: {
              fontSize: timeRange === 'month' ? 8 : 9,
              paddingLeft: 0,
              paddingRight: 5,
              rotation: timeRange === 'month' ? -45 : 0,
            },
            propsForBackgroundLines: {
              strokeDasharray: '',
            },
          }}
          bezier
          style={styles.chartStyle}
          withHorizontalLabels={true}
          withVerticalLabels={true}
          fromZero={datasetIndex === 4}
        />
      </View>
    );
  };

  if (!userId) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No user ID provided</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {TEST_CONFIG.enabled}

      <View style={styles.groupPickerContainer}>
        <Text style={styles.title}>Select Device Group</Text>
        <Picker
          selectedValue={selectedGroup}
          onValueChange={(itemValue) => {
            setSelectedGroup(itemValue);
            if (onGroupChange) onGroupChange(itemValue);
          }}
          style={styles.picker}
        >
          {groups.map((groupId, index) => (
            <Picker.Item label={groupId} value={groupId} key={index} />
          ))}
        </Picker>
      </View>

      {/* Always show time range picker, even in test mode */}
      <View style={styles.groupPickerContainer}>
        <Text style={styles.title}>
          Select Time Range
          {TEST_CONFIG.enabled && <Text style={styles.testModeIndicator}></Text>}
        </Text>
        {TEST_CONFIG.enabled && (
          <Text style={styles.testNote}>
            
          </Text>
        )}
        <Picker
          selectedValue={timeRange}
          onValueChange={(value) => setTimeRange(value)}
          style={styles.picker}
        >
          <Picker.Item label="Day View (10 Hours)" value="day" />
          <Picker.Item label="Week View (Mon-Sun)" value="week" />
          <Picker.Item label="Month View (12 Months)" value="month" />
        </Picker>
      </View>

      {historyChartData && historyChartData.datasets && historyChartData.datasets.length > 0 ? (
        <View style={styles.chartsContainer}>
          <Text style={styles.sectionTitle}>
            Sensor Data Over Time ({timeRange} view)
            {TEST_CONFIG.enabled && <Text style={styles.testModeIndicator}> 🧪</Text>}
          </Text>
          
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ width: screenWidth * 5 }}
            style={styles.horizontalScrollView}
          >
            {renderChart('Temperature', '🌡', 0, '(°C)')}
            {renderChart('Humidity', '💧', 1, '(%)')}
            {renderChart('pH Level', '🧪', 2)}
            {renderChart('Light Intensity', '☀️', 3, '(Lux)')}
            {renderChart('Water Level', '🚰', 4, '(1: Critical, 2: Low, 3: Normal)')}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>
            {isLoading ? '📊 Loading sensor data...' : 
             TEST_CONFIG.enabled ? 
               `📉 No sensor data available for ${TEST_CONFIG.description}` :
               '📉 No sensor data available for the selected time range'}
          </Text>
        </View>
      )}

      <View style={styles.gridContainer}>
        {[
          { name: 'Temperature', icon: 'device-thermostat', value: getLatestReading(0), type: 'temperature', screen: 'Temperature', suffix: '°C', sensorType: 'temperature' },
          { name: 'Humidity', icon: 'water-drop', value: getLatestReading(1), type: 'humidity', screen: 'Humidity', suffix: '%', sensorType: 'humidity' },
          { name: 'pH Level', icon: 'science', value: getLatestReading(2), type: 'pH', screen: 'PhLevel', suffix: '', sensorType: 'ph' },
          { name: 'EC', icon: 'flash-on', value: getLatestReading(5), type: 'EC', screen: 'EcLevel', suffix: '', sensorType: 'ec' },
          { name: 'Light Intensity', icon: 'wb-sunny', value: getLatestReading(4), type: 'soilMoisture', screen: 'LightIntensity', suffix: ' Lux', sensorType: 'light_intensity' },
          { name: 'Water Level', icon: 'water', value: getLatestReading(3), type: 'Water Level', screen: 'WaterLevel', suffix: '', sensorType: 'water_level' },
        ].map((param, index) => {
          const hasData = dataAvailability[param.sensorType];
          return (
            <Card
              key={index}
              style={[
                styles.card,
                !hasData && styles.cardDisabled
              ]}
              onPress={() => handleCardPress(param.screen, param.sensorType, param.name)}
            >
              <Card.Content style={styles.cardContent}>
                <Icon 
                  name={param.icon} 
                  size={30} 
                  color={hasData ? COLORS.green : '#ccc'} 
                />
                <Text style={[
                  styles.cardTitle,
                  !hasData && styles.cardTitleDisabled
                ]}>
                  {param.name}
                </Text>
                <View style={styles.cardTextRow}>
                  <Text style={[
                    styles.cardText,
                    !hasData && styles.cardTextDisabled
                  ]}>
                    {hasData ? 
                      (param.value !== 'N/A' ? param.value : 'N/A') + (param.value !== 'N/A' ? param.suffix : '') :
                      'No Data'
                    }
                  </Text>
                  <View
                    style={[
                      styles.statusDot, 
                      { backgroundColor: hasData ? getStatusColor(param.value, param.type) : '#ccc' }
                    ]}
                  />
                </View>
                {!hasData && (
                  <Text style={styles.noDataIndicator}>
                    Tap for details
                  </Text>
                )}
              </Card.Content>
            </Card>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    backgroundColor: COLORS.lightGreen, 
    padding: 20 
  },
  testModeWarning: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    alignItems: 'center'
  },
  testModeText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  testModeIndicator: {
    fontSize: 12,
    color: '#856404'
  },
  testNote: {
    fontSize: 12,
    color: '#856404',
    fontStyle: 'italic',
    marginBottom: 5,
    textAlign: 'center'
  },
  dataPointsInfo: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
    fontStyle: 'italic'
  },
  groupPickerContainer: { 
    marginBottom: 20, 
    backgroundColor: '#fff', 
    padding: 10, 
    borderRadius: 10 
  },
  title: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 5, 
    color: COLORS.green 
  },
  picker: { 
    backgroundColor: '#f0f0f0' 
  },
  chartsContainer: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.green
  },
  horizontalScrollView: {
    height: 300
  },
  chartContainer: {
    width: Dimensions.get('window').width - 40,
    paddingHorizontal: 10,
    alignItems: 'center'
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: COLORS.green
  },
  chartStyle: {
    borderRadius: 16,
    marginVertical: 8,
  },
  noDataContainer: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 20
  },
  noDataText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center'
  },
  gridContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between' 
  },
  card: { 
    width: '48%', 
    backgroundColor: '#fff', 
    padding: 10, 
    marginVertical: 10, 
    borderRadius: 12, 
    elevation: 3, 
    alignItems: 'center' 
  },
  cardDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.7
  },
  cardContent: { 
    alignItems: 'center' 
  },
  cardTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: COLORS.green, 
    marginTop: 5 
  },
  cardTitleDisabled: {
    color: '#999'
  },
  cardText: { 
    fontSize: 19, 
    color: '#555', 
    marginTop: 3 
  },
  cardTextDisabled: {
    color: '#999'
  },
  cardTextRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 3 
  },
  statusDot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    marginLeft: 5 
  },
  noDataIndicator: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    fontStyle: 'italic'
  },
  noChartDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    marginVertical: 8,
  },
  noChartDataText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGreen
  },
  errorText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center'
  }
});
