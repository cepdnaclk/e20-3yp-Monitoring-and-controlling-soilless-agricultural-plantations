import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import COLORS from '../config/colors';

export default function EcLevelScreen({ navigation, route }) {
  const { userId, groupId } = route.params;
  const [currentEcLevel, setCurrentEcLevel] = useState(null);
  const [ecTarget, setEcTarget] = useState('2.5');
  const [loading, setLoading] = useState(true);
  const [isSetting, setIsSetting] = useState(false);
  const [showTipsInfo, setShowTipsInfo] = useState(false);

  useEffect(() => {
    if (!userId || !groupId) {
      setLoading(false);
      return;
    }

    const fetchCurrentEc = async () => {
      try {
        const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/sensor_data`, '1');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.ec !== undefined && data.ec !== null) {
            const ec = parseFloat(data.ec);
            if (!isNaN(ec) && isFinite(ec)) {
              setCurrentEcLevel(ec);
            } else {
              setCurrentEcLevel(null);
            }
          } else {
            setCurrentEcLevel(null);
          }
        } else {
          setCurrentEcLevel(null);
        }
      } catch (error) {
        console.error('Error fetching live EC level:', error);
        setCurrentEcLevel(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentEc();
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
          if (data.ecTarget !== undefined && data.ecTarget !== null) {
            const target = parseFloat(data.ecTarget);
            if (!isNaN(target) && isFinite(target)) {
              setEcTarget(target.toString());
            }
          }
        }
      } catch (error) {
        console.error('Error fetching EC target:', error);
      }
    };

    fetchTarget();
  }, [userId, groupId]);

  // Function to get EC status and color
  const getEcStatus = (ec) => {
    if (ec === null || ec === undefined) return { status: 'Unknown', color: '#999', icon: 'help-outline' };
    
    if (ec >= 1.8 && ec <= 3.0) {
      return { status: 'Optimal', color: '#4CAF50', icon: 'check-circle' };
    } else if (ec >= 1.2 && ec < 1.8) {
      return { status: 'Low', color: '#FF9800', icon: 'warning' };
    } else if (ec > 3.0 && ec <= 4.0) {
      return { status: 'High', color: '#FF9800', icon: 'warning' };
    } else if (ec < 1.2) {
      return { status: 'Too Low', color: '#F44336', icon: 'error' };
    } else {
      return { status: 'Too High', color: '#F44336', icon: 'error' };
    }
  };

  const ecStatus = getEcStatus(currentEcLevel);

  const handleSetValue = async () => {
    if (!userId || !ecTarget) return;

    const targetValue = parseFloat(ecTarget);
    if (isNaN(targetValue) || !isFinite(targetValue)) {
      console.error("Invalid EC value:", ecTarget);
      return;
    }

    setIsSetting(true);

    try {
      const docRef = doc(db, `users/${userId}/deviceGroups/${groupId}/control_settings`, '1');
      await setDoc(docRef, { ecTarget: targetValue }, { merge: true });
      console.log('Updated EC target:', targetValue);
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
          <Icon name="flash-on" size={24} color={COLORS.green} />
          <Text style={styles.title}>EC Level Monitoring</Text>
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

      {/* Current EC Display */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.green} />
          <Text style={styles.loadingText}>Loading EC data...</Text>
        </View>
      ) : (
        <View style={styles.currentValueContainer}>
          <View style={styles.ecDisplay}>
            <Icon 
              name={ecStatus.icon} 
              size={32} 
              color={ecStatus.color} 
            />
            <View style={styles.ecInfo}>
              <Text style={styles.currentValueLabel}>Current EC Level</Text>
              <Text style={[styles.currentValueText, { color: ecStatus.color }]}>
                {currentEcLevel !== null ? `${currentEcLevel.toFixed(2)} mS/cm` : "N/A"}
              </Text>
              <Text style={[styles.statusText, { color: ecStatus.color }]}>
                {ecStatus.status}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Control Section */}
      <View style={styles.controlSection}>
        <View style={styles.controlHeader}>
          <Icon name="tune" size={20} color={COLORS.green} />
          <Text style={styles.controlTitle}>EC Level Control</Text>
        </View>
        <Text style={styles.controlDescription}>
          Set your target EC level for optimal nutrient concentration in hydroponic systems
        </Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={ecTarget}
          onChangeText={setEcTarget}
          placeholder="Enter desired EC level"
        />
        <Button 
          mode="contained" 
          onPress={handleSetValue} 
          disabled={isSetting}
          style={styles.setButton}
        >
          {isSetting ? 'Setting...' : `Set to ${ecTarget} mS/cm`}
        </Button>
      </View>

      {/* Conditional Tips Information */}
      {showTipsInfo && (
        <View style={styles.tipsContainer}>
          <View style={styles.tipsHeader}>
            <Icon name="lightbulb-outline" size={20} color={COLORS.green} />
            <Text style={styles.tipsTitle}>EC Management Tips</Text>
            <TouchableOpacity 
              onPress={toggleTipsInfo}
              style={styles.closeTipsButton}
            >
              <Icon name="close" size={16} color="#666" />
            </TouchableOpacity>
          </View>
          <Text style={styles.tipsText}>
            • Monitor EC daily as plants consume nutrients differently{'\n'}
            • High EC causes nutrient burn and salt buildup{'\n'}
            • Low EC leads to nutrient deficiencies and poor growth{'\n'}
            • Adjust gradually to prevent plant shock{'\n'}
            • Replace solution completely when EC becomes unmanageable
          </Text>
        </View>
      )}

      {/* Optimal Range Section */}
      <View style={styles.rangeContainer}>
        <View style={styles.rangeHeader}>
          <Icon name="straighten" size={20} color={COLORS.green} />
          <Text style={styles.rangeTitle}>Optimal EC Range for Hydroponics</Text>
        </View>
        <View style={styles.rangeDisplay}>
          <Text style={styles.rangeValue}>1.8 - 3.0 mS/cm</Text>
          <Text style={styles.rangeDescription}>
            This range provides ideal nutrient concentration for most hydroponic crops
          </Text>
        </View>
      </View>

      {/* How EC Affects Hydroponics */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="eco" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>How EC Affects Hydroponic Systems</Text>
        </View>
        <Text style={styles.description}>
          Electrical Conductivity (EC) measures the concentration of dissolved nutrients in your hydroponic solution. 
          It's a critical parameter that directly affects plant health, growth rate, and overall productivity.
        </Text>

        <View style={styles.effectsList}>
          {[
            { icon: 'local-dining', text: 'Indicates total dissolved nutrient concentration' },
            { icon: 'speed', text: 'Affects nutrient uptake rate and efficiency' },
            { icon: 'healing', text: 'Influences plant stress levels and health' },
            { icon: 'trending-up', text: 'Controls growth rate and development speed' }
          ].map((effect, index) => (
            <View key={index} style={styles.effectItem}>
              <Icon name={effect.icon} size={16} color={COLORS.green} />
              <Text style={styles.effectText}>{effect.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* EC Range Guidelines */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="assessment" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>EC Level Guidelines</Text>
        </View>
        
        <View style={styles.rangeGuide}>
          <View style={styles.rangeItem}>
            <View style={[styles.rangeIndicator, { backgroundColor: '#4CAF50' }]} />
            <View style={styles.rangeDetails}>
              <Text style={styles.rangeLabel}>Optimal: 1.8 - 3.0 mS/cm</Text>
              <Text style={styles.rangeSubtext}>Ideal nutrient concentration</Text>
            </View>
          </View>
          <View style={styles.rangeItem}>
            <View style={[styles.rangeIndicator, { backgroundColor: '#FF9800' }]} />
            <View style={styles.rangeDetails}>
              <Text style={styles.rangeLabel}>Acceptable: 1.2 - 4.0 mS/cm</Text>
              <Text style={styles.rangeSubtext}>Monitor closely for adjustments</Text>
            </View>
          </View>
          <View style={styles.rangeItem}>
            <View style={[styles.rangeIndicator, { backgroundColor: '#F44336' }]} />
            <View style={styles.rangeDetails}>
              <Text style={styles.rangeLabel}>Critical: Below 1.2 or above 4.0 mS/cm</Text>
              <Text style={styles.rangeSubtext}>Immediate adjustment required</Text>
            </View>
          </View>
        </View>
      </View>

      {/* EC Management Techniques */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="build" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>EC Management Techniques</Text>
        </View>
        
        <View style={styles.tipsList}>
          <Text style={styles.tipsSubheading}>Increasing EC (Adding Nutrients):</Text>
          {[
            'Add concentrated nutrient solution gradually',
            'Mix thoroughly and allow circulation before retesting',
            'Use balanced nutrient formulations for best results',
            'Monitor individual nutrient ratios to prevent imbalances',
            'Keep detailed records of additions and measurements'
          ].map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Icon name="add-circle" size={14} color="#4CAF50" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}

          <Text style={[styles.tipsSubheading, { marginTop: 15 }]}>Decreasing EC (Diluting Solution):</Text>
          {[
            'Add fresh water to dilute the nutrient concentration',
            'Use filtered or RO water for best results',
            'Mix thoroughly and retest after additions',
            'Consider partial solution replacement for major adjustments',
            'Maintain proper pH levels during dilution process'
          ].map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Icon name="remove-circle" size={14} color="#2196F3" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Signs of EC Problems */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="warning" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>Recognizing EC Issues</Text>
        </View>
        
        <View style={styles.problemsList}>
          <Text style={styles.problemsSubheading}>Low EC (Nutrient Deficiency) Signs:</Text>
          {[
            'Pale or yellowing leaves (chlorosis)',
            'Slow growth and reduced plant vigor',
            'Poor root development and weak stems',
            'Reduced flowering and fruit production'
          ].map((sign, index) => (
            <View key={index} style={styles.problemItem}>
              <Icon name="trending-down" size={14} color="#F44336" />
              <Text style={styles.problemText}>{sign}</Text>
            </View>
          ))}

          <Text style={[styles.problemsSubheading, { marginTop: 15 }]}>High EC (Nutrient Burn) Signs:</Text>
          {[
            'Brown or burnt leaf tips and edges',
            'Wilting despite adequate water supply',
            'Stunted growth and leaf curling',
            'Salt buildup on growing medium and containers'
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
          <Text style={styles.sectionTitle}>EC Monitoring Schedule</Text>
        </View>
        
        <View style={styles.monitoringList}>
          {[
            { time: 'Daily', action: 'Check EC levels and adjust as needed' },
            { time: 'Weekly', action: 'Clean EC probes and inspect plant health' },
            { time: 'Bi-weekly', action: 'Replace nutrient solution completely' },
            { time: 'Monthly', action: 'Calibrate EC meters and check equipment' }
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

      {/* EC by Growth Stage */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="timeline" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>EC Requirements by Growth Stage</Text>
        </View>
        
        <Text style={styles.description}>
          Different growth stages require different nutrient concentrations. Adjust your EC levels 
          based on your plants' current development phase for optimal results.
        </Text>

        <View style={styles.stageList}>
          {[
            { stage: 'Seedlings', ec: '0.8 - 1.2 mS/cm', description: 'Low concentration for delicate roots' },
            { stage: 'Vegetative', ec: '1.2 - 1.8 mS/cm', description: 'Moderate levels for leaf development' },
            { stage: 'Flowering', ec: '1.8 - 2.5 mS/cm', description: 'Higher concentration for flower/fruit production' },
            { stage: 'Fruiting', ec: '2.0 - 3.0 mS/cm', description: 'Peak nutrition for fruit development' },
            { stage: 'Maturation', ec: '1.5 - 2.0 mS/cm', description: 'Reduced levels as growth slows' }
          ].map((item, index) => (
            <View key={index} style={styles.stageItem}>
              <View style={styles.stageHeader}>
                <Text style={styles.stageName}>{item.stage}</Text>
                <Text style={styles.stageEc}>{item.ec}</Text>
              </View>
              <Text style={styles.stageDescription}>{item.description}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Common EC Problems and Solutions */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="help-outline" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>Common EC Problems & Solutions</Text>
        </View>
        
        <View style={styles.problemSolutionList}>
          {[
            {
              problem: 'EC keeps rising despite no nutrient additions',
              solution: 'Plants are consuming water faster than nutrients. Add fresh water to dilute.'
            },
            {
              problem: 'EC drops rapidly after solution changes',
              solution: 'Plants are hungry and consuming nutrients quickly. Monitor and adjust more frequently.'
            },
            {
              problem: 'Inconsistent EC readings',
              solution: 'Clean and calibrate your EC meter. Check for proper probe maintenance.'
            },
            {
              problem: 'Plants show deficiency despite high EC',
              solution: 'Check pH levels - nutrients may be locked out due to incorrect pH.'
            }
          ].map((item, index) => (
            <View key={index} style={styles.problemSolutionItem}>
              <View style={styles.problemHeader}>
                <Icon name="error-outline" size={16} color="#FF9800" />
                <Text style={styles.problemTitle}>Problem:</Text>
              </View>
              <Text style={styles.problemDescription}>{item.problem}</Text>
              <View style={styles.solutionHeader}>
                <Icon name="lightbulb-outline" size={16} color="#4CAF50" />
                <Text style={styles.solutionTitle}>Solution:</Text>
              </View>
              <Text style={styles.solutionDescription}>{item.solution}</Text>
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
    backgroundColor: '#FFF8E1'
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
  ecDisplay: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  ecInfo: {
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
  stageList: {
    marginTop: 15
  },
  stageItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  stageName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1
  },
  stageEc: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.green,
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  stageDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18
  },
  problemSolutionList: {
    marginTop: 10
  },
  problemSolutionItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15
  },
  problemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  problemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
    marginLeft: 8
  },
  problemDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
    lineHeight: 18
  },
  solutionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  solutionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 8
  },
  solutionDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 18
  }
});
