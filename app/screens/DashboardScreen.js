import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function DashboardScreen({ navigation }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* Header with Back Arrow and Title */}
      <View style={styles.header}>
        <Icon name="arrow-back" size={28} onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Dashboard</Text>
      </View>

      {/* Soil Moisture Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Soil Moisture</Text>
          <Text style={styles.cardText}>Optimal (78%)</Text>
        </Card.Content>
      </Card>

      {/* Temperature Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Temperature</Text>
          <Text style={styles.cardText}>22°C</Text>
        </Card.Content>
      </Card>

      {/* Humidity Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Humidity</Text>
          <Text style={styles.cardText}>55%</Text>
        </Card.Content>
      </Card>

      {/* pH Level Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>pH Level</Text>
          <Text style={styles.cardText}>6.8 (Optimal)</Text>
        </Card.Content>
      </Card>

      {/* EC Level Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>EC Level</Text>
          <Text style={styles.cardText}>2.0 mS/cm (Optimal)</Text>
        </Card.Content>
      </Card>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#f0fff4',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginLeft: 10, // Add spacing between icon and title
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    padding: 15,
    marginVertical: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3, // For Android shadow
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  cardText: {
    fontSize: 16,
    color: '#555',
    marginTop: 5,
  },
});
