import { API } from "../config";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Keyboard, Platform, ActivityIndicator, ScrollView, Modal } from "react-native";
import { useNavigation, useIsFocused } from "@react-navigation/native"; 
import axios from "axios";
// 🟢 Added Polyline for the live route visual
import MapView, { Marker, Circle, Polyline } from "react-native-maps"; 
import * as Location from "expo-location";
import { useState, useEffect, useRef, useCallback } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons'; 

export default function GroupScreen({ route }) {
  const { group } = route.params;
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const mapRef = useRef(null);

  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sendingSOS, setSendingSOS] = useState(false);
  
  const [currentGroup, setCurrentGroup] = useState(group);
  const [unreadGroup, setUnreadGroup] = useState(0);
  const [unreadAssist, setUnreadAssist] = useState(0);

  // 🚨 BREACH STATES
  const [isBreached, setIsBreached] = useState(false);
  const [myLocation, setMyLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [selectedDistance, setSelectedDistance] = useState(0);
  const [distanceToDest, setDistanceToDest] = useState(0); // 🟢 New state for live distance

  // 🛰️ Distance Calculation (Haversine Formula)
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 🟢 LOGIC: Calculate breach status and update live distance display
  const checkBreach = useCallback((userCoords, groupData) => {
    if (!userCoords || !groupData) return;
    const dist = getDistance(
      userCoords.latitude,
      userCoords.longitude,
      Number(groupData.centerLat),
      Number(groupData.centerLng)
    );
    
    setDistanceToDest(dist); // 🟢 Update state for the UI box
    const radius = Number(groupData.safeRadius) || 500;
    setIsBreached(dist > radius);
  }, []);

  const createSegments = (start, end, steps = 20) => {
    const points = [];

    for (let i = 0; i <= steps; i++) {
      const lat = start.latitude + (end.latitude - start.latitude) * (i / steps);
      const lng = start.longitude + (end.longitude - start.longitude) * (i / steps);

      points.push({ latitude: lat, longitude: lng });
    }

    return points;
  };

  const fetchRoute = async (start, end) => {
    try {
      const dist = getDistance(
        start.latitude,
        start.longitude,
        end.latitude,
        end.longitude
      );

      // ✅ If far distance → skip OSRM
      if (dist > 50000) {
        console.log("Long distance fallback");

        setRouteCoords(createSegments(start, end));
        setSelectedDistance(dist);
        return;
      }

      // ✅ Try OSRM for short distance
      const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;

      const res = await axios.get(url);

      if (res.data.routes && res.data.routes.length > 0) {
        const coords = res.data.routes[0].geometry.coordinates.map(c => ({
          latitude: c[1],
          longitude: c[0]
        }));

        setRouteCoords(coords);
        setSelectedDistance(res.data.routes[0].distance);

      } else {
        throw new Error("No route");
      }

    } catch (err) {
      console.log("Fallback route");

      const dist = getDistance(
        start.latitude,
        start.longitude,
        end.latitude,
        end.longitude
      );

      setRouteCoords(createSegments(start, end));
      setSelectedDistance(dist);
    }
  };
  // 🛰️ 1. START TRACKING SERVICE & BREACH MONITOR
  const startTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      // Real-time listener
      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 3 }, 
        (loc) => {
          setMyLocation(loc.coords);
          checkBreach(loc.coords, currentGroup);
        }
      );

      if (typeof Location.hasStartedLocationUpdatesAsync === 'function') {
        try {
          await Location.startLocationUpdatesAsync("background-location-task", {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 10,
            foregroundService: {
              notificationTitle: "Smart Tourist Safety",
              notificationBody: "Monitoring your location for safety alerts",
              notificationColor: "#4facfe"
            },
          });
        } catch (e) {
          console.log("Background task not registered");
        }
      }
      await AsyncStorage.setItem('activeGroupId', group._id);
      return subscription;
    } catch (err) { console.log("Tracking error:", err.message); }
  };

  // 🚨 2. SOS FUNCTION
  const sendSOS = async () => {
    try {
      setSendingSOS(true);
      const userLoc = await Location.getLastKnownPositionAsync({}) || await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const { latitude, longitude } = userLoc.coords;
      const locationLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
      
      await Promise.all([
        axios.post(`${API}/api/sos/send`, { latitude, longitude, groupId: currentGroup._id }, { headers: { Authorization: `Bearer ${global.token}` } }),
        axios.post(`${API}/api/messages/send`, {
          groupId: currentGroup._id,
          text: `🚨 EMERGENCY SOS! My Live Location: ${locationLink}`,
          chatType: "quick", 
        }, { headers: { Authorization: `Bearer ${global.token}` } })
      ]);

      Alert.alert("🚨 SOS SENT", "Admin notified via Map and Chat.");
    } catch (err) { Alert.alert("SOS Failed", "Check connection."); }
    finally { setSendingSOS(false); }
  };

  const handleSearch = async (query = search) => {
    const searchKeyword = query.trim();
    if (!searchKeyword) return;
    Keyboard.dismiss();
    setSearching(true);
    try {
      const centerLat = Number(currentGroup.centerLat);
      const centerLng = Number(currentGroup.centerLng);
      const radiusMeters = Number(currentGroup.safeRadius) || 500;
      let verifiedPlaces = [];
      try {
        const poiRes = await axios.get(`${API}/api/admin/pois/${currentGroup._id}`);
        verifiedPlaces = poiRes.data.filter(poi => (poi.name || "").toLowerCase().includes(searchKeyword.toLowerCase()) || (poi.category || "").toLowerCase().includes(searchKeyword.toLowerCase())).map(poi => ({ ...poi, isVerified: true, latitude: Number(poi.latitude), longitude: Number(poi.longitude) }));
      } catch (e) { console.log("POI fetch failed"); }
      const publicRes = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchKeyword)}&lat=${centerLat}&lon=${centerLng}&limit=10`, { headers: { 'User-Agent': 'TouristSafetyApp/1.0' } });
      const publicFiltered = publicRes.data.map(item => ({ latitude: parseFloat(item.lat), longitude: parseFloat(item.lon), name: item.display_name.split(',')[0], isVerified: false })).filter(place => getDistance(centerLat, centerLng, place.latitude, place.longitude) <= radiusMeters);
      setSearchResults([...verifiedPlaces, ...publicFiltered]);
    } catch (err) { console.log("Search error"); } finally { setSearching(false); }
  };

  const clearSearch = () => {
    setSearch("");
    setSearchResults([]);
    mapRef.current?.animateToRegion({ latitude: Number(currentGroup.centerLat), longitude: Number(currentGroup.centerLng), latitudeDelta: 0.05, longitudeDelta: 0.05 }, 1000);
  };

  const fetchGroupUpdate = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/admin/groups/${group._id}`);
      if (res.data) {
        setCurrentGroup(res.data);
        if (myLocation) checkBreach(myLocation, res.data);
      }
    } catch (err) { console.log("Sync error"); }
  }, [group._id, myLocation, checkBreach]);

  const fetchLocations = async () => {
    try {
      const res = await axios.get(`${API}/api/location`);
      setLocations(res.data);
    } catch (err) { console.log("Loc sync error"); }
  };

  const fetchUnread = useCallback(async () => {
    try {
      const groupRes = await axios.get(`${API}/api/messages/${group._id}?chatType=group`);
      const lastSeenGroup = await AsyncStorage.getItem(`lastSeen_group_${group._id}`);
      const groupIdx = groupRes.data.findIndex(m => String(m._id) === String(lastSeenGroup));
      setUnreadGroup(groupRes.data.filter((m, i) => m.senderName !== global.username && i > (groupIdx === -1 ? groupRes.data.length : groupIdx)).length);
      const assistRes = await axios.get(`${API}/api/messages/${group._id}?chatType=quick`);
      const lastSeenAssist = await AsyncStorage.getItem(`lastSeen_assist_${group._id}`);
      const assistIdx = assistRes.data.findIndex(m => String(m._id) === String(lastSeenAssist));
      setUnreadAssist(assistRes.data.filter((m, i) => m.senderName !== global.username && i > (assistIdx === -1 ? assistRes.data.length : assistIdx)).length);
    } catch (err) { console.log("Unread sync error"); }
  }, [group._id]);

  useEffect(() => {
    let locationSub;

    if (isFocused) {
      fetchLocations(); fetchUnread(); fetchGroupUpdate();
      startTracking().then(sub => locationSub = sub);

      const interval = setInterval(() => {
        fetchLocations(); fetchUnread(); fetchGroupUpdate();
      }, 4000);

      return () => {
        clearInterval(interval);
        locationSub?.remove();
      };
    }
  }, [isFocused, fetchUnread, fetchGroupUpdate]);

  const categories = [
    { id: 'hospital', label: 'Hospital', icon: 'hospital' },
    { id: 'pharmacy', label: 'Medical', icon: 'pills' },
    { id: 'police', label: 'Police', icon: 'shield-alt' },
    { id: 'gas', label: 'Petrol', icon: 'gas-pump' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      
      {/* 🚨 SMALL WARNING BANNER */}
      {isBreached && (
        <View style={styles.breachBanner}>
          <Ionicons name="warning" size={24} color="white" />
          <Text style={styles.breachText}>⚠️ OUTSIDE SAFE ZONE!</Text>
        </View>
      )}

      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: Number(currentGroup.centerLat) || 20.59,
          longitude: Number(currentGroup.centerLng) || 78.96,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onPress={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          const selected = { latitude, longitude };
          setSelectedLocation(selected);

          if (myLocation) {
            fetchRoute(myLocation, selected);
          }

          mapRef.current?.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 500);
        }}
      >
        {/* 🟢 THE ROUTE LINE: Connects user directly to group destination */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#ff9800"
            strokeWidth={4}
          />
        )}
          <Polyline
            coordinates={routeCoords}
            strokeColor="#ff9800"
            strokeWidth={4}
          />

        {selectedLocation && (
          <Marker
            coordinate={selectedLocation}
            title="Selected Destination"
            pinColor="orange"
          />
        )}

        {currentGroup.centerLat && (
          <Circle
            center={{ latitude: Number(currentGroup.centerLat), longitude: Number(currentGroup.centerLng) }}
            radius={currentGroup.safeRadius || 500}
            strokeWidth={2}
            strokeColor="rgba(46, 204, 113, 0.8)"
            fillColor="rgba(46, 204, 113, 0.2)"
          />
        )}

        {/* Members Markers */}
        {currentGroup?.emails?.map((email, idx) => {
          const userLoc = locations.find(l => l.email?.toLowerCase() === email?.toLowerCase());
          if (!userLoc?.latitude || !userLoc?.longitude) return null;
          return (
            <Marker key={`user-${idx}`} coordinate={{ latitude: Number(userLoc.latitude), longitude: Number(userLoc.longitude) }} title={userLoc.username}>
              <View style={styles.markerCircle}><FontAwesome5 name="user-alt" size={12} color="white" /></View>
            </Marker>
          );
        })}

        {/* POI Markers */}
        {searchResults.map((place, index) => (
          <Marker key={`search-${index}`} coordinate={{ latitude: place.latitude, longitude: place.longitude }} title={place.name} pinColor={place.isVerified ? "#f1c40f" : "#2ecc71"}>
             {place.isVerified && <View style={styles.verifiedMarker}><FontAwesome5 name="star" size={10} color="white" /></View>}
          </Marker>
        ))}
      </MapView>

      <TouchableOpacity
        onPress={() => {
          setSelectedLocation(null);
          setRouteCoords([]);
          setSelectedDistance(0);
        }}
        style={{
          position: 'absolute',
          top: 350,
          right: 20,
          backgroundColor: '#83a5e8',
          padding: 10,
          borderRadius: 10,
          zIndex: 20,
          elevation: 10,
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Clear Route</Text>
      </TouchableOpacity>

      {/* 🟢 LIVE DISTANCE INDICATOR BOX */}
      <View style={styles.distanceBox}>
         <FontAwesome5 name="route" size={16} color="#4facfe" />
         <View style={{marginLeft: 12}}>
            <Text style={styles.distLabel}>Distance to Destination</Text>
            <Text style={styles.distValue}>{selectedLocation ? (selectedDistance / 1000).toFixed(2) : (distanceToDest / 1000).toFixed(2)} km</Text>
         </View>
      </View>

      <View style={styles.topOverlay}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="chevron-back" size={28} color="#333" /></TouchableOpacity>
          <Text style={styles.headerText}>{currentGroup?.destination || "Tour Group"}</Text>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.inputWrapper}>
            <TextInput value={search} onChangeText={setSearch} placeholder="Search Verified POIs..." style={styles.inputStyle} onSubmitEditing={() => handleSearch()} />
            {searchResults.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}><Ionicons name="close-circle" size={22} color="#ccc" /></TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.goBtn} onPress={() => handleSearch()} disabled={searching}>
            {searching ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="search" size={20} color="white" />}
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={{ paddingRight: 20 }}>
          {categories.map((cat) => (
            <TouchableOpacity key={cat.id} style={styles.chip} onPress={() => { setSearch(cat.label); handleSearch(cat.label); }}>
              <FontAwesome5 name={cat.icon} size={12} color="#34495e" style={{ marginRight: 6 }} />
              <Text style={styles.chipText}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={() => navigation.navigate("Assist", { group: currentGroup })} style={[styles.fab, { backgroundColor: "#4facfe" }]}>
          <MaterialCommunityIcons name="robot" size={28} color="white" />
          {unreadAssist > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadAssist}</Text></View>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Chat", { group: currentGroup })} style={[styles.fab, { backgroundColor: "#25D366" }]}>
          <Ionicons name="chatbubbles" size={28} color="white" />
          {unreadGroup > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadGroup}</Text></View>}
        </TouchableOpacity>
        
        <TouchableOpacity disabled={sendingSOS} onPress={sendSOS} style={[styles.sosBtn, sendingSOS && {opacity: 0.7}]}>
          {sendingSOS ? <ActivityIndicator color="white" /> : <FontAwesome5 name="skull-crossbones" size={26} color="white" />}
          <Text style={styles.sosLabel}>SOS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 🟢 Distance Box Styles
  distanceBox: {
    position: 'absolute',
    bottom: 120, 
    left: 20,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    minWidth: 150
  },
  distLabel: { fontSize: 9, color: '#999', fontWeight: 'bold', textTransform: 'uppercase' },
  distValue: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },

  emergencyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(231, 76, 60, 0.95)', zIndex: 1000, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emergencyTitle: { color: 'white', fontSize: 32, fontWeight: '900', marginTop: 20 },
  emergencySub: { color: 'white', fontSize: 18, textAlign: 'center', marginTop: 15, fontWeight: '500', lineHeight: 26 },
  pulseDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'white', marginTop: 30 },
  topOverlay: { position: 'absolute', top: 50, left: 15, right: 15, zIndex: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backBtn: { backgroundColor: 'white', padding: 8, borderRadius: 12, elevation: 5 },
  headerText: { fontSize: 22, fontWeight: "bold", color: "#2c3e50", marginLeft: 15 },
  searchRow: { flexDirection: "row", alignItems: 'center' },
  inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 15, elevation: 8 },
  inputStyle: { flex: 1, height: 50, paddingHorizontal: 15, fontSize: 14 },
  clearBtn: { paddingRight: 10 },
  goBtn: { backgroundColor: "#34495e", width: 50, height: 50, borderRadius: 15, marginLeft: 10, justifyContent: "center", alignItems: "center", elevation: 8 },
  chipScroll: { marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, elevation: 3 },
  chipText: { fontSize: 12, color: '#34495e', fontWeight: 'bold' },
  buttonContainer: { position: 'absolute', bottom: 30, right: 20, alignItems: 'center' },
  fab: { width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", elevation: 10, marginBottom: 20 },
  sosBtn: { width: 75, height: 75, borderRadius: 37.5, backgroundColor: "#e74c3c", justifyContent: "center", alignItems: "center", elevation: 15, borderWidth: 3, borderColor: 'white' },
  sosLabel: { color: 'white', fontSize: 10, fontWeight: 'bold', marginTop: 2 },
  badge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#ff3b30', borderRadius: 12, minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  markerCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#4facfe', borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  verifiedMarker: { position: 'absolute', top: -10, right: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: '#f1c40f', borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center' },
  breachBanner: { position: 'absolute', top: 180, left: 20, right: 20, backgroundColor: 'rgba(231, 76, 60, 0.95)', padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', zIndex: 999, elevation: 10, borderWidth: 1, borderColor: 'white' },
  breachText: { color: 'white', fontWeight: 'bold', fontSize: 13, marginLeft: 10, textAlign: 'center', flex: 1 }
});