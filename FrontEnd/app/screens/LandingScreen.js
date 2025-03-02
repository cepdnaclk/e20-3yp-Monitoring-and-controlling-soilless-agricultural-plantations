import React, { useState } from 'react';
import {
  View,
  SafeAreaView,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import COLORS from '../config/colors';
import plantsData from '../config/plants';

const width = (Dimensions.get('window').width - 60) / 2; // ✅ Ensures items fit properly in 2-column layout

const LandingScreen = ({ navigation }) => {
  const [plants, setPlants] = useState(plantsData);
  const [newPlantName, setNewPlantName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // ✅ Function to add a new plant
  const addPlantation = () => {
    if (newPlantName.trim() === '') return;
    const newPlant = {
      id: plants.length + 1,
      name: newPlantName,
      img: require('../plants/plant1.png'), // Placeholder image
      about: `A new plantation named ${newPlantName}.`,
    };
    setPlants([...plants, newPlant]);
    setNewPlantName('');
  };

  // ✅ Function to filter plants based on search query
  const filteredPlants = plants.filter((plant) =>
    plant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ✅ Proper touch handling by ensuring full width & height for each item
  const Card = ({ plant }) => {
    return (
      <TouchableOpacity
        style={styles.cardContainer} // ✅ Ensures proper touch area
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Details', plant)}
      >
        <View style={styles.card}>
          <View style={{ height: 100, alignItems: 'center' }}>
            <Image source={plant.img} style={{ flex: 1, resizeMode: 'contain' }} />
          </View>
          <Text style={styles.cardText}>{plant.name}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={{ fontSize: 25, fontWeight: 'bold' }}>Your</Text>
          <Text style={{ fontSize: 38, color: COLORS.green, fontWeight: 'bold' }}>
            Plants
          </Text>
        </View>
      </View>

      {/* 🔍 Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={25} style={{ marginLeft: 20 }} />
          <TextInput
            placeholder="Search plants..."
            style={styles.input}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* ➕ Add Plantation Input */}
      <View style={styles.addPlantContainer}>
        <TextInput
          placeholder="Enter plant name"
          value={newPlantName}
          onChangeText={setNewPlantName}
          style={styles.addPlantInput}
        />
        <TouchableOpacity style={styles.addPlantButton} onPress={addPlantation}>
          <Text style={styles.addPlantButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* 🌱 Display Plant List */}
      <FlatList
        data={filteredPlants}
        numColumns={2}
        keyExtractor={(item) => item.id.toString()}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ marginTop: 10, paddingBottom: 50 }}
        renderItem={({ item }) => <Card plant={item} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, backgroundColor: COLORS.white },
  header: { marginTop: 30 },
  searchWrapper: { marginTop: 30 },
  searchContainer: {
    height: 50,
    backgroundColor: COLORS.light,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: { fontSize: 18, fontWeight: 'bold', flex: 1, color: COLORS.dark },
  addPlantContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  addPlantInput: {
    flex: 1,
    height: 45,
    borderWidth: 1,
    borderColor: COLORS.green,
    borderRadius: 10,
    paddingLeft: 10,
  },
  addPlantButton: {
    marginLeft: 10,
    height: 45,
    paddingHorizontal: 15,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  addPlantButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },

  // ✅ Fix: Ensures TouchableOpacity covers only the intended area
  cardContainer: {
    width, // ✅ Ensures each card has proper width
    marginBottom: 20, // ✅ Prevents overlap with next row
  },

  // ✅ Fix: Ensures proper card size without extra touch area overlap
  card: {
    height: 220,
    backgroundColor: COLORS.light,
    width: '100%', // ✅ Uses full width of parent (cardContainer)
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardText: {
    fontWeight: 'bold',
    fontSize: 17,
    marginTop: 10,
    textAlign: 'center', // ✅ Ensures text is centered properly
  },
});

export default LandingScreen;
