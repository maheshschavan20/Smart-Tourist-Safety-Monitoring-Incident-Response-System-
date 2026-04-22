import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import assist_bg from "../assets/assist_bg.png";

// --- 🛠️ FIX BROKEN MARKER ICONS ---
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const sosIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function GroupView({ group, onBack }) {
  const [locations, setLocations] = useState([]);
  const [sosList, setSosList] = useState([]);
  const [poiList, setPoiList] = useState([]); 
  const [blink, setBlink] = useState(true);
  const [assistChat, setAssistChat] = useState([]);
  const [assistMsg, setAssistMsg] = useState("");
  const [sosBanner, setSosBanner] = useState(null);
  
  const [isSetMode, setIsSetMode] = useState(false);
  const [poiMode, setPoiMode] = useState(false);
  const [poiCategory, setPoiCategory] = useState("hospital");
  
  const [currentGroup, setCurrentGroup] = useState(group);
  const [customRadius, setCustomRadius] = useState(group.safeRadius || 500);

  const API = "http://localhost:5000";
  const chatEndRef = useRef(null);
  const bannerTimeoutRef = useRef(null);

  // Sync state when props change
  useEffect(() => {
    setCurrentGroup(group);
    setCustomRadius(group.safeRadius || 500);
    fetchPOIs(group._id);
  }, [group]);

  const renderMessageText = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={styles.chatLink}>
            📍 View Emergency Location
          </a>
        );
      }
      return part;
    });
  };

  function MapClickHandler() {
    useMapEvents({
      click: async (e) => {
        const { lat, lng } = e.latlng;
        if (poiMode) {
          const name = prompt(`Enter a custom name for this ${poiCategory}:`, `Verified ${poiCategory}`);
          if (!name) return;
          try {
            await axios.post(`${API}/api/admin/add-poi`, {
              groupId: currentGroup._id,
              name,
              category: poiCategory,
              latitude: lat,
              longitude: lng
            }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
            alert(`✅ ${poiCategory} marked!`);
            setPoiMode(false);
            fetchPOIs(currentGroup._id);
          } catch (err) { alert("Failed to mark POI"); }
          return;
        }

        if (isSetMode) {
          try {
            const res = await axios.put(`${API}/api/admin/update-zone/${currentGroup._id}`, {
              centerLat: lat, 
              centerLng: lng, 
              safeRadius: Number(customRadius)
            }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
            setCurrentGroup(res.data);
            setIsSetMode(false);
            alert(`✅ Safe Zone Updated!`);
          } catch (err) { alert("Failed to update Safe Zone."); }
        }
      },
    });
    return null;
  }

  const fetchPOIs = async (groupId) => {
    try {
      const res = await axios.get(`${API}/api/admin/pois/${groupId}`);
      setPoiList(res.data);
    } catch (e) { console.log("POI error"); }
  };

  const fetchLocations = async () => {
    try {
      const res = await axios.get(`${API}/api/location`);
      setLocations(res.data);
    } catch (err) { console.log("Loc fetch error"); }
  };

  const fetchSOS = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/sos/${currentGroup._id}`);
      setSosList(res.data);
      if (res.data.length > 0) {
        const latest = res.data[0];
        setSosBanner(`${latest.username || latest.email} is requesting help!`);
        if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
        bannerTimeoutRef.current = setTimeout(() => setSosBanner(null), 10000);
      }
    } catch (err) { console.log("SOS error"); }
  }, [currentGroup._id]);

  const fetchAssistChat = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/messages/${currentGroup._id}?chatType=quick`);
      setAssistChat(res.data);
    } catch (err) { console.log("Chat error"); }
  }, [currentGroup._id]);

  useEffect(() => {
    fetchLocations(); fetchSOS(); fetchAssistChat(); fetchPOIs(currentGroup._id);
    const a = setInterval(fetchLocations, 5000);
    const b = setInterval(fetchSOS, 3000);
    const c = setInterval(fetchAssistChat, 3000);
    const d = setInterval(() => setBlink((p) => !p), 500);
    return () => {
      clearInterval(a); clearInterval(b); clearInterval(c); clearInterval(d);
    };
  }, [currentGroup._id, fetchSOS, fetchAssistChat]);

  // 🟢 REMAINING FIX: Strict location filtering to prevent "Ghost Markers"
  const groupLocations = locations.filter((loc) => {
    const isMember = currentGroup.emails?.some(e => e.toLowerCase() === loc.email?.toLowerCase());
    const isFresh = new Date() - new Date(loc.updatedAt) < 15 * 60 * 1000; 
    return isMember && isFresh;
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [assistChat]);

  return (
    <div style={styles.wrapper}>
      {sosBanner && <div style={styles.banner}>🚨 {sosBanner}</div>}

      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <button onClick={onBack} style={styles.iconBtn}>◀</button>
          <div style={{ marginLeft: "15px" }}>
            <h2 style={styles.title}>{currentGroup.destination}</h2>
            <div style={styles.statsRow}>
              <span style={styles.statLabel}>👥 {groupLocations.length} Online</span>
              <div style={styles.controlGroup}>
                <input type="number" value={customRadius} onChange={(e) => setCustomRadius(e.target.value)} style={styles.radiusInput} />
                <button onClick={() => {setIsSetMode(!isSetMode); setPoiMode(false);}} style={{...styles.setZoneBtn, background: isSetMode ? "#e67e22" : "#3498db"}}>
                  {isSetMode ? "Cancel" : "⚙️ Set Safe Zone"}
                </button>
              </div>
              <div style={styles.controlGroup}>
                <select value={poiCategory} onChange={(e) => setPoiCategory(e.target.value)} style={styles.radiusInput}>
                  <option value="hospital">Hospital</option>
                  <option value="police">Police</option>
                  <option value="meeting">Meeting Pt</option>
                </select>
                <button onClick={() => {setPoiMode(!poiMode); setIsSetMode(false);}} style={{...styles.setZoneBtn, background: poiMode ? "#9b59b6" : "#2c3e50"}}>
                  {poiMode ? "Click Map" : "📍 Mark POI"}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div style={styles.badge}>Live Safety Monitor</div>
      </div>

      <div style={styles.mainContainer}>
        <div style={styles.mapSection}>
          {/* 🟢 Reverted: No auto-centering component here */}
          <MapContainer center={[currentGroup.centerLat || 20.59, currentGroup.centerLng || 78.96]} zoom={13} style={styles.map}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            
            <MapClickHandler />
            
            {groupLocations.map((loc) => {
              const userPos = L.latLng(Number(loc.latitude), Number(loc.longitude));
              const centerPos = L.latLng(Number(currentGroup.centerLat || 0), Number(currentGroup.centerLng || 0));
              const distance = userPos.distanceTo(centerPos);
              const isBreached = distance > (currentGroup.safeRadius || 500);

              return (
                <Marker key={loc._id} position={[Number(loc.latitude), Number(loc.longitude)]} icon={isBreached ? sosIcon : new L.Icon.Default()}>
                  <Popup>
                    <div style={{ textAlign: 'center' }}>
                      <strong style={{color: isBreached ? 'red' : 'black'}}>{isBreached ? "⚠️ OUTSIDE ZONE: " : ""}{loc.username}</strong>
                      <br />{Math.round(distance)}m from center
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {poiList.map(poi => (
              <Marker key={poi._id} position={[poi.latitude, poi.longitude]}>
                <Popup><b>Verified {poi.category}</b><br/>{poi.name}</Popup>
              </Marker>
            ))}

            {blink && sosList.map((sos) => (
              <Marker key={sos._id} position={[Number(sos.latitude), Number(sos.longitude)]} icon={sosIcon}>
                <Popup><strong style={{ color: "red" }}>🚨 EMERGENCY SOS</strong></Popup>
              </Marker>
            ))}

            {currentGroup.centerLat && (
              <Circle center={[currentGroup.centerLat, currentGroup.centerLng]} radius={currentGroup.safeRadius || 500}
                pathOptions={{ color: isSetMode ? 'orange' : '#2ecc71', fillColor: '#2ecc71', fillOpacity: 0.1 }} />
            )}
          </MapContainer>
        </div>

        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>🤖 Assist Support</div>
          <div style={styles.chatBox}>
            {assistChat.map((m) => (
                <div key={m._id} style={{ ...styles.msgWrapper, alignItems: m.senderName === "Admin" ? "flex-end" : "flex-start" }}>
                  <div style={{ ...styles.bubble, background: m.text.includes("SOS") ? "#cfcbcb" : (m.senderName === "Admin" ? "#71f67ee3" : "#c2bebe"), color: m.senderName === "Admin" ? "#353333" : "#161515", border: m.text.includes("SOS") ? "1px solid #ff4d4d" : "none" }}>
                    {m.senderName !== "Admin" && <div style={{ fontSize: "11px", fontWeight: "bold", opacity: 0.7 }}>{m.senderName}</div>}
                    <div>{renderMessageText(m.text)}</div>
                  </div>
                </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div style={styles.inputArea}>
            <input value={assistMsg} onChange={(e) => setAssistMsg(e.target.value)} placeholder="Type a message..." style={styles.input} onKeyDown={(e) => e.key === 'Enter' && document.getElementById("send-btn").click()} />
            <button id="send-btn" onClick={async () => {
              if (!assistMsg.trim()) return;
              try {
                await axios.post(`${API}/api/messages/send`, { groupId: currentGroup._id, text: assistMsg, chatType: "quick" }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
                setAssistMsg(""); fetchAssistChat();
              } catch (err) { console.log("Send failed"); }
            }} style={styles.sendBtn}>➤</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: { display: "flex", flexDirection: "column", height: "100vh", background: "#f4f7f9", overflow: "hidden" },
  header: { background: "#fff", padding: "10px 25px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", zIndex: 10 },
  controlGroup: { display: "flex", alignItems: "center", gap: "8px", marginLeft: "15px" },
  radiusInput: { width: "90px", padding: "6px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "12px" },
  setZoneBtn: { border: "none", color: "#fff", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" },
  title: { margin: 0, fontSize: "18px", color: "#2c3e50" },
  statsRow: { display: "flex", gap: "10px", marginTop: "5px", alignItems: "center" },
  statLabel: { fontSize: "12px", color: "#7f8c8d" },
  iconBtn: { border: "none", background: "#eee", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer" },
  badge: { background: "#2ecc71", color: "#fff", padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "bold" },
  banner: { position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: "#e74c3c", color: "#fff", padding: "10px 30px", borderRadius: "10px", zIndex: 9999, fontWeight: "bold" },
  mainContainer: { display: "flex", flex: 1, padding: "15px", gap: "15px", overflow: "hidden" },
  mapSection: { flex: 2.5, background: "#fff", borderRadius: "15px", overflow: "hidden", boxShadow: "0 4px 15px rgba(0,0,0,0.08)" },
  map: { height: "100%", width: "100%" },
  sidebar: { flex: 1, background: "#fff", borderRadius: "15px", display: "flex", flexDirection: "column", border: "1px solid #e0e6ed" },
  sidebarHeader: { padding: "15px 20px", borderBottom: "1px solid #f0f0f0", fontWeight: "bold" },
  chatBox: { flex: 1, overflowY: "auto", padding: "15px", display: "flex", flexDirection: "column", gap: "10px", backgroundImage: `url(${assist_bg})`, // ✅ local image
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",},
  msgWrapper: { display: "flex", flexDirection: "column" },
  bubble: { maxWidth: "85%", padding: "8px 12px", borderRadius: "12px", fontSize: "13px" },
  inputArea: { padding: "10px", display: "flex", gap: "10px", borderTop: "1px solid #f0f0f0" },
  input: { flex: 1, padding: "8px 15px", borderRadius: "20px", border: "1px solid #ddd", outline: "none" },
  sendBtn: { background: "#007bff", color: "#fff", border: "none", width: "35px", height: "35px", borderRadius: "50%", cursor: "pointer" },
  chatLink: { color: '#e74c3c', fontWeight: 'bold', fontSize: '11px' }
};