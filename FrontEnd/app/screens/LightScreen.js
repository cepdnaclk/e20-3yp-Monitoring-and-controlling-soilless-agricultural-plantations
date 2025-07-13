import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import COLORS from '../config/colors';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function LightIntensityScreen({ route }) {
  const { userId, groupId } = route.params;
  const [currentLight, setCurrentLight] = useState(null);
  const [lightTarget, setLightTarget] = useState('700');
  const [loading, setLoading] = useState(true);
  const [isSetting, setIsSetting] = useState(false);
  const [showTipsInfo, setShowTipsInfo] = useState(false);

  useEffect(() => {
    if (!userId || !groupId) {
      setLoading(false);
      return;
    }

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
        console.error('Error fetching live light intensity:', error);
        setCurrentLight(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentLight();
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
          if (data.lightTarget !== undefined && data.lightTarget !== null) {
            const target = parseFloat(data.lightTarget);
            if (!isNaN(target) && isFinite(target)) {
              setLightTarget(target.toString());
            }
          }
        }
      } catch (error) {
        console.error('Error fetching light target:', error);
      }
    };

    fetchTarget();
  }, [userId, groupId]);

  // Function to get light intensity status and color
  const getLightStatus = (light) => {
    if (light === null || light === undefined) return { status: 'Unknown', color: '#999', icon: 'help-outline' };
    
    if (light >= 10000 && light <= 50000) {
      return { status: 'Optimal', color: '#4CAF50', icon: 'check-circle' };
    } else if (light >= 5000 && light < 10000) {
      return { status: 'Low', color: '#FF9800', icon: 'warning' };
    } else if (light > 50000 && light <= 60000) {
      return { status: 'High', color: '#FF9800', icon: 'warning' };
    } else if (light < 5000) {
      return { status: 'Too Low', color: '#F44336', icon: 'error' };
    } else {
      return { status: 'Too High', color: '#F44336', icon: 'error' };
    }
  };

  const lightStatus = getLightStatus(currentLight);

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
      console.log('Updated light intensity target:', targetValue);
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
          <Icon name="wb-sunny" size={24} color={COLORS.green} />
          <Text style={styles.title}>Light Intensity Monitoring</Text>
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

      {/* Current Light Display */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.green} />
          <Text style={styles.loadingText}>Loading light intensity data...</Text>
        </View>
      ) : (
        <View style={styles.currentValueContainer}>
          <View style={styles.lightDisplay}>
            <Icon 
              name={lightStatus.icon} 
              size={32} 
              color={lightStatus.color} 
            />
            <View style={styles.lightInfo}>
              <Text style={styles.currentValueLabel}>Current Light Intensity</Text>
              <Text style={[styles.currentValueText, { color: lightStatus.color }]}>
                {currentLight !== null ? `${currentLight} Lux` : "N/A"}
              </Text>
              <Text style={[styles.statusText, { color: lightStatus.color }]}>
                {lightStatus.status}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Control Section 
      <View style={styles.controlSection}>
        <View style={styles.controlHeader}>
          <Icon name="tune" size={20} color={COLORS.green} />
          <Text style={styles.controlTitle}>Light Intensity Control</Text>
        </View>
        <Text style={styles.controlDescription}>
          Set your desired light intensity level for optimal plant growth
        </Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={lightTarget}
          onChangeText={setLightTarget}
          placeholder="Enter desired Lux level"
        />
        <Button 
          mode="contained" 
          onPress={handleSetValue} 
          disabled={isSetting}
          style={styles.setButton}
        >
          {isSetting ? 'Setting...' : `Set to ${lightTarget} Lux`}
        </Button>
      </View>
      */}

      {/* Conditional Tips Information */}
      {showTipsInfo && (
        <View style={styles.tipsContainer}>
          <View style={styles.tipsHeader}>
            <Icon name="lightbulb-outline" size={20} color={COLORS.green} />
            <Text style={styles.tipsTitle}>Light Management Tips</Text>
            <TouchableOpacity 
              onPress={toggleTipsInfo}
              style={styles.closeTipsButton}
            >
              <Icon name="close" size={16} color="#666" />
            </TouchableOpacity>
          </View>
          <Text style={styles.tipsText}>
            • Provide supplemental lighting during low-light periods{'\n'}
            • Position plants to receive optimal natural light{'\n'}
            • Use reflective surfaces to maximize light distribution{'\n'}
            • Rotate plants regularly for even light exposure{'\n'}
            • Consider LED grow lights for consistent illumination
          </Text>
        </View>
      )}

      {/* Optimal Range Section */}
      <View style={styles.rangeContainer}>
        <View style={styles.rangeHeader}>
          <Icon name="wb-sunny" size={20} color={COLORS.green} />
          <Text style={styles.rangeTitle}>Optimal Light Intensity Range</Text>
        </View>
        <View style={styles.rangeDisplay}>
          <Text style={styles.rangeValue}>10,000 - 50,000 Lux</Text>
          <Text style={styles.rangeDescription}>
            This range provides ideal lighting conditions for most plant photosynthesis
          </Text>
        </View>
      </View>

      {/* How Light Affects Plants */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="eco" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>How Light Affects Plant Growth</Text>
        </View>
        <Text style={styles.description}>
          Light intensity drives photosynthesis, the process by which plants convert light energy into chemical energy. 
          Proper lighting ensures healthy growth, proper development, and optimal yield production.
        </Text>

        <View style={styles.effectsList}>
          {[
            { icon: 'flash-on', text: 'Powers photosynthesis for energy production' },
            { icon: 'architecture', text: 'Influences plant morphology and structure' },
            { icon: 'local-florist', text: 'Affects flowering and fruiting cycles' },
            { icon: 'schedule', text: 'Controls plant circadian rhythms' }
          ].map((effect, index) => (
            <View key={index} style={styles.effectItem}>
              <Icon name={effect.icon} size={16} color={COLORS.green} />
              <Text style={styles.effectText}>{effect.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Light Range Guidelines */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="assessment" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>Light Intensity Guidelines</Text>
        </View>
        
        <View style={styles.rangeGuide}>
          <View style={styles.rangeItem}>
            <View style={[styles.rangeIndicator, { backgroundColor: '#4CAF50' }]} />
            <View style={styles.rangeDetails}>
              <Text style={styles.rangeLabel}>Optimal: 10,000 - 50,000 Lux</Text>
              <Text style={styles.rangeSubtext}>Perfect for photosynthesis and growth</Text>
            </View>
          </View>
          <View style={styles.rangeItem}>
            <View style={[styles.rangeIndicator, { backgroundColor: '#FF9800' }]} />
            <View style={styles.rangeDetails}>
              <Text style={styles.rangeLabel}>Acceptable: 5,000 - 60,000 Lux</Text>
              <Text style={styles.rangeSubtext}>Plants can function but may show stress</Text>
            </View>
          </View>
          <View style={styles.rangeItem}>
            <View style={[styles.rangeIndicator, { backgroundColor: '#F44336' }]} />
            <View style={styles.rangeDetails}>
              <Text style={styles.rangeLabel}>Critical: Below 2,000 or above 80,000 Lux</Text>
              <Text style={styles.rangeSubtext}>Immediate adjustment required</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Natural Light Management */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="nature" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>Natural Light Optimization</Text>
        </View>
        
        <View style={styles.tipsList}>
          <Text style={styles.tipsSubheading}>Maximizing Natural Light:</Text>
          {[
            'Position plants near south-facing windows',
            'Use mirrors or reflective surfaces to redirect light',
            'Keep windows clean for maximum light transmission',
            'Prune nearby vegetation blocking natural light',
            'Use light-colored surfaces to reflect more light'
          ].map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Icon name="wb-sunny" size={14} color="#FFA726" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}

          <Text style={[styles.tipsSubheading, { marginTop: 15 }]}>Supplemental Lighting:</Text>
          {[
            'Install LED grow lights for consistent illumination',
            'Use timers to maintain proper light cycles',
            'Position lights 12-24 inches above plants',
            'Choose full-spectrum lights for best results',
            'Gradually adjust light intensity to prevent shock'
          ].map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Icon name="lightbulb-outline" size={14} color="#2196F3" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Signs of Light Problems */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="warning" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>Recognizing Light Issues</Text>
        </View>
        
        <View style={styles.problemsList}>
          <Text style={styles.problemsSubheading}>Low Light Signs:</Text>
          {[
            'Leggy, stretched growth reaching for light',
            'Pale or yellowing leaves',
            'Slow growth and reduced flowering',
            'Dropping of lower leaves'
          ].map((sign, index) => (
            <View key={index} style={styles.problemItem}>
              <Icon name="remove-circle" size={14} color="#F44336" />
              <Text style={styles.problemText}>{sign}</Text>
            </View>
          ))}

          <Text style={[styles.problemsSubheading, { marginTop: 15 }]}>Excessive Light Signs:</Text>
          {[
            'Leaf scorch or brown patches on leaves',
            'Wilting despite adequate water',
            'Bleached or faded leaf colors',
            'Stunted growth and stress symptoms'
          ].map((sign, index) => (
            <View key={index} style={styles.problemItem}>
              <Icon name="add-circle" size={14} color="#FF9800" />
              <Text style={styles.problemText}>{sign}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Monitoring Schedule */}
      <View style={styles.educationSection}>
        <View style={styles.sectionHeader}>
          <Icon name="schedule" size={20} color={COLORS.green} />
          <Text style={styles.sectionTitle}>Light Monitoring Schedule</Text>
        </View>
        
        <View style={styles.monitoringList}>
          {[
            { time: 'Daily', action: 'Check light levels during peak hours and adjust positioning' },
            { time: 'Weekly', action: 'Inspect plants for light-related stress signs' },
            { time: 'Monthly', action: 'Clean light fixtures and adjust supplemental lighting' },
            { time: 'Seasonal', action: 'Adjust light management for changing daylight hours' }
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
    backgroundColor: '#FFFDE7'
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
  lightDisplay: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  lightInfo: {
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
  // ... (include all other styles from previous screens)
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
    backgroundColor: '#FFF8E1',
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
