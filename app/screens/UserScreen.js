import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, TouchableOpacity } from 'react-native';
import COLORS from '../config/colors';
import Icon from 'react-native-vector-icons/MaterialIcons';

const UserScreen = ({ navigation }) => {
  // State to hold user information
  const [name, setName] = useState('John Doe');
  const [email, setEmail] = useState('johndoe@example.com');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    setIsEditing(false);
    console.log("User info saved!");
  };

  const handleLogout = () => {
    console.log("User logged out");
    navigation.navigate('Login');
  };

  return (
    <View style={styles.screenContainer}>

      {/* Header with Back Arrow and Title */}
      <View style={styles.header}>
        <Icon name="arrow-back" size={28} onPress={() => navigation.goBack()} />
        <Text style={styles.title}>User Profile</Text>
      </View>

      {/* User Info Section */}
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Name:</Text>
        {isEditing ? (
          <TextInput style={styles.input} value={name} onChangeText={setName} />
        ) : (
          <Text style={styles.text}>{name}</Text>
        )}

        <Text style={styles.label}>Email:</Text>
        {isEditing ? (
          <TextInput style={styles.input} value={email} onChangeText={setEmail} />
        ) : (
          <Text style={styles.text}>{email}</Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {isEditing ? (
          <Button title="Save Changes" onPress={handleSave} color="#4CAF50" />
        ) : (
          <Button title="Edit Profile" onPress={() => setIsEditing(true)} color="#4CAF50" />
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
      
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#ffffff',
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
    color: COLORS.green,
    marginLeft: 10, // Adds spacing between the icon and title
  },
  infoContainer: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  text: {
    fontSize: 18,
    marginBottom: 15,
    color: '#333',
  },
  input: {
    height: 40,
    borderColor: '#4CAF50',
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 10,
    fontSize: 18,
    marginBottom: 15,
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  logoutButton: {
    marginTop: 20,
    backgroundColor: '#FF4D4D',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  logoutText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default UserScreen;
