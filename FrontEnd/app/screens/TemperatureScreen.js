import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import COLORS from '../config/colors';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function TemperatureScreen({ route }) {
  const { userId, groupId } = route.params;
  const [currentTemperature, setCurrentTemperature] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTipsInfo, setShowTipsInfo] = useState(false);

  useEffect(() => {
    if (!userId || !groupId) {
      setLoading(false);
      return;
    }

    const fetchCurrentTemperature = async () => {
      try {
        const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/sensor_data`, "1");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const temp = parseFloat(data.temperature);
          if (!isNaN(temp) && isFinite(temp)) {
            setCurrentTemperature(temp);
          } else {
            setCurrentTemperature(null);
          }
        } else {
          setCurrentTemperature(null);
        }
      } catch (error) {
        console.error("Error fetching current temperature:", error);
        setCurrentTemperature(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentTemperature();
  }, [userId, groupId]);

  // Function to get temperature status and color
  const getTemperatureStatus = (temp) => {
    if (temp === null || temp === undefined) return { status: 'Unknown', color: '#999', icon: 'help-outline' };
    
    if (temp >= 18 && temp <= 25) {
      return { status: 'Optimal', color: '#4CAF50', icon: 'check-circle' };
    } else if (temp >= 15 && temp < 18) {
      return { status: 'Cool', color: '#FF9800', icon: 'warning' };
    } else if (temp > 25 && temp <= 30) {
      return { status: 'Warm', color: '#FF9800', icon: 'warning' };
    } else if (temp < 15) {
      return { status: 'Too Cold', color: '#F44336', icon: 'error' };
    } else {
      return { status: 'Too Hot', color: '#F44336', icon: 'error' };
    }
  };

  const temperatureStatus = getTemperatureStatus(currentTemperature);

  const toggleTipsInfo = () => {
    setShowTipsInfo(!showTipsInfo);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Icon name="device-thermostat" size={24} color={COLORS.green} />
          <Text style={styles.title}>Temperature Monitoring</Text>
          <TouchableOpacity 
            onPress={toggleTipsInfo}
            style={[
              styles.infoButton,
              showTipsInfo && styles.infoButtonActive
            ]}
          >
            <Icon 
              name={showTipsInfo ? "info" : "info-outline"} 
              size={18} 
              color={showTipsInfo ? "#fff" : COLORS.green} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Current Temperature Display */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.green} />
          <Text style={styles.loadingText}>Loading temperature data...</Text>
        </View>
      ) : (
        <View style={styles.currentValueContainer}>
          <View style={styles.temperatureDisplay}>
            <Icon 
              name={temperatureStatus.icon} 
              size={32} 
              color={temperatureStatus.color} 
            />
            <View style={styles.temperatureInfo}>
              <Text style={styles.currentValueLabel}>Current Temperature</Text>
              <Text style={[styles.currentValueText, { color: temperatureStatus.color }]}>
                {currentTemperature !== null ? `${currentTemperature}°C` : "N/A"}
              </Text>
              <Text style={[styles.statusText, { color: temperatureStatus.color }]}>
                {temperatureStatus.status}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Conditional Tips Information */}
      {showTipsInfo && (
        <View style={styles.tipsContainer}>
          <View style={styles.tipsHeader}>
            <Icon name="lightbulb-outline" size={20} color={COLORS.green} />
            <Text style={styles.tipsTitle}>Temperature Management Tips</Text>
            <TouchableOpacity 
              onPress={toggleTipsInfo}
              style={styles.closeTipsButton}
            >
              <Icon name="close" size={16} color="#666" />
            </TouchableOpacity>
          </View>
          <Text style={styles.tipsText}>
            • Use shade cloth during hot weather to reduce temperature{'\n'}
            • Ensure proper ventilation to prevent heat buildup{'\n'}
            • Consider misting systems for cooling in hot climates{'\n'}
            • Monitor temperature fluctuations between day and night{'\n'}
            • Adjust greenhouse ventilation based on outside temperature
          </Text>
        </View>
      )}

      {/* Optimal Range Section */}
      <View style={styles.rangeContainer}>
        <View style={styles.rangeHeader}>
          <Icon name="thermostat" size={20} color={COLORS.green} />
          <Text style={styles.rangeTitle}>Optimal Temperature Range</Text>
        </View>
        <View style={styles.rangeDisplay}>
          <Text style={styles.rangeValue}>18°C - 25°C</Text>
          <Text style={styles.rangeDescription}>
            This range provides ideal conditions for most plant growth processes
          </Text>
        </View>
      </View>

      {/* How Temperature Affects Plants */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="eco" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>How Temperature Affects Plant Growth</Text>
        </View>
        <Text style={styles.description}>
          Temperature directly controls plant metabolism, photosynthesis, and nutrient uptake. 
          Proper temperature management is crucial for healthy plant development and optimal yields.
        </Text>

        <View style={styles.effectsList}>
          {[
            { icon: 'speed', text: 'Controls enzyme activity and metabolic processes' },
            { icon: 'water-drop', text: 'Affects water and nutrient absorption rates' },
            { icon: 'local-florist', text: 'Influences flowering and fruit development' },
            { icon: 'shield', text: 'Impacts plant stress levels and disease resistance' }
          ].map((effect, index) => (
            <View key={index} style={styles.effectItem}>
              <Icon name={effect.icon} size={16} color={COLORS.green} />
              <Text style={styles.effectText}>{effect.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Temperature Range Guidelines */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="assessment" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>Temperature Range Guidelines</Text>
        </View>
        
        <View style={styles.rangeGuide}>
          <View style={styles.rangeItem}>
            <View style={[styles.rangeIndicator, { backgroundColor: '#4CAF50' }]} />
            <View style={styles.rangeDetails}>
              <Text style={styles.rangeLabel}>Optimal: 18°C - 25°C</Text>
              <Text style={styles.rangeSubtext}>Perfect for growth and development</Text>
            </View>
          </View>
          <View style={styles.rangeItem}>
            <View style={[styles.rangeIndicator, { backgroundColor: '#FF9800' }]} />
            <View style={styles.rangeDetails}>
              <Text style={styles.rangeLabel}>Acceptable: 15°C - 30°C</Text>
              <Text style={styles.rangeSubtext}>Plants can tolerate but may show stress</Text>
            </View>
          </View>
          <View style={styles.rangeItem}>
            <View style={[styles.rangeIndicator, { backgroundColor: '#F44336' }]} />
            <View style={styles.rangeDetails}>
              <Text style={styles.rangeLabel}>Critical: Below 10°C or above 35°C</Text>
              <Text style={styles.rangeSubtext}>Immediate action required</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Natural Management Tips */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="nature" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>Natural Temperature Management</Text>
        </View>
        
        <View style={styles.tipsList}>
          <Text style={styles.tipsSubheading}>Cooling Strategies:</Text>
          {[
            'Install shade cloth (30-50%) during peak summer',
            'Use evaporative cooling with water misters',
            'Improve air circulation with fans or vents',
            'Plant companion crops for natural shading',
            'Apply mulch to keep soil temperature stable'
          ].map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Icon name="ac-unit" size={14} color="#2196F3" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}

          <Text style={[styles.tipsSubheading, { marginTop: 15 }]}>Warming Strategies:</Text>
          {[
            'Use row covers or greenhouse structures',
            'Install thermal mass (water barrels, stones)',
            'Position plants in south-facing locations',
            'Use dark mulch to absorb heat',
            'Create windbreaks to reduce heat loss'
          ].map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Icon name="wb-sunny" size={14} color="#FF9800" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Monitoring Recommendations */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="schedule" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>Monitoring Best Practices</Text>
        </View>
        
        <View style={styles.monitoringList}>
          {[
            { time: 'Daily', action: 'Check temperature readings during peak hours (noon-3pm)' },
            { time: 'Weekly', action: 'Review temperature patterns and trends' },
            { time: 'Seasonal', action: 'Adjust protection strategies based on weather changes' },
            { time: 'Critical', action: 'Take immediate action when temperatures exceed safe ranges' }
          ].map((item, index) => (
            <View key={index} style={styles.monitoringItem}>
              <View style={styles.timeLabel}>
                <Text style={styles.timeText}>{item.time}</Text>
              </View>
              <Text style={styles.actionText}>{item.action}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGreen || "#E8F5E9"
  },
  header: {
    padding: 20,
    paddingBottom: 10
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.green,
    flex: 1,
    marginLeft: 10
  },
  infoButton: {
    padding: 8,
    backgroundColor: '#E8F5E8',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 30,
    minHeight: 30
  },
  infoButtonActive: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  currentValueContainer: {
    backgroundColor: "#fff",
    margin: 20,
    marginTop: 10,
    borderRadius: 12,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  temperatureDisplay: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  temperatureInfo: {
    marginLeft: 15,
    flex: 1
  },
  currentValueLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5
  },
  currentValueText: {
    fontSize: 32,
    fontWeight: "bold"
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 5
  },
  tipsContainer: {
    backgroundColor: '#fff3cd',
    margin: 20,
    marginTop: 0,
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800'
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    justifyContent: 'space-between'
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.green,
    marginLeft: 8,
    flex: 1
  },
  closeTipsButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#e9ecef'
  },
  tipsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  rangeContainer: {
    backgroundColor: '#E8F5E9',
    margin: 20,
    borderRadius: 12,
    padding: 20
  },
  rangeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  rangeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.green,
    marginLeft: 8
  },
  rangeDisplay: {
    alignItems: 'center'
  },
  rangeValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.green,
    marginBottom: 5
  },
  rangeDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  educationSection: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.green,
    marginLeft: 8
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 20,
    textAlign: 'justify'
  },
  effectsList: {
    marginTop: 10
  },
  effectItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingRight: 10
  },
  effectText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20
  },
  rangeGuide: {
    marginTop: 10
  },
  rangeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  rangeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12
  },
  rangeDetails: {
    flex: 1
  },
  rangeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  rangeSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  tipsList: {
    marginTop: 10
  },
  tipsSubheading: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.green,
    marginBottom: 10
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingRight: 10
  },
  tipText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18
  },
  monitoringList: {
    marginTop: 10
  },
  monitoringItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingRight: 10
  },
  timeLabel: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center'
  },
  timeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff'
  },
  actionText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 12,
    flex: 1,
    lineHeight: 18
  }
});
