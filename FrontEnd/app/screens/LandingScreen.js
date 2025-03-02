import React, { useState } from 'react';
import {
  View,
  SafeAreaView,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import COLORS from '../config/colors';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Firestore reference

const LandingScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [plantations, setPlantations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 🔥 Fetch a plant document by its ID (document name)
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Enter a plant name to search.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const docRef = doc(db, 'plants', searchQuery.trim()); // 🔥 Fetch by document ID
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setError(`No plantation found for "${searchQuery}".`);
        setPlantations([]);
      } else {
        const plantData = docSnap.data();

        // Fetch data from subcollections
        const ecData = await fetchSubcollectionData(docRef, 'ec');
        const phData = await fetchSubcollectionData(docRef, 'ph');
        const temperatureData = await fetchSubcollectionData(docRef, 'temperature');
        const lightIntensityData = await fetchSubcollectionData(docRef, 'light_intensity');

        // Merging subcollection data into the plant document
        setPlantations([{
          id: docSnap.id,
          ...plantData,
          ec: ecData,
          ph: phData,
          temperature: temperatureData,
          light_intensity: lightIntensityData,
        }]);
      }
    } catch (error) {
      console.error('❌ Firestore Error:', error);
      setError('Error fetching data. Please try again.');
    }

    setLoading(false);
  };

  // Function to fetch data from a subcollection
  const fetchSubcollectionData = async (docRef, subcollectionName) => {
    try {
      const subCollectionRef = collection(docRef, subcollectionName); // Reference to the subcollection
      const subCollectionSnap = await getDocs(subCollectionRef);

      // Return the data from the subcollection, mapping each document's data
      return subCollectionSnap.docs.map(doc => doc.data());
    } catch (error) {
      console.error(`❌ Error fetching subcollection ${subcollectionName}:`, error);
      return [];
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, paddingHorizontal: 20, backgroundColor: COLORS.white }}>
      <View style={styles.header}>
        <Text style={styles.title}>Plantations</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={25} style={styles.searchIcon} />
          <TextInput 
            placeholder="Search for a plant" 
            style={styles.input} 
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="words"
          />
        </View>
        <TouchableOpacity onPress={handleSearch} style={styles.addButton}>
          <Icon name="add" size={30} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Error Message */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Show Loading */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.green} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={plantations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <Text style={styles.listText}>🌱 {item.id}</Text>
              {item.type && <Text style={styles.listSubText}>Type: {item.type}</Text>}

              {/* Displaying subcollection data */}
              {item.ec && item.ec.length > 0 && (
                <Text style={styles.listSubText}>EC: {item.ec.map((data, idx) => `Value ${idx + 1}: ${data.value}`).join(', ')}</Text>
              )}
              {item.ph && item.ph.length > 0 && (
                <Text style={styles.listSubText}>pH: {item.ph.map((data, idx) => `Value ${idx + 1}: ${data.value}`).join(', ')}</Text>
              )}
              {item.temperature && item.temperature.length > 0 && (
                <Text style={styles.listSubText}>Temperature: {item.temperature.map((data, idx) => `Value ${idx + 1}: ${data.value}`).join(', ')}</Text>
              )}
              {item.light_intensity && item.light_intensity.length > 0 && (
                <Text style={styles.listSubText}>Light Intensity: {item.light_intensity.map((data, idx) => `Value ${idx + 1}: ${data.value}`).join(', ')}</Text>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: { marginTop: 30 },
  title: { fontSize: 38, color: COLORS.green, fontWeight: 'bold' },
  searchWrapper: { marginTop: 30, flexDirection: 'row' },
  searchContainer: {
    height: 50,
    backgroundColor: COLORS.light,
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: { marginLeft: 20 },
  input: { fontSize: 18, fontWeight: 'bold', flex: 1, color: COLORS.dark },
  addButton: {
    marginLeft: 10,
    height: 50,
    width: 50,
    borderRadius: 10,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: { color: 'red', marginTop: 10, textAlign: 'center' },
  listItem: {
    padding: 15,
    marginVertical: 5,
    backgroundColor: COLORS.light,
    borderRadius: 8,
  },
  listText: { fontSize: 18, fontWeight: 'bold' },
  listSubText: { fontSize: 14, color: COLORS.darkGray },
});

export default LandingScreen;
