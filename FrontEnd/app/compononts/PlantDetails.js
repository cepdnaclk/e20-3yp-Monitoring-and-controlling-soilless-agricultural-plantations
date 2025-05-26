import React from 'react';
import { View, SafeAreaView, Image, Text, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import COLORS from '../config/colors';

const DetailsScreen = ({ navigation, route }) => {
  const plant = route.params;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
      <View style={style.header}>
        <Icon name="arrow-back" size={28} onPress={() => navigation.goBack()} />
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={style.imageContainer}>
          <Image source={plant.img} style={{ resizeMode: 'contain', flex: 1 }} />
        </View>

        <View style={style.detailsContainer}>
          <View style={style.labelContainer}>
            <View style={style.line} />
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Optimal Conditions</Text>
          </View>

          <View style={style.titleContainer}>
            <Text style={{ fontSize: 22, fontWeight: 'bold' }}>{plant.name}</Text>
          </View>

          <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold' }}>About</Text>
            <Text style={style.aboutText}>
              {plant.about}
            </Text>

            {/* Growing Conditions */}
            <View style={style.conditionContainer}>
              <Text style={style.conditionTitle}>Growing Conditions:</Text>
              <Text style={style.conditionText}>🌡 Temperature: 18-24°C</Text>
              <Text style={style.conditionText}>💧 pH Level: 5.5 - 6.5</Text>
              <Text style={style.conditionText}>⚡ EC: 1.2 - 2.0 mS/cm</Text>
              <Text style={style.conditionText}>☀️ Light: 12-16 hrs/day</Text>
            </View>

            {/* Monitor Button */}
            
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const style = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  imageContainer: {
    height: 250, // fixed height
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: COLORS.light,
    marginHorizontal: 7,
    marginBottom: 7,
    borderRadius: 20,
    marginTop: 30,
    paddingTop: 30,
  },
  labelContainer: {
    marginLeft: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  line: {
    width: 25,
    height: 2,
    backgroundColor: COLORS.dark,
    marginBottom: 5,
    marginRight: 3,
  },
  titleContainer: {
    marginLeft: 20,
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aboutText: {
    color: 'grey',
    fontSize: 16,
    lineHeight: 22,
    marginTop: 10,
  },
  conditionContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  conditionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  conditionText: {
    fontSize: 16,
    color: 'grey',
    marginBottom: 3,
  },
  monitorBtn: {
    marginTop: 20,
    width: '100%',
    height: 50,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
  },
});

export default DetailsScreen;
