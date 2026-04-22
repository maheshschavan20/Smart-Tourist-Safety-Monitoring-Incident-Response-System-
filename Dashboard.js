import { API } from "../config";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  ScrollView,
  Keyboard,
  ImageBackground // 🟢 Added for glassmorphism consistency
} from "react-native";
import axios from "axios";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

export default function Dashboard() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  
  // 🟢 MODE STATE
  const [isOffline, setIsOffline] = useState(false); 
  
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});

 const fetchGroups = async () => {
    try {
      const res = await axios.get(`${API}/api/user/my-groups/${global.userEmail}`, { timeout: 5000 });
      
      // ✅ SUCCESS: Cache the data for offline P2P use
      await AsyncStorage.setItem('cached_groups', JSON.stringify(res.data));
      setGroups(res.data);
      setIsOffline(false);
    } catch (err) {
      console.log("Network unreachable, initiating P2P Offline Mode");
      
      // 💾 OFFLINE: Retrieve last known data from local cache
      const cachedData = await AsyncStorage.getItem('cached_groups');
      if (cachedData) {
        setGroups(JSON.parse(cachedData));
        setIsOffline(true);
      } else {
        setIsOffline(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCounts = useCallback(async () => {
    if (isOffline) return; // Don't fetch if offline
    try {
      const counts = {};
      for (let g of groups) {
        const [resG, resA] = await Promise.all([
          axios.get(`${API}/api/messages/${g._id}?chatType=group`),
          axios.get(`${API}/api/messages/${g._id}?chatType=quick`)
        ]);

        const lastG = await AsyncStorage.getItem(`lastSeen_group_${g._id}`);
        const lastA = await AsyncStorage.getItem(`lastSeen_assist_${g._id}`);

        const unreadG = resG.data.filter((m, i) => 
          m.senderName !== global.username && i > resG.data.findIndex(x => String(x._id) === String(lastG))
        ).length;
        
        const unreadA = resA.data.filter((m, i) => 
          m.senderName !== global.username && i > resA.data.findIndex(x => String(x._id) === String(lastA))
        ).length;

        counts[g._id] = unreadG + unreadA;
      }
      setUnreadCounts(counts);
    } catch (err) {
      console.log("Unread sync error:", err);
    }
  }, [groups, isOffline]);

  useEffect(() => {
    if (isFocused) {
      fetchGroups();
    }
  }, [isFocused]);

  useEffect(() => {
    if (isFocused && groups.length > 0 && !isOffline) {
      fetchUnreadCounts();
      const interval = setInterval(fetchUnreadCounts, 5000);
      return () => clearInterval(interval);
    }
  }, [isFocused, groups, fetchUnreadCounts, isOffline]);

  const { filteredActive, filteredExpired } = useMemo(() => {
    const now = new Date();
    const searchLower = search.toLowerCase();
    const filtered = groups.filter(g => 
      g.destination?.toLowerCase().includes(searchLower) ||
      g.name?.toLowerCase().includes(searchLower)
    );
    return {
      filteredActive: filtered.filter(g => new Date(g.endDate) >= now),
      filteredExpired: filtered.filter(g => new Date(g.endDate) < now)
    };
  }, [groups, search]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00f2ff" />
      </View>
    );
  }

  // --- 🟢 OFFLINE MODE RENDER ---
  // --- 🟢 OFFLINE P2P RENDER ---
  if (isOffline && groups.length > 0) {
    // 🔍 Filter logic: Only show groups where the current date is before the end date
    const activeOfflineGroups = groups.filter(item => new Date(item.endDate) >= new Date());

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ImageBackground source={require('../assets/images/login_bg_map.png')} style={StyleSheet.absoluteFillObject} opacity={0.2} />
        
        <View style={styles.topBar}>
          <View>
            <Text style={[styles.adminTag, { color: '#ff9f43' }]}>🛰️ P2P MESH ACTIVE</Text>
            <Text style={styles.mainTitle}>Offline Hub</Text>
          </View>
          <TouchableOpacity onPress={fetchGroups} style={[styles.profileCircle, {borderColor: '#ff9f43'}]}>
             <Ionicons name="refresh" size={20} color="#ff9f43" />
          </TouchableOpacity>
        </View>

        {/* P2P Connectivity Banner */}
        <View style={styles.p2pBanner}>
          <MaterialCommunityIcons name="sync-alert" size={16} color="#ff9f43" />
          <Text style={styles.p2pText}>Monitoring {activeOfflineGroups.length} Active Local Perimeters</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {activeOfflineGroups.length > 0 ? (
            activeOfflineGroups.map(item => (
              <TouchableOpacity 
                 key={item._id} 
                 style={[styles.groupCard, { borderColor: 'rgba(255, 159, 67, 0.4)' }]}
                 onPress={() => navigation.navigate("Group", { group: item, offline: true })}
              >
                 <View style={styles.cardMain}>
                    <FontAwesome5 name="broadcast-tower" size={20} color="#ff9f43" />
                    <View style={styles.infoCol}>
                      <Text style={styles.destName}>{item.destination}</Text>
                      <Text style={styles.dateRange}>CACHED PERIMETER: {item.safeRadius}m</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                 </View>
              </TouchableOpacity>
            ))
          ) : (
            /* 🚫 Fallback if no cached groups are active */
            <View style={[styles.offlineCard, { marginTop: 20, height: 200 }]}>
               <MaterialCommunityIcons name="clock-alert-outline" size={50} color="rgba(255,159,67,0.5)" />
               <Text style={[styles.offlineTitle, { fontSize: 16 }]}>No Active Cached Sessions</Text>
               <Text style={[styles.offlineSub, { fontSize: 12 }]}>All your stored trips have expired. Connect to the grid to sync new tours.</Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.emergencySmsBtn} 
            onPress={() => Alert.alert("SMS Fallback", "This would trigger a direct SMS with your coordinates to the Admin.")}
          >
            <Ionicons name="mail-unread" size={20} color="white" />
            <Text style={styles.retryText}> TRIGGER EMERGENCY SMS</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
  // --- 🔵 ONLINE MODE RENDER (Same as previous) ---
  const renderGroupCard = (item, isExpired = false) => (
    <TouchableOpacity
      key={item._id}
      activeOpacity={isExpired ? 0.7 : 0.9}
      style={[styles.groupCard, isExpired && styles.expiredCard]}
      onPress={() => !isExpired && navigation.navigate("Group", { group: item })}
    >
      <View style={styles.cardMain}>
        <View style={[styles.iconSquare, isExpired && styles.expiredIconSquare]}>
          <FontAwesome5 
            name={isExpired ? "history" : "map-marked-alt"} 
            size={18} 
            color={isExpired ? "#867272" : "#87f57d"} 
          />
        </View>
        <View style={styles.infoCol}>
          <Text style={[styles.destName, isExpired && styles.expiredText]} numberOfLines={1}>
            {item.destination}
          </Text>
          <Text style={styles.dateRange}>
            {item.startDate?.slice(0,10)} — {item.endDate?.slice(0,10)}
          </Text>
        </View>
        <View style={styles.statusCol}>
          <View style={[styles.statusDot, { backgroundColor: isExpired ? "#fe3e3e" : "#62c913" }]} />
          <Text style={[styles.statusText, { color: isExpired ? "#555" : "#2ecc71" }]}>
            {isExpired ? "Ended" : "Active"}
          </Text>
        </View>
      </View>

      {!isExpired && unreadCounts[item._id] > 0 && (
        <View style={styles.alertBadge}>
          <Ionicons name="notifications" size={12} color="#00f2ff" style={{ marginRight: 5 }} />
          <Text style={styles.alertText}>{unreadCounts[item._id]} SYSTEM ALERTS</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground source={require('../assets/images/login_bg_map.png')} style={StyleSheet.absoluteFillObject} opacity={0.4} />
      
      <View style={styles.topBar}>
        <View>
          <Text style={styles.adminTag}>COMMAND CENTER</Text>
          <Text style={styles.mainTitle}>Dashboard</Text>
        </View>
        <View style={{flexDirection: 'row', gap: 15, alignItems: 'center'}}>
            <TouchableOpacity onPress={() => setIsOffline(true)}>
                <Ionicons name="cloud-offline-outline" size={24} color="rgba(31, 138, 204, 0.5)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate("Profile")} style={styles.profileCircle}>
                <Text style={styles.profileText}>{global.username?.charAt(0).toUpperCase() || "U"}</Text>
            </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{filteredActive.length}</Text>
          <Text style={styles.statLab}>Active Zones</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, {color: '#00f2ff'}]}>
            {Object.values(unreadCounts).reduce((a, b) => a + b, 0)}
          </Text>
          <Text style={styles.statLab}>Secure Logs</Text>
        </View>
      </View>

      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={18} color="#268c92" />
        <TextInput
          placeholder="Filter Secure Channels..."
          placeholderTextColor="rgba(255, 254, 254, 0.68)"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInner}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.sectionLabel}>Active Perimeter Monitoring</Text>
        {filteredActive.length > 0 ? (
          filteredActive.map(item => renderGroupCard(item, false))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.noDataText}>No active group perimeters found.</Text>
          </View>
        )}

        {filteredExpired.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 25 }]}>Archived Sessions</Text>
            {filteredExpired.map(item => renderGroupCard(item, true))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020412", paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020412' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 50, marginBottom: 25 },
  adminTag: { fontSize: 10, fontWeight: 'bold', color: '#00f2ff', letterSpacing: 2 },
  mainTitle: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  profileCircle: { width: 45, height: 45, borderRadius: 12, backgroundColor: 'rgba(0, 242, 255, 0.2)', borderWidth: 1, borderColor: '#00f2ff', justifyContent: 'center', alignItems: 'center' },
  profileText: { color: '#00f2ff', fontWeight: 'bold', fontSize: 18 },
  
  statsRow: { flexDirection: 'row', gap: 15, marginBottom: 25 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statNum: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  statLab: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
  
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 25 },
  searchInner: { flex: 1, marginLeft: 10, fontSize: 15, color: 'white' },
  
  sectionLabel: { fontSize: 11, fontWeight: 'bold', color: '#00f2ff', letterSpacing: 1.5, marginBottom: 15, textTransform: 'uppercase' },
  
  groupCard: { backgroundColor: 'rgba(251, 248, 248, 0.57)', borderRadius: 18, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(69, 232, 74, 0.1)' },
  expiredCard: { opacity: 20, backgroundColor: 'rgba(255, 255, 255, 0.6)' },
  cardMain: { flexDirection: 'row', alignItems: 'center' },
  iconSquare: { width: 42, height: 42, backgroundColor: 'rgba(196, 238, 240, 0.67)', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  infoCol: { flex: 1, marginLeft: 15 },
  destName: { fontSize: 17, fontWeight: 'bold', color: 'white' },
  dateRange: { fontSize: 11, color: 'rgba(255, 255, 255, 0.86)', marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 3 },
  statusText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  alertBadge: { backgroundColor: 'rgba(0, 242, 255, 0.1)', marginTop: 12, padding: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 242, 255, 0.2)' },
  alertText: { fontSize: 10, color: '#00f2ff', fontWeight: 'bold', letterSpacing: 1 },
  
  // 🟢 OFFLINE STYLES
  offlineCard: { flex: 0.8, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 30, margin: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  offlineTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginTop: 20 },
  offlineSub: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', paddingHorizontal: 40, marginTop: 10 },
  retryBtn: { marginTop: 30, backgroundColor: '#00f2ff', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 12 },
  retryText: { color: '#020412', fontWeight: 'bold', letterSpacing: 1 },
  p2pBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 159, 67, 0.1)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 67, 0.2)'
  },
  p2pText: {
    color: '#ff9f43',
    fontSize: 11,
    marginLeft: 10,
    fontWeight: '600'
  },
  emergencySmsBtn: {
    marginTop: 30,
    backgroundColor: '#fe3e3e',
    paddingVertical: 15,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#fe3e3e",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5
  },
  retryText: { 
    color: 'white', 
    fontWeight: 'bold', 
    letterSpacing: 1 
  },
});