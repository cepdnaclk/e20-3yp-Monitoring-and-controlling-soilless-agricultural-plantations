import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  Alert 
} from 'react-native';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig'; 
import COLORS from '../config/colors';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields!');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log("✅ Logged in user:", user.uid);

      Alert.alert('Success', 'Logged in successfully!');
      navigation.navigate('Home', { userId: user.uid });
    } catch (error) {
      console.error("❌ Login Error:", error.message);
      let message = "Something went wrong. Please try again.";
      switch (error.code) {
        case 'auth/invalid-email':
          message = "Invalid email format.";
          break;
        case 'auth/user-not-found':
          message = "No user found with this email.";
          break;
        case 'auth/wrong-password':
          message = "Incorrect password.";
          break;
        case 'auth/network-request-failed':
          message = "Network error. Check your internet connection.";
          break;
        case 'auth/too-many-requests':
          message = "Too many login attempts. Please try again later.";
          break;
      }

      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Reset Password', 'Please enter your email first.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Reset Email Sent', 'Please check your inbox to reset your password.');
    } catch (error) {
      console.error("❌ Password Reset Error:", error.message);
      let message = "Something went wrong. Please try again.";
      switch (error.code) {
        case 'auth/invalid-email':
          message = "Invalid email format.";
          break;
        case 'auth/user-not-found':
          message = "No user found with this email.";
          break;
      }
      Alert.alert('Reset Failed', message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#666"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        color="#000"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#666"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        color="#000"
      />

      <TouchableOpacity onPress={handleForgotPassword}>
        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.registerButton} 
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Signing In..." : "Sign In"}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.backText}>Don't have an account? Sign Up</Text>
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
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#000',
  },
  forgotPasswordText: {
    color: '#007bff',
    alignSelf: 'flex-end',
    marginBottom: 15,
  },
  registerButton: {
    width: '100%',
    padding: 15,
    backgroundColor: COLORS.green || "#28a745",
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
  backText: {
    marginTop: 15,
    color: '#007bff',
  },
});

export default LoginScreen;
