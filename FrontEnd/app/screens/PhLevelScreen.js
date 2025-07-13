import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import COLORS from '../config/colors';

export default function PhLevelScreen({ navigation, route }) {
  const { userId, groupId } = route.params;
  const [currentPhLevel, setCurrentPhLevel] = useState(null);
  const [phTarget, setPhTarget] = useState('6.0');
  const [loading, setLoading] = useState(true);
  const [isSetting, setIsSetting] = useState(false);
  const [showTipsInfo, setShowTipsInfo] = useState(false);

  useEffect(() => {
    if (!userId || !groupId) {
      setLoading(false);
      return;
    }

    const fetchCurrentPh = async () => {
      try {
        const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/sensor_data`, '1');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.ph !== undefined && data.ph !== null) {
            const ph = parseFloat(data.ph);
            if (!isNaN(ph) && isFinite(ph)) {
              setCurrentPhLevel(ph);
            } else {
              setCurrentPhLevel(null);
            }
          } else {
            setCurrentPhLevel(null);
          }
        } else {
          setCurrentPhLevel(null);
        }
      } catch (error) {
        console.error('Error fetching live pH level:', error);
        setCurrentPhLevel(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentPh();
  }, [userId, groupId]);

  // Fetch target value
  useEffect(() => {
    if (!userId || !groupId) return;

    const fetchTarget = async () => {
      try {
        const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/control_settings`, '1');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.pHTarget !== undefined && data.pHTarget !== null) {
            const target = parseFloat(data.pHTarget);
            if (!isNaN(target) && isFinite(target)) {
              setPhTarget(target.toString());
            }
          }
        }
      } catch (error) {
        console.error('Error fetching pH target:', error);
      }
    };

    fetchTarget();
  }, [userId, groupId]);

  // Function to get pH status and color
  const getPhStatus = (ph) => {
    if (ph === null || ph === undefined) return { status: 'Unknown', color: '#999', icon: 'help-outline' };
    
    if (ph >= 5.5 && ph <= 6.5) {
      return { status: 'Optimal', color: '#4CAF50', icon: 'check-circle' };
    } else if (ph >= 5.0 && ph < 5.5) {
      return { status: 'Slightly Acidic', color: '#FF9800', icon: 'warning' };
    } else if (ph > 6.5 && ph <= 7.5) {
      return { status: 'Slightly Basic', color: '#FF9800', icon: 'warning' };
    } else if (ph < 5.0) {
      return { status: 'Too Acidic', color: '#F44336', icon: 'error' };
    } else {
      return { status: 'Too Basic', color: '#F44336', icon: 'error' };
    }
  };

  const phStatus = getPhStatus(currentPhLevel);

  const handleSetValue = async () => {
    if (!userId || !phTarget) return;

    const targetValue = parseFloat(phTarget);
    if (isNaN(targetValue) || !isFinite(targetValue)) {
      console.error("Invalid pH value:", phTarget);
      return;
    }

    setIsSetting(true);

    try {
      const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/control_settings`, '1');
      await setDoc(docRef, { pHTarget: targetValue }, { merge: true });
      console.log('Updated pH target:', targetValue);
    } catch (error) {
      console.error('Error updating target:', error);
    }

    setIsSetting(false);
  };

  const toggleTipsInfo = () => {
    setShowTipsInfo(!showTipsInfo);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Icon name="science" size={24} color={COLORS.green} />
          <Text style={styles.title}>pH Level Monitoring</Text>
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

      {/* Current pH Display */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.green} />
          <Text style={styles.loadingText}>Loading pH data...</Text>
        </View>
      ) : (
        <View style={styles.currentValueContainer}>
          <View style={styles.phDisplay}>
            <Icon 
              name={phStatus.icon} 
              size={32} 
              color={phStatus.color} 
            />
            <View style={styles.phInfo}>
              <Text style={styles.currentValueLabel}>Current pH Level</Text>
              <Text style={[styles.currentValueText, { color: phStatus.color }]}>
                {currentPhLevel !== null ? currentPhLevel.toFixed(2) : "N/A"}
              </Text>
              <Text style={[styles.statusText, { color: phStatus.color }]}>
                {phStatus.status}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Control Section */}
      <View style={styles.controlSection}>
        <View style={styles.controlHeader}>
          <Icon name="tune" size={20} color={COLORS.green} />
          <Text style={styles.controlTitle}>pH Level Control</Text>
        </View>
        <Text style={styles.controlDescription}>
          Set your target pH level for optimal nutrient uptake in hydroponic systems
        </Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={phTarget}
          onChangeText={setPhTarget}
          placeholder="Enter desired pH level"
        />
        <Button 
          mode="contained" 
          onPress={handleSetValue} 
          disabled={isSetting}
          style={styles.setButton}
        >
          {isSetting ? 'Setting...' : `Set to ${phTarget} pH`}
        </Button>
      </View>

      {/* Conditional Tips Information */}
      {showTipsInfo && (
        <View style={styles.tipsContainer}>
          <View style={styles.tipsHeader}>
            <Icon name="lightbulb-outline" size={20} color={COLORS.green} />
            <Text style={styles.tipsTitle}>pH Management Tips</Text>
            <TouchableOpacity 
              onPress={toggleTipsInfo}
              style={styles.closeTipsButton}
            >
              <Icon name="close" size={16} color="#666" />
            </TouchableOpacity>
          </View>
          <Text style={styles.tipsText}>
            • Monitor pH daily as it can drift with nutrient consumption{'\n'}
            • Add pH adjusters slowly and re-measure after mixing{'\n'}
            • Use pH buffers to maintain stable levels over time{'\n'}
            • Test water source pH before adding nutrients{'\n'}
            • Keep pH adjustment solutions properly stored and labeled
          </Text>
        </View>
      )}

      {/* Optimal Range Section */}
      <View style={styles.rangeContainer}>
        <View style={styles.rangeHeader}>
          <Icon name="straighten" size={20} color={COLORS.green} />
          <Text style={styles.rangeTitle}>Optimal pH Range for Hydroponics</Text>
        </View>
        <View style={styles.rangeDisplay}>
          <Text style={styles.rangeValue}>5.5 - 6.5 pH</Text>
          <Text style={styles.rangeDescription}>
            This range ensures maximum nutrient availability and uptake efficiency
          </Text>
        </View>
      </View>

      {/* How pH Affects Hydroponics */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="eco" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>How pH Affects Hydroponic Systems</Text>
        </View>
        <Text style={styles.description}>
          pH is critical in hydroponics because it directly affects nutrient solubility and availability. 
          When pH is outside the optimal range, plants cannot absorb essential nutrients even if they're present in the solution.
        </Text>

        <View style={styles.effectsList}>
          {[
            { icon: 'local-dining', text: 'Controls nutrient solubility and plant uptake' },
            { icon: 'healing', text: 'Affects root health and development' },
            { icon: 'speed', text: 'Influences growth rate and plant vigor' },
            { icon: 'bug-report', text: 'Impacts disease resistance and plant immunity' }
          ].map((effect, index) => (
            <View key={index} style={styles.effectItem}>
              <Icon name={effect.icon} size={16} color={COLORS.green} />
              <Text style={styles.effectText}>{effect.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* pH Range Guidelines */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="assessment" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>pH Level Guidelines</Text>
        </View>
        
        <View style={styles.rangeGuide}>
          <View style={styles.rangeItem}>
            <View style={[styles.rangeIndicator, { backgroundColor: '#4CAF50' }]} />
            <View style={styles.rangeDetails}>
              <Text style={styles.rangeLabel}>Optimal: 5.5 - 6.5 pH</Text>
              <Text style={styles.rangeSubtext}>Maximum nutrient availability</Text>
            </View>
          </View>
          <View style={styles.rangeItem}>
            <View style={[styles.rangeIndicator, { backgroundColor: '#FF9800' }]} />
            <View style={styles.rangeDetails}>
              <Text style={styles.rangeLabel}>Acceptable: 5.0 - 7.5 pH</Text>
              <Text style={styles.rangeSubtext}>Reduced nutrient efficiency</Text>
            </View>
          </View>
          <View style={styles.rangeItem}>
            <View style={[styles.rangeIndicator, { backgroundColor: '#F44336' }]} />
            <View style={styles.rangeDetails}>
              <Text style={styles.rangeLabel}>Critical: Below 5.0 or above 7.5 pH</Text>
              <Text style={styles.rangeSubtext}>Severe nutrient lockout risk</Text>
            </View>
          </View>
        </View>
      </View>

      {/* pH Management Techniques */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="build" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>pH Management Techniques</Text>
        </View>
        
        <View style={styles.tipsList}>
          <Text style={styles.tipsSubheading}>pH Adjustment Methods:</Text>
          {[
            'Use pH Down (phosphoric acid) to lower pH levels',
            'Use pH Up (potassium hydroxide) to raise pH levels',
            'Add adjusters gradually in small increments',
            'Allow solution to circulate before retesting',
            'Keep adjustment solutions away from direct sunlight'
          ].map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Icon name="science" size={14} color="#2196F3" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}

          <Text style={[styles.tipsSubheading, { marginTop: 15 }]}>Stability Maintenance:</Text>
          {[
            'Use pH buffer solutions for consistent levels',
            'Monitor water source pH before mixing nutrients',
            'Replace nutrient solution regularly',
            'Clean pH probes weekly for accurate readings',
            'Calibrate pH meters monthly with standard solutions'
          ].map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Icon name="settings" size={14} color="#4CAF50" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Signs of pH Problems */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="warning" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>Recognizing pH Issues</Text>
        </View>
        
        <View style={styles.problemsList}>
          <Text style={styles.problemsSubheading}>Low pH (Too Acidic) Signs:</Text>
          {[
            'Yellowing of older leaves (nutrient deficiency)',
            'Stunted root development',
            'Reduced plant growth and vigor',
            'Increased susceptibility to root diseases'
          ].map((sign, index) => (
            <View key={index} style={styles.problemItem}>
              <Icon name="trending-down" size={14} color="#F44336" />
              <Text style={styles.problemText}>{sign}</Text>
            </View>
          ))}

          <Text style={[styles.problemsSubheading, { marginTop: 15 }]}>High pH (Too Basic) Signs:</Text>
          {[
            'Iron deficiency (yellowing between leaf veins)',
            'Calcium and magnesium lockout symptoms',
            'Poor fruit development and quality',
            'Reduced flowering and overall productivity'
          ].map((sign, index) => (
            <View key={index} style={styles.problemItem}>
              <Icon name="trending-up" size={14} color="#FF9800" />
              <Text style={styles.problemText}>{sign}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Monitoring Schedule */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="schedule" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>pH Monitoring Schedule</Text>
        </View>
        
        <View style={styles.monitoringList}>
          {[
            { time: 'Daily', action: 'Check pH levels and adjust if necessary' },
            { time: 'Weekly', action: 'Clean pH probes and inspect for plant symptoms' },
            { time: 'Bi-weekly', action: 'Replace nutrient solution completely' },
            { time: 'Monthly', action: 'Calibrate pH meters and check adjustment solutions' }
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

      {/* Nutrient Availability Chart */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="grain" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>Nutrient Availability by pH</Text>
        </View>
        
        <Text style={styles.description}>
          Different nutrients have varying availability at different pH levels. The optimal pH range of 5.5-6.5 
          ensures maximum availability of all essential nutrients.
        </Text>

        <View style={styles.nutrientList}>
          {[
            { nutrient: 'Nitrogen (N)', availability: 'Best at 6.0-7.0 pH' },
            { nutrient: 'Phosphorus (P)', availability: 'Best at 6.0-7.0 pH' },
            { nutrient: 'Potassium (K)', availability: 'Available 6.0-7.5 pH' },
            { nutrient: 'Iron (Fe)', availability: 'Best below 6.5 pH' },
            { nutrient: 'Calcium (Ca)', availability: 'Best above 6.0 pH' },
            { nutrient: 'Magnesium (Mg)', availability: 'Best at 6.0-7.0 pH' }
          ].map((item, index) => (
            <View key={index} style={styles.nutrientItem}>
              <Text style={styles.nutrientName}>{item.nutrient}</Text>
              <Text style={styles.nutrientAvailability}>{item.availability}</Text>
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
    backgroundColor: '#E8F5E9'
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
  phDisplay: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  phInfo: {
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
  controlSection: {
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
  controlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  controlTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.green,
    marginLeft: 8
  },
  controlDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 18,
    marginBottom: 15,
    backgroundColor: '#f9f9f9'
  },
  setButton: {
    backgroundColor: COLORS.green
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
  },
  nutrientList: {
    marginTop: 15
  },
  nutrientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8
  },
  nutrientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1
  },
  nutrientAvailability: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    textAlign: 'right'
  }
});
