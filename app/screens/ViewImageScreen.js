import React from 'react';
import { Image, StyleSheet, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import colors from '../config/colors';

function ViewImageScreen() {
    const navigation = useNavigation(); // Access navigation

    return (
        <View style={styles.container}>
            {/* Close Button - Navigates Back to Welcome Screen */}
            <TouchableOpacity 
                style={styles.closeIcon} 
                onPress={() => navigation.navigate('Welcome')}
            >
                <View style={styles.iconPlaceholder} /> 
            </TouchableOpacity>

            {/* Delete Button (No action assigned yet) */}
            <TouchableOpacity 
                style={styles.DeleteIcon} 
                onPress={() => console.log("Delete Pressed")} // Placeholder action
            >
                <View style={styles.iconPlaceholder} />
            </TouchableOpacity>

            {/* Image Display */}
            <Image
                resizeMode="contain"
                style={styles.image}
                source={require("../assets/chair.jpg")}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    closeIcon: {
        width: 50,
        height: 50,
        backgroundColor: colors.primary,
        position: 'absolute',
        top: 40,
        left: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: colors.green,
        flex: 1,
    },
    DeleteIcon: {
        width: 50,
        height: 50,
        backgroundColor: colors.secondary,
        position: 'absolute',
        top: 40,
        right: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    iconPlaceholder: {
        width: 40,
        height: 40,
        backgroundColor: 'transparent', // Invisible but ensures touch is registered
    },
});

export default ViewImageScreen;
