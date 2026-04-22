import { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function JoinScreen({ route, navigation }) {
  // Extract groupId from the deep link parameters
  const { groupId } = route.params;

  useEffect(() => {
    const prepareJoin = async () => {
      try {
        // 🟢 FIX: Save to persistent storage instead of a global variable
        // This ensures the ID is available even if the JS engine refreshes during login
        await AsyncStorage.setItem("pendingGroupId", groupId);

        alert("Invitation detected! Please login to join your group.");
        
        // Redirect to Login
        navigation.navigate("Login");
      } catch (err) {
        console.error("Error saving pending group:", err);
        navigation.navigate("Login");
      }
    };

    prepareJoin();
  }, [groupId]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4facfe" />
      <Text style={styles.text}>Processing Invitation...</Text>
      <Text style={styles.subText}>Preparing your secure entry to the group.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "#fff" 
  },
  text: { 
    marginTop: 20, 
    fontSize: 18, 
    fontWeight: "bold", 
    color: "#2c3e50" 
  },
  subText: { 
    marginTop: 10, 
    fontSize: 14, 
    color: "#7f8c8d" 
  }
});