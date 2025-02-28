import React, { useState, useEffect } from 'react';
import Constants from 'expo-constants';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  Button, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  ScrollView, 
  Platform 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import COLORS from '../config/colors';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

// Cloudinary credentials
const { cloudinaryCloudName, cloudinaryUploadPreset } = Constants.expoConfig.extra;

const UserScreen = ({ navigation }) => {
  // User state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bio, setBio] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileImageUri, setProfileImageUri] = useState(null);

  // Default profile image
  const defaultImage = require('../assets/profile.jpg');

  // Fetch user data from Firestore
  const fetchUserData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setName(userData.name || '');
          setEmail(userData.email || '');
          setPhone(userData.phone || '');
          setAddress(userData.address || '');
          setBio(userData.bio || '');
          setProfileImageUri(userData.profileImage || null);
        } else {
          console.log("No user document found!");
        }
      } else {
        console.log("No logged-in user");
        navigation.navigate('Login');
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // Pick an image from the gallery
  const pickImage = async () => {
    let permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert("Permission to access gallery is required!");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Fixed API usage
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setProfileImageUri(result.assets[0].uri); // Corrected API usage
    }
  };

  // Upload image to Cloudinary
  const uploadImageAsync = async (uri) => {
    try {
      const formData = new FormData();
      formData.append("file", {
        uri: uri,
        type: "image/jpeg", // Ensure correct MIME type
        name: "profile.jpg",
      });
      formData.append("upload_preset", cloudinaryUploadPreset);

      console.log("Uploading image to Cloudinary...");

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log("Cloudinary Response:", data);

      if (!data.secure_url) {
        throw new Error("Upload failed. Check Cloudinary preset/API key.");
      }

      return data.secure_url;
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    }
  };

  // Save user data
  const handleSave = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      let updatedProfileImageUrl = profileImageUri;

      // Upload image only if it's a local file
      if (profileImageUri && profileImageUri.startsWith('file://')) {
        updatedProfileImageUrl = await uploadImageAsync(profileImageUri);
        if (!updatedProfileImageUrl) {
          alert("Image upload failed! Please try again.");
          return;
        }
      }

      // Update Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        name,
        email,
        phone,
        address,
        bio,
        profileImage: updatedProfileImageUrl || null,
      });

      console.log("User info saved to Firestore!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving user data:", error);
    }
  };

  // Logout
  const handleLogout = () => {
    console.log("User logged out");
    navigation.navigate('Login');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.green} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.screenContainer}>
          <View style={styles.header}>
            <Icon name="arrow-back" size={28} onPress={() => navigation.goBack()} />
            <Text style={styles.title}>User Profile</Text>
          </View>

          <TouchableOpacity style={styles.imageContainer} onPress={isEditing ? pickImage : null}>
            <Image source={profileImageUri ? { uri: profileImageUri } : defaultImage} style={styles.profileImage} />
            {isEditing && <View style={styles.editIcon}><Icon name="edit" size={20} color="#fff" /></View>}
          </TouchableOpacity>

          <View style={styles.infoContainer}>
            {[
              { label: "Name", value: name, setter: setName },
              { label: "Email", value: email, setter: setEmail },
              { label: "Phone", value: phone, setter: setPhone },
              { label: "Address", value: address, setter: setAddress },
              { label: "Bio", value: bio, setter: setBio, multiline: true }
            ].map(({ label, value, setter, multiline }, index) => (
              <View key={index}>
                <Text style={styles.label}>{label}:</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, multiline && { height: 80 }]}
                    value={value}
                    onChangeText={setter}
                    placeholder={`Enter your ${label.toLowerCase()}`}
                    multiline={multiline}
                  />
                ) : (
                  <Text style={styles.text}>{value || `${label} not provided`}</Text>
                )}
              </View>
            ))}
          </View>

          <View style={styles.actionsContainer}>
            <Button title={isEditing ? "Save Changes" : "Edit Profile"} onPress={isEditing ? handleSave : () => setIsEditing(true)} color="#4CAF50" />
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  screenContainer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginLeft: 10,
  },
  imageContainer: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: COLORS.green,
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    padding: 5,
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
