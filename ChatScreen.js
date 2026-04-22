import { API } from "../config";
import { useState, useEffect, useRef } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChatScreen({ route }) {
  const { group } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const flatListRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API}/api/messages/${group._id}?chatType=group`);
      setMessages(res.data);

      // ✅ SYNC UNREAD: Mark as read immediately
      if (res.data.length > 0) {
        const latestId = res.data[res.data.length - 1]._id;
        await AsyncStorage.setItem(`lastSeen_group_${group._id}`, latestId);
      }
    } catch (err) {
      console.log("Fetch error:", err);
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
        groupId: group._id, text, chatType: "group",
      }, { headers: { Authorization: global.token } });
      setText("");
      fetchMessages();
    } catch (err) {
      console.log("Send error:", err);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#e5ddd5" }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={90}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isMe = item.senderName === global.username;
          return (
            <View style={[styles.bubble, isMe ? styles.myBubble : styles.memberBubble]}>
              {!isMe && <Text style={styles.senderName}>{item.senderName}</Text>}
              <Text style={styles.msgText}>{item.text}</Text>
            </View>
          );
        }}
      />
      <View style={styles.inputContainer}>
        <TextInput value={text} onChangeText={setText} placeholder="Message group..." style={styles.input} />
        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}><Text style={{ color: "white", fontWeight: "bold" }}>Send</Text></TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { padding: 10, marginVertical: 4, marginHorizontal: 12, borderRadius: 10, maxWidth: "78%" },
  myBubble: { alignSelf: "flex-end", backgroundColor: "#dcf8c6", elevation: 1 },
  memberBubble: { alignSelf: "flex-start", backgroundColor: "#fff", elevation: 1 },
  senderName: { color: "#075e54", fontWeight: "bold", fontSize: 12, marginBottom: 2 },
  msgText: { fontSize: 16, color: "#000" },
  inputContainer: { flexDirection: "row", padding: 10, backgroundColor: "#fff" },
  input: { flex: 1, backgroundColor: "#f0f0f0", borderRadius: 25, paddingHorizontal: 15, height: 45, marginRight: 8 },
  sendBtn: { backgroundColor: "#25D366", width: 60, borderRadius: 25, justifyContent: "center", alignItems: "center" }
});