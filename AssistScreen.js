import { API } from "../config";
import { View, Text, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AssistScreen({ route }) {
  const { group } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const flatListRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API}/api/messages/${group._id}?chatType=quick`);
      setMessages(res.data);

      // ✅ SYNC UNREAD: Mark as read immediately
      if (res.data.length > 0) {
        const latestId = res.data[res.data.length - 1]._id;
        await AsyncStorage.setItem(`lastSeen_assist_${group._id}`, latestId);
      }
    } catch (err) {
      console.log("Assist fetch error:", err);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = async () => {
    if (!text.trim()) return;
    try {
      await axios.post(`${API}/api/messages/send`, {
        groupId: group._id,
        text,
        chatType: "quick",
      }, { headers: { Authorization: global.token } });
      setText("");
      fetchMessages();
    } catch (err) {
      console.log("Send error:", err);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#f0f2f5" }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={90}>
      <View style={styles.header}><Text style={styles.headerText}>🤖 Admin Support</Text></View>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isMe = item.senderName === global.username;
          return (
            <View style={[styles.bubble, isMe ? styles.myBubble : styles.adminBubble]}>
              <Text style={styles.senderName}>{item.senderName}</Text>
              <Text style={styles.msgText}>{item.text}</Text>
            </View>
          );
        }}
      />
      <View style={styles.inputContainer}>
        <TextInput value={text} onChangeText={setText} placeholder="Need help?" style={styles.input} multiline />
        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}><Text style={{ color: "white", fontWeight: "bold" }}>Send</Text></TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 15, backgroundColor: "#4facfe", alignItems: 'center' },
  headerText: { color: "white", fontWeight: "bold", fontSize: 18 },
  bubble: { padding: 12, marginVertical: 5, marginHorizontal: 10, borderRadius: 15, maxWidth: "80%" },
  myBubble: { alignSelf: "flex-end", backgroundColor: "#007bff", borderBottomRightRadius: 2 },
  adminBubble: { alignSelf: "flex-start", backgroundColor: "#fff", borderBottomLeftRadius: 2, elevation: 2 },
  senderName: { fontSize: 11, fontWeight: "bold", color: "#666", marginBottom: 2 },
  msgText: { color: "#333", fontSize: 15 },
  inputContainer: { flexDirection: "row", padding: 10, backgroundColor: "#fff", borderTopWidth: 1, borderColor: "#eee" },
  input: { flex: 1, backgroundColor: "#f8f9fa", borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, marginRight: 10 },
  sendBtn: { backgroundColor: "#4facfe", paddingHorizontal: 20, justifyContent: "center", borderRadius: 20 }
});