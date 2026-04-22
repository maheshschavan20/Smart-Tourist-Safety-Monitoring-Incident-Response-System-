import { View, Text, TouchableOpacity, StyleSheet} from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b141a",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#25D366",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarText: {
    color: "white",
    fontSize: 40,
    fontWeight: "bold",
  },
  name: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
  },
  email: {
    color: "#aaa",
    marginTop: 5,
  },
  logoutBtn: {
    marginTop: 30,
    backgroundColor: "#dc3545",
    padding: 12,
    borderRadius: 8,
  },
});

export default function ProfileScreen() {
  return (
    <View style={styles.container}>

      {/* PROFILE ICON */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {global.username?.charAt(0)}
        </Text>
      </View>

      {/* USER INFO */}
      <Text style={styles.name}>{global.username}</Text>
      <Text style={styles.email}>{global.userEmail}</Text>
      {global.blockchainVerified && (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
    <MaterialCommunityIcons name="shield-check" size={20} color="#4facfe" />
    <Text style={{ color: "#4facfe", marginLeft: 5, fontWeight: 'bold' }}>
      Blockchain Verified ID
    </Text>
  </View>
)}
      {/* LOGOUT */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => {
          global.token = null;
          global.username = null;
          global.userEmail = null;
          alert("Logged out");
        }}
      >
        <Text style={{ color: "white" }}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}
