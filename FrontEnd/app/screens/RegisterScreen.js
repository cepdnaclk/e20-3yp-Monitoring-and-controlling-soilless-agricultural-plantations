import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  Alert 
} from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig'; 
import COLORS from '../config/colors';

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'All fields are required!');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await updateProfile(user, { displayName: name });

      const userRef = doc(db, 'users', user.uid);

      await setDoc(userRef, {
        name,
        email,
        createdAt: serverTimestamp(),
      });

      // Initialize subcollections
      await Promise.all([
        setDoc(doc(db, `users/${user.uid}/deviceGroups/${groupId}/active_commands`, 'init'), {

        }),
        setDoc(doc(db, `users/${user.uid}/deviceGroups/${groupId}/alerts`, 'init'), {
          createdAt: serverTimestamp(),
          status: 'init'
        }),
        setDoc(doc(db, `users/${user.uid}/deviceGroups/${groupId}/control_settings`, 'init'), {
          createdAt: serverTimestamp(),
          threshold_ph: 7,
          mode: 'auto'
        }),
        setDoc(doc(db, `users/${user.uid}/deviceGroups/${groupId}/stop_settings`, 'init'), {
          createdAt: serverTimestamp(),
          mode: 'manual'
        }),
        setDoc(doc(db, `users/${user.uid}/deviceGroups/${groupId}/sensor_data`, '1'), {
          ec: 3.5,
          humidity: 45,
          light_intensity: 75,
          ph: 12,
          soil_moisture: 31,
          temperature: 26.3,
          water_level: "critical",
          timestamp: serverTimestamp()
        }),
      ]);

      Alert.alert('Success', 'Account and default data created!');
      navigation.navigate('Home', { userId: user.uid });


    } catch (error) {
      Alert.alert('Registration Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        placeholderTextColor="#666"
        value={name}
        onChangeText={setName}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#666"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#666"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#f8f9fa'
  },
  title: {
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 20
  },
  input: {
    width: '100%', 
    padding: 15, 
    marginBottom: 15, 
    borderRadius: 8, 
    backgroundColor: '#fff', 
    borderWidth: 1, 
    borderColor: '#ddd',
    color: '#000'
  },
  registerButton: {
    width: '100%', 
    padding: 15, 
    backgroundColor: COLORS.green || "#28a745",
    borderRadius: 8, 
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff', 
    fontSize: 18
  },
  backText: {
    marginTop: 15, 
    color: '#007bff'
  }
});

export default RegisterScreen;
