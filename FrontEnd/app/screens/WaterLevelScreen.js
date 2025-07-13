import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import COLORS from '../config/colors';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function WaterLevelScreen({ route }) {
  const { userId, groupId } = route.params;
  const [currentWaterLevel, setCurrentWaterLevel] = useState("N/A");
  const [loading, setLoading] = useState(true);
  const [showTipsInfo, setShowTipsInfo] = useState(false);

  useEffect(() => {
    if (!userId || !groupId) {
      setLoading(false);
      return;
    }

    const fetchCurrentWaterLevel = async () => {
      try {
        const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/sensor_data`, "1");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          if (data.water_level !== undefined && data.water_level !== null) {
            const rawLevel = data.water_level;
            
            // Handle different data types and formats
            let processedLevel;
            if (typeof rawLevel === 'string') {
              processedLevel = rawLevel.toString().trim().toLowerCase();
            } else if (typeof rawLevel === 'number') {
              // Handle numeric water levels (convert to string equivalents)
              if (rawLevel === 1) processedLevel = 'critical';
              else if (rawLevel === 2) processedLevel = 'low';
              else if (rawLevel === 3) processedLevel = 'normal';
              else if (rawLevel === 4) processedLevel = 'high';
              else if (rawLevel === 5) processedLevel = 'overflow';
              else processedLevel = rawLevel.toString();
            } else {
              processedLevel = String(rawLevel).trim().toLowerCase();
            }
            
            // Capitalize first letter for display
            const displayLevel = processedLevel.charAt(0).toUpperCase() + processedLevel.slice(1);
            setCurrentWaterLevel(displayLevel);
          } else {
            setCurrentWaterLevel("N/A");
          }
        } else {
          setCurrentWaterLevel("N/A");
        }
      } catch (error) {
        console.error("Error fetching current water level:", error);
        setCurrentWaterLevel("N/A");
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentWaterLevel();
  }, [userId, groupId]);

  // Enhanced function to get water level status and color
  const getWaterLevelStatus = (level) => {
    if (!level || level === "N/A") {
      return { status: 'No Data', color: '#999', icon: 'help-outline' };
    }

    const levelLower = level.toString().toLowerCase().trim();
    
    // Handle various possible values including overflow
    if (levelLower === 'normal' || levelLower === 'good' || levelLower === 'ok' || levelLower === '3') {
      return { status: 'Optimal', color: '#4CAF50', icon: 'check-circle' };
    } else if (levelLower === 'low' || levelLower === 'medium' || levelLower === '2') {
      return { status: 'Low', color: '#FF9800', icon: 'warning' };
    } else if (levelLower === 'critical' || levelLower === 'empty' || levelLower === 'very low' || levelLower === '1') {
      return { status: 'Critical', color: '#F44336', icon: 'error' };
    } else if (levelLower === 'high' || levelLower === 'full' || levelLower === '4') {
      return { status: 'High', color: '#2196F3', icon: 'info' };
    } else if (levelLower === 'overflow' || levelLower === '5') {
      return { status: 'Overflow', color: '#9C27B0', icon: 'warning' };
    } else {
      return { status: `Unknown (${level})`, color: '#999', icon: 'help-outline' };
    }
  };

  const waterLevelStatus = getWaterLevelStatus(currentWaterLevel);

  const toggleTipsInfo = () => {
    setShowTipsInfo(!showTipsInfo);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Icon name="water" size={24} color={COLORS.green} />
          <Text style={styles.title}>Water Level Monitoring</Text>
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

      {/* Current Water Level Display */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.green} />
          <Text style={styles.loadingText}>Loading water level data...</Text>
        </View>
      ) : (
        <View style={styles.currentValueContainer}>
          <View style={styles.waterLevelDisplay}>
            <Icon 
              name={waterLevelStatus.icon} 
              size={32} 
              color={waterLevelStatus.color} 
            />
            <View style={styles.waterLevelInfo}>
              <Text style={styles.currentValueLabel}>Current Water Level</Text>
              <Text style={[styles.currentValueText, { color: waterLevelStatus.color }]}>
                {currentWaterLevel}
              </Text>
              <Text style={[styles.statusText, { color: waterLevelStatus.color }]}>
                {waterLevelStatus.status}
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
            <Text style={styles.tipsTitle}>Hydroponic Water Management Tips</Text>
            <TouchableOpacity 
              onPress={toggleTipsInfo}
              style={styles.closeTipsButton}
            >
              <Icon name="close" size={16} color="#666" />
            </TouchableOpacity>
          </View>
          <Text style={styles.tipsText}>
            • Monitor water levels regularly to ensure continuous nutrient flow{'\n'}
            • Maintain proper reservoir capacity for uninterrupted plant growth{'\n'}
            • Check water pumps and circulation systems daily{'\n'}
            • Keep backup water supply for emergency situations{'\n'}
            • Adjust water levels based on plant growth stage and consumption
          </Text>
        </View>
      )}

      {/* Enhanced Water Level Scale */}
      <View style={styles.rangeContainer}>
        <View style={styles.rangeHeader}>
          <Icon name="straighten" size={20} color={COLORS.green} />
          <Text style={styles.rangeTitle}>Water Level Scale</Text>
        </View>
        <View style={styles.scaleDisplay}>
          <View style={styles.scaleItem}>
            <View style={[styles.scaleIndicator, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.scaleText}>Normal/Good/OK - Adequate reservoir capacity</Text>
          </View>
          <View style={styles.scaleItem}>
            <View style={[styles.scaleIndicator, { backgroundColor: '#2196F3' }]} />
            <Text style={styles.scaleText}>High/Full - Maximum reservoir capacity</Text>
          </View>
          <View style={styles.scaleItem}>
            <View style={[styles.scaleIndicator, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.scaleText}>Low/Medium - Refill needed soon</Text>
          </View>
          <View style={styles.scaleItem}>
            <View style={[styles.scaleIndicator, { backgroundColor: '#F44336' }]} />
            <Text style={styles.scaleText}>Critical/Empty - Immediate refill required</Text>
          </View>
          <View style={styles.scaleItem}>
            <View style={[styles.scaleIndicator, { backgroundColor: '#9C27B0' }]} />
            <Text style={styles.scaleText}>Overflow - Excessive water, check drainage</Text>
          </View>
        </View>
      </View>

      {/* How Water Affects Hydroponic Plants */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="eco" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>How Water Affects Hydroponic Growth</Text>
        </View>
        <Text style={styles.description}>
          In hydroponic systems, water serves as the primary medium for delivering nutrients directly to plant roots. 
          Proper water level management ensures continuous nutrient flow, optimal oxygenation, and healthy root development.
        </Text>

        <View style={styles.effectsList}>
          {[
            { icon: 'local-shipping', text: 'Direct nutrient transport to root systems' },
            { icon: 'air', text: 'Maintains proper root zone oxygenation' },
            { icon: 'speed', text: 'Controls nutrient solution circulation rate' },
            { icon: 'trending-up', text: 'Influences overall plant vigor and yield' }
          ].map((effect, index) => (
            <View key={index} style={styles.effectItem}>
              <Icon name={effect.icon} size={16} color={COLORS.green} />
              <Text style={styles.effectText}>{effect.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Hydroponic Water Management */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="water-drop" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>Hydroponic Water Management</Text>
        </View>
        
        <View style={styles.tipsList}>
          <Text style={styles.tipsSubheading}>Reservoir Management:</Text>
          {[
            'Maintain consistent water levels for stable nutrient delivery',
            'Use automated top-off systems for continuous operation',
            'Monitor water consumption patterns to predict refill needs',
            'Keep water temperature between 65-75°F for optimal root health',
            'Use filtered or RO water to prevent mineral buildup'
          ].map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Icon name="water-drop" size={14} color="#2196F3" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}

          <Text style={[styles.tipsSubheading, { marginTop: 15 }]}>System Optimization:</Text>
          {[
            'Install water level sensors for real-time monitoring',
            'Use backup pumps to prevent system failures',
            'Implement overflow protection to prevent flooding',
            'Regular cleaning of reservoirs and water lines',
            'Monitor pH and EC levels alongside water levels'
          ].map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Icon name="settings" size={14} color="#4CAF50" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Overflow Management */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="report-problem" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>Managing Water Overflow</Text>
        </View>
        <Text style={styles.description}>
          Water overflow in hydroponic systems can damage equipment, waste nutrients, and disrupt plant growth. 
          Proper overflow management protects your investment and ensures system reliability.
        </Text>
        
        <View style={styles.tipsList}>
          <Text style={styles.tipsSubheading}>Immediate Actions for Overflow:</Text>
          {[
            'Stop water pumps immediately to prevent further overflow',
            'Check and clear any blocked drainage lines',
            'Inspect float switches and water level sensors',
            'Remove excess water from growing areas',
            'Verify timer settings and pump operation schedules'
          ].map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Icon name="priority-high" size={14} color="#9C27B0" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}

          <Text style={[styles.tipsSubheading, { marginTop: 15 }]}>Prevention Strategies:</Text>
          {[
            'Install overflow drains in all reservoirs and growing beds',
            'Use redundant water level monitoring systems',
            'Set up automated alerts for high water levels',
            'Regular maintenance of pumps and control systems',
            'Implement fail-safe mechanisms for pump shutoffs'
          ].map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Icon name="build" size={14} color="#4CAF50" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Signs of Water Issues */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="warning" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>Recognizing Water Issues</Text>
        </View>
        
        <View style={styles.stressList}>
          <Text style={styles.stressSubheading}>Low Water Level Signs:</Text>
          {[
            'Exposed roots in growing channels or containers',
            'Reduced nutrient solution circulation',
            'Pump running dry or making unusual noises',
            'Plants showing signs of nutrient deficiency'
          ].map((sign, index) => (
            <View key={index} style={styles.stressItem}>
              <Icon name="remove-circle" size={14} color="#F44336" />
              <Text style={styles.stressText}>{sign}</Text>
            </View>
          ))}

          <Text style={[styles.stressSubheading, { marginTop: 15 }]}>High Water Level Issues:</Text>
          {[
            'Poor root oxygenation leading to root rot',
            'Reduced air space in growing medium',
            'Slow plant growth despite adequate nutrients',
            'Algae growth in exposed water areas'
          ].map((sign, index) => (
            <View key={index} style={styles.stressItem}>
              <Icon name="add-circle" size={14} color="#FF9800" />
              <Text style={styles.stressText}>{sign}</Text>
            </View>
          ))}

          <Text style={[styles.stressSubheading, { marginTop: 15 }]}>Overflow/System Failure Signs:</Text>
          {[
            'Water pooling around equipment or growing areas',
            'Electrical components exposed to water',
            'Nutrient solution waste and increased costs',
            'Disrupted plant root systems from flooding',
            'Equipment damage from water exposure'
          ].map((sign, index) => (
            <View key={index} style={styles.stressItem}>
              <Icon name="report-problem" size={14} color="#9C27B0" />
              <Text style={styles.stressText}>{sign}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Monitoring Schedule */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="schedule" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>Water Monitoring Schedule</Text>
        </View>
        
        <View style={styles.monitoringList}>
          {[
            { time: 'Daily', action: 'Check water levels and pump operation status' },
            { time: 'Weekly', action: 'Inspect sensors, floats, and drainage systems' },
            { time: 'Monthly', action: 'Clean reservoirs and replace water filters' },
            { time: 'Seasonal', action: 'Calibrate sensors and update system settings' }
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
  waterLevelDisplay: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  waterLevelInfo: {
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
  scaleDisplay: {
    marginTop: 10
  },
  scaleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  scaleIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12
  },
  scaleText: {
    fontSize: 14,
    color: '#333',
    flex: 1
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
  stressList: {
    marginTop: 10
  },
  stressSubheading: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.green,
    marginBottom: 10
  },
  stressItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingRight: 10
  },
  stressText: {
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
