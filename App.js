import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import axios from "axios";
import { io } from "socket.io-client";
import { Alert } from "react-native";
import { API } from "./config";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Screen Imports
import IntroScreen from "./screens/IntroScreen";
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import Dashboard from "./screens/Dashboard";
import JoinScreen from "./screens/JoinScreen";
import GroupScreen from "./screens/GroupScreen";
import ChatScreen from "./screens/ChatScreen";
import AssistScreen from "./screens/AssistScreen";
import ProfileScreen from "./screens/ProfileScreen";

const Stack = createNativeStackNavigator();
const LOCATION_TASK_NAME = 'background-location-task';

// 🔗 Deep Linking Configuration
const linking = {
  prefixes: ["touristapp://"],
  config: {
    screens: {
      Join: "join/:groupId",
      Login: "login",
      Signup: "signup",
      Dashboard: "dashboard",
    },
  },
};

// 🛰️ BACKGROUND LOCATION TASK DEFINITION
// This runs even when the app is closed/minimized
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) return;
  if (data) {
    const { locations } = data;
    const { latitude, longitude } = locations[0].coords;

    // 🟢 FIX: Retrieve identity from Storage, NOT global variables
    const savedEmail = await AsyncStorage.getItem('userEmail');
    const savedGroupId = await AsyncStorage.getItem('activeGroupId');

    if (savedEmail && savedGroupId) {
      try {
        await axios.post(`${API}/api/location/update`, {
          email: savedEmail,
          groupId: savedGroupId,
          latitude,
          longitude
        });
      } catch (err) {
        console.log("Background Sync Failed");
      }
    }
  }
});
export default function App() {
  
  useEffect(() => {
    // 🔌 INITIALIZE REAL-TIME SOCKETS
    const socket = io(API);

    socket.on("connect", () => {
      console.log("Connected to Safety Server");
    });

    // 🤖 LISTEN FOR AI GEOFENCE ALERTS
    socket.on("AI_GEOFENCE_BREACH", (data) => {
      if (data.email === global.userEmail) {
        Alert.alert(
          "🚨 Safety Warning",
          "AI Detection: You have wandered outside the safe geofence. Please return to the group area.",
          [{ text: "OK" }]
        );
      }
    });

    return () => socket.disconnect();
  }, []);

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator initialRouteName="Intro" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Intro" component={IntroScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Dashboard" component={Dashboard} />
        <Stack.Screen name="Join" component={JoinScreen} />
        <Stack.Screen name="Group" component={GroupScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Assist" component={AssistScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}