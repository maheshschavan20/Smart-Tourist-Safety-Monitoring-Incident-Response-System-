import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, Linking } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from "expo-location";

export default function IntroScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    checkLocation();
  }, []);

  const checkLocation = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // 1️⃣ Check if Location Services (GPS) are enabled on the device
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        setLoading(false);
        Alert.alert(
          "GPS Disabled",
          "Your device's location services are turned off. Please turn them on to continue.",
          [
            { text: "Try Again", onPress: () => checkLocation() },
            // On Android, this opens the location settings directly
            { text: "Open Settings", onPress: () => Location.enableNetworkProviderAsync().then(() => checkLocation()) }
          ]
        );
        return;
      }

      // 2️⃣ Request Foreground Permissions
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setLoading(false);
        Alert.alert(
          "Permission Required",
          "Location access is mandatory for your safety. Please allow it in settings.",
          [
            { text: "Try Again", onPress: () => checkLocation() },
            { text: "Open App Settings", onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      // ✅ Success: Move to Login
      setLoading(false);
      // Optional: Auto-navigate to Login if everything is perfect
      // navigation.navigate("Login");

    } catch (err) {
      console.log("Location error:", err);
      setLoading(false);
      setErrorMsg("Something went wrong with GPS.");
    }
  };

  return (
    <LinearGradient colors={['#101011', '#0072ff']} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logoIcon}>🌍</Text>
        <Text style={styles.title}>SmartTourist</Text>
        <Text style={styles.tagline}>
          Your safety is our priority, anywhere in the world.
        </Text>

        {loading ? (
          <View style={styles.statusBox}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.statusText}>Securing your location...</Text>
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            {errorMsg && <Text style={{ color: 'yellow', marginBottom: 10 }}>{errorMsg}</Text>}
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.continueText}>Get Started</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={checkLocation} style={{ marginTop: 20 }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', textDecorationLine: 'underline' }}>
                Refresh Status
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  logoIcon: { fontSize: 80, marginBottom: 10 },
  title: { fontSize: 32, fontWeight: 'bold', color: 'white', letterSpacing: 1 },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 50
  },
  statusBox: { alignItems: 'center' },
  statusText: { color: 'white', marginTop: 15, fontSize: 16 },
  continueBtn: {
    backgroundColor: 'white',
    paddingHorizontal: 50,
    paddingVertical: 15,
    borderRadius: 30,
    elevation: 5
  },
  continueText: {
    color: '#0072ff',
    fontWeight: 'bold',
    fontSize: 18
  }
});