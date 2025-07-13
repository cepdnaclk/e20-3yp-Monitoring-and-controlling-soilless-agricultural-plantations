import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import COLORS from '../config/colors';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function HumidityScreen({ route }) {
  const { userId, groupId } = route.params;
  const [currentHumidity, setCurrentHumidity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTipsInfo, setShowTipsInfo] = useState(false);

  useEffect(() => {
    if (!userId || !groupId) {
      setLoading(false);
      return;
    }

    const fetchCurrentHumidity = async () => {
      try {
        const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/sensor_data`, "1");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.humidity !== undefined && data.humidity !== null) {
            const humidity = parseFloat(data.humidity);
            if (!isNaN(humidity) && isFinite(humidity)) {
              setCurrentHumidity(humidity);
            } else {
              setCurrentHumidity(null);
            }
          } else {
            setCurrentHumidity(null);
          }
        } else {
          setCurrentHumidity(null);
        }
      } catch (error) {
        console.error("Error fetching current humidity:", error);
        setCurrentHumidity(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentHumidity();
  }, [userId, groupId]);

  // Function to get humidity status and color
  const getHumidityStatus = (humidity) => {
    if (humidity === null || humidity === undefined) return { status: 'Unknown', color: '#999', icon: 'help-outline' };
    
    if (humidity >= 50 && humidity <= 70) {
      return { status: 'Optimal', color: '#4CAF50', icon: 'check-circle' };
    } else if (humidity >= 40 && humidity < 50) {
      return { status: 'Low', color: '#FF9800', icon: 'warning' };
    } else if (humidity > 70 && humidity <= 80) {
      return { status: 'High', color: '#FF9800', icon: 'warning' };
    } else if (humidity < 40) {
      return { status: 'Too Dry', color: '#F44336', icon: 'error' };
    } else {
      return { status: 'Too Humid', color: '#F44336', icon: 'error' };
    }
  };

  const humidityStatus = getHumidityStatus(currentHumidity);

  const toggleTipsInfo = () => {
    setShowTipsInfo(!showTipsInfo);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Icon name="water-drop" size={24} color={COLORS.green} />
          <Text style={styles.title}>Humidity Monitoring</Text>
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

      {/* Current Humidity Display */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.green} />
          <Text style={styles.loadingText}>Loading humidity data...</Text>
        </View>
      ) : (
        <View style={styles.currentValueContainer}>
          <View style={styles.humidityDisplay}>
            <Icon 
              name={humidityStatus.icon} 
              size={32} 
              color={humidityStatus.color} 
            />
            <View style={styles.humidityInfo}>
              <Text style={styles.currentValueLabel}>Current Humidity</Text>
              <Text style={[styles.currentValueText, { color: humidityStatus.color }]}>
                {currentHumidity !== null ? `${currentHumidity.toFixed(1)}%` : "N/A"}
              </Text>
              <Text style={[styles.statusText, { color: humidityStatus.color }]}>
                {humidityStatus.status}
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
            <Text style={styles.tipsTitle}>Humidity Management Tips</Text>
            <TouchableOpacity 
              onPress={toggleTipsInfo}
              style={styles.closeTipsButton}
            >
              <Icon name="close" size={16} color="#666" />
            </TouchableOpacity>
          </View>
          <Text style={styles.tipsText}>
            • Use humidifiers in dry conditions to increase moisture{'\n'}
            • Improve air circulation to prevent excessive humidity{'\n'}
            • Group plants together to create natural humidity zones{'\n'}
            • Water early morning to maintain optimal humidity levels{'\n'}
            • Monitor for fungal issues in high humidity conditions
          </Text>
        </View>
      )}

      {/* Optimal Range Section */}
      <View style={styles.rangeContainer}>
        <View style={styles.rangeHeader}>
          <Icon name="thermostat" size={20} color={COLORS.green} />
          <Text style={styles.rangeTitle}>Optimal Humidity Range</Text>
        </View>
        <View style={styles.rangeDisplay}>
          <Text style={styles.rangeValue}>50% - 70%</Text>
          <Text style={styles.rangeDescription}>
            This range provides ideal moisture conditions for most plant growth
          </Text>
        </View>
      </View>

      {/* How Humidity Affects Plants */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="eco" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>How Humidity Affects Plant Growth</Text>
        </View>
        <Text style={styles.description}>
          Humidity levels directly impact plant transpiration, nutrient transport, and disease susceptibility. 
          Maintaining proper humidity prevents stress and promotes healthy growth while reducing pest and disease risks.
        </Text>

        <View style={styles.effectsList}>
          {[
            { icon: 'air', text: 'Regulates water loss through plant leaves' },
            { icon: 'local-shipping', text: 'Affects nutrient transport within the plant' },
            { icon: 'bug-report', text: 'Influences disease and pest susceptibility' },
            { icon: 'visibility', text: 'Controls stomatal opening and closing' }
          ].map((effect, index) => (
            <View key={index} style={styles.effectItem}>
              <Icon name={effect.icon} size={16} color={COLORS.green} />
              <Text style={styles.effectText}>{effect.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Humidity Range Guidelines */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="assessment" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>Humidity Range Guidelines</Text>
        </View>
        
        <View style={styles.rangeGuide}>
          <View style={styles.rangeItem}>
            <View style={[styles.rangeIndicator, { backgroundColor: '#4CAF50' }]} />
            <View style={styles.rangeDetails}>
              <Text style={styles.rangeLabel}>Optimal: 50% - 70%</Text>
              <Text style={styles.rangeSubtext}>Perfect for growth and disease prevention</Text>
            </View>
          </View>
          <View style={styles.rangeItem}>
            <View style={[styles.rangeIndicator, { backgroundColor: '#FF9800' }]} />
            <View style={styles.rangeDetails}>
              <Text style={styles.rangeLabel}>Acceptable: 40% - 80%</Text>
              <Text style={styles.rangeSubtext}>Plants can tolerate but may show stress</Text>
            </View>
          </View>
          <View style={styles.rangeItem}>
            <View style={[styles.rangeIndicator, { backgroundColor: '#F44336' }]} />
            <View style={styles.rangeDetails}>
              <Text style={styles.rangeLabel}>Critical: Below 30% or above 90%</Text>
              <Text style={styles.rangeSubtext}>Immediate action required</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Natural Humidity Management */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="nature" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>Natural Humidity Management</Text>
        </View>
        
        <View style={styles.tipsList}>
          <Text style={styles.tipsSubheading}>Increasing Humidity:</Text>
          {[
            'Group plants together to create micro-climates',
            'Place water trays near plants for evaporation',
            'Use pebble trays filled with water under pots',
            'Mist plants early morning (avoid leaves in evening)',
            'Install shade cloth to reduce evaporation'
          ].map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Icon name="water-drop" size={14} color="#2196F3" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}

          <Text style={[styles.tipsSubheading, { marginTop: 15 }]}>Reducing Humidity:</Text>
          {[
            'Improve air circulation with fans or vents',
            'Space plants adequately for airflow',
            'Water soil directly, avoid wetting leaves',
            'Use dehumidifiers in enclosed spaces',
            'Ensure proper drainage to prevent standing water'
          ].map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Icon name="air" size={14} color="#FF9800" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Signs of Humidity Problems */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="warning" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>Recognizing Humidity Issues</Text>
        </View>
        
        <View style={styles.problemsList}>
          <Text style={styles.problemsSubheading}>Low Humidity Signs:</Text>
          {[
            'Brown, crispy leaf edges and tips',
            'Increased pest problems (spider mites)',
            'Rapid soil drying and frequent watering needs',
            'Stunted growth and wilting despite adequate water'
          ].map((sign, index) => (
            <View key={index} style={styles.problemItem}>
              <Icon name="remove-circle" size={14} color="#F44336" />
              <Text style={styles.problemText}>{sign}</Text>
            </View>
          ))}

          <Text style={[styles.problemsSubheading, { marginTop: 15 }]}>High Humidity Signs:</Text>
          {[
            'Fungal diseases (powdery mildew, leaf spot)',
            'Soft, rotting stems and roots',
            'Slow drying soil and overwatering symptoms',
            'Increased pest problems (fungus gnats, aphids)'
          ].map((sign, index) => (
            <View key={index} style={styles.problemItem}>
              <Icon name="add-circle" size={14} color="#FF9800" />
              <Text style={styles.problemText}>{sign}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Monitoring Best Practices */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="schedule" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>Humidity Monitoring Schedule</Text>
        </View>
        
        <View style={styles.monitoringList}>
          {[
            { time: 'Daily', action: 'Check humidity levels during peak hours (morning and evening)' },
            { time: 'Weekly', action: 'Inspect plants for humidity-related stress signs' },
            { time: 'Monthly', action: 'Clean and calibrate humidity monitoring equipment' },
            { time: 'Seasonal', action: 'Adjust humidity management based on weather changes' }
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
  humidityDisplay: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  humidityInfo: {
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
    backgroundColor: '#E3F2FD',
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
  problemsList: {
    marginTop: 10
  },
  problemsSubheading: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.green,
    marginBottom: 10
  },
  problemItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingRight: 10
  },
  problemText: {
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
