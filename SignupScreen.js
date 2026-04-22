import React, { useState } from "react";
import { 
  View, TextInput, TouchableOpacity, Text, StyleSheet, 
  KeyboardAvoidingView, Platform, ScrollView, 
  ImageBackground, Dimensions, Image, StatusBar 
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient'; 
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { API } from "../config";

const { width, height } = Dimensions.get("window");

export default function SignupScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!username || !email || !password) {
      alert("All fields required");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/api/auth/signup`, {
        username,
        email: email.toLowerCase(),
        password,
      });
      setLoading(false);
      alert("✅ Registration Successful");
      navigation.navigate("Login");
    } catch (err) {
      setLoading(false);
      alert(err.response?.data?.message || "Signup failed");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <ImageBackground 
        source={require('../assets/images/login_bg_map.png')} // Reusing the same map background
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            
            {/* 🟢 Top Logo Area (Smaller for Signup to fit inputs) */}
            <View style={styles.logoContainer}>
               <View style={styles.logoGlow}>
                  <Image 
                    source={require('../assets/images/icon1.png')} 
                    style={styles.logoIcon}
                  />
               </View>
               <Text style={styles.appTitle}>ENROLL ACCOUNT</Text>
               <Text style={styles.appSubtitle}>Initialize Safety Protocols</Text>
            </View>

            {/* 🟢 Glassmorphism Card */}
            <View style={styles.signupCard}>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.6)" />
                <TextInput 
                  placeholder="Username" 
                  style={styles.inputField} 
                  onChangeText={setUsername}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.6)" />
                <TextInput 
                  placeholder="Email Address" 
                  style={styles.inputField} 
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.6)" />
                <TextInput 
                  placeholder="Password" 
                  style={styles.inputField} 
                  secureTextEntry 
                  onChangeText={setPassword}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="shield-checkmark-outline" size={20} color="rgba(255,255,255,0.6)" />
                <TextInput 
                  placeholder="Confirm Password" 
                  style={styles.inputField} 
                  secureTextEntry 
                  onChangeText={setConfirmPassword}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                />
              </View>

              <TouchableOpacity 
                style={styles.signupBtnContainer} 
                onPress={handleSignup}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#4facfe', '#00f2fe']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.gradientBtn}
                >
                  {loading ? (
                    <Text style={styles.signupBtnText}>PROCESSING...</Text>
                  ) : (
                    <Text style={styles.signupBtnText}>INITIALIZE</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.footer}>
                  <Text style={styles.footerText}>Already Verified? <Text style={styles.loginLink}>Login</Text></Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020412' },
  backgroundImage: { flex: 1, width: width, height: height },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingBottom: 40 },
  logoContainer: { 
    marginTop: height * 0.05, 
    alignItems: 'center', 
    marginBottom: 20 
  },
  logoGlow: {
    width: 80,
    height: 80,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#00f2ff",
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
    marginBottom: 10
  },
  logoIcon: { width: 55, height: 55, resizeMode: 'contain' },
  appTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#00f2ff",
    letterSpacing: 2,
  },
  appSubtitle: {
    fontSize: 12,
    color: "white",
    opacity: 0.7,
    textTransform: 'uppercase',
  },
  signupCard: {
    width: width * 0.88,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 25,
    padding: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 52,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputField: {
    flex: 1,
    marginLeft: 10,
    color: 'white',
    fontSize: 15,
  },
  signupBtnContainer: {
    height: 55,
    borderRadius: 15,
    marginTop: 10,
    overflow: 'hidden',
  },
  gradientBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.5
  },
  footer: { marginTop: 20, alignItems: 'center' },
  footerText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  loginLink: { color: '#00f2ff', fontWeight: 'bold' }
});