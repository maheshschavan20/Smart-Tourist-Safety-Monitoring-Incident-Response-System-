import { useState } from "react";
import { 
  View, TextInput, TouchableOpacity, Text, StyleSheet, 
  KeyboardAvoidingView, Platform, ActivityIndicator, 
  ImageBackground, Dimensions, Image 
} from "react-native";
import axios from "axios";
import { API } from "../config";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get("window");

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/auth/login`, { email, password });
      const { token, user } = res.data; 

      if (token && user) {
        global.token = token;
        global.userEmail = user.email;
        global.username = user.username;
        global.blockchainVerified = user.blockchainVerified;

        await AsyncStorage.setItem('userEmail', user.email);
        
        const pendingGroupId = await AsyncStorage.getItem("pendingGroupId");
        if (pendingGroupId) {
          try {
            await axios.post(`${API}/api/join/${pendingGroupId}`, 
              { email: user.email },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            await AsyncStorage.removeItem("pendingGroupId");
          } catch (joinErr) {
            console.log("Auto-join failed:", joinErr.message);
          }
        }

        setLoading(false);
        navigation.navigate("Dashboard");
      } else {
        throw new Error("Invalid response structure from server");
      }
    } catch (err) {
      setLoading(false);
      alert(err.response?.data?.message || "Login Failed");
    }
  };

  return (
    <View style={styles.container}>
      {/* 🟢 Background Image matching your shared visual */}
      <ImageBackground 
        source={require('../assets/images/login_bg_map.png')} // The map background
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={{ flex: 1 }}
        >
          {/* 🟢 Top Logo Area */}
          <View style={styles.logoContainer}>
             <View style={styles.logoGlow}>
                <Image 
                  source={require('../assets/images/icon1.png')} 
                  style={styles.logoIcon}
                />
             </View>
          </View>

          {/* 🟢 Login Card (Glassmorphism) */}
          <View style={styles.loginCard}>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.6)" />
              <TextInput 
                placeholder="Username" 
                style={styles.inputField} 
                onChangeText={(text) => setEmail(text.trim())}
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

            <TouchableOpacity 
              style={styles.loginBtnContainer} 
              onPress={handleLogin}
              disabled={loading}
            >
              <LinearGradient
                colors={['#4facfe', '#00f2fe']} // Blue to Cyan gradient like the image
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.gradientBtn}
              >
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.loginBtnText}>Login</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate("Signup")} style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account? <Text style={styles.signupLink}>Sign Up</Text></Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020412' },
  backgroundImage: { flex: 1, width: width, height: height * 0.7 },
  logoContainer: { 
    marginTop: height * 0.1, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  logoGlow: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#00f2ff",
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  logoIcon: { width: 70, height: 70, resizeMode: 'contain' },
  loginCard: {
    position: 'absolute',
    bottom: 50,
    width: width * 0.85,
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
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 55,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputField: {
    flex: 1,
    marginLeft: 10,
    color: 'white',
    fontSize: 16,
  },
  loginBtnContainer: {
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
  loginBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: { marginTop: 20, alignItems: 'center' },
  footerText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  signupLink: { color: '#00f2ff', fontWeight: 'bold' }
});