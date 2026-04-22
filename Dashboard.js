import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import GroupView from "./GroupView";
import bg2  from "../assets/bg2.png";

export default function Dashboard() {
  const [showForm, setShowForm] = useState(false);
  const [destination, setDestination] = useState("");
  
  // 🟢 CHANGED: Using full datetime strings
  const [startDateTime, setStartDateTime] = useState(""); 
  const [endDateTime, setEndDateTime] = useState("");     
  
  const [maxMembers, setMaxMembers] = useState(1);
  const [memberEmails, setMemberEmails] = useState([""]);
  const [centerLat, setCenterLat] = useState(20.5937);
  const [centerLng, setCenterLng] = useState(78.9629);
  const [safeRadius, setSafeRadius] = useState(5000);
  const [useBlockchainID, setUseBlockchainID] = useState(true);

  const [activeGroups, setActiveGroups] = useState([]);
  const [inactiveGroups, setInactiveGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});

  const [lastSeenMsgId, setLastSeenMsgId] = useState(() => {
    const saved = localStorage.getItem("lastSeenMsgIds");
    return saved ? JSON.parse(saved) : {};
  });

  const API = "http://localhost:5000";

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  });

  // 🟢 NEW: Automatic End Time Calculation (Same time next day)
  const handleStartDateTimeChange = (val) => {
    setStartDateTime(val);
    if (val) {
      const start = new Date(val);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000); // +24 Hours
      setEndDateTime(end.toISOString().slice(0, 16)); // Format for input
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/groups`, getAuthHeader());
      
      // 🟢 FIX: Use exact current time for filtering
      const now = new Date();
      const all = [...(res.data.active || []), ...(res.data.inactive || [])];
      
      setActiveGroups(all.filter(g => new Date(g.endDate) > now));
      setInactiveGroups(all.filter(g => new Date(g.endDate) <= now));
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear();
        window.location.href = "/";
      }
    }
  };

  const handleDeactivateGroup = async (groupId) => {
    if (!window.confirm("Are you sure you want to end this tour early?")) return;
    try {
      const yesterday = new Date();
      yesterday.setMinutes(yesterday.getMinutes() - 1); // Set to 1 minute ago

      await axios.put(`${API}/api/admin/update-zone/${groupId}`, {
        endDate: yesterday.toISOString() 
      }, getAuthHeader());

      alert("🏁 Tour ended.");
      setSelectedGroup(null);
      setActiveGroupId(null);
      fetchGroups(); 
    } catch (err) { alert("Error deactivating"); }
  };

  const handleMaxMembersChange = (val) => {
    const count = parseInt(val) || 1;
    setMaxMembers(count);
    const newEmails = [...memberEmails];
    if (count > newEmails.length) {
      for (let i = newEmails.length; i < count; i++) newEmails.push("");
    } else {
      newEmails.length = count;
    }
    setMemberEmails(newEmails);
  };

  const handleEmailChange = (index, value) => {
    const newEmails = [...memberEmails];
    newEmails[index] = value;
    setMemberEmails(newEmails);
  };

  const handleCreateGroup = async () => {
    if (!destination || !startDateTime || !endDateTime) return alert("Please fill all details");
    try {
      const payload = {
        name: destination,
        destination,
        startDate: new Date(startDateTime).toISOString(),
        endDate: new Date(endDateTime).toISOString(),
        maxMembers,
        emails: memberEmails.filter(e => e.trim() !== ""),
        centerLat: Number(centerLat),
        centerLng: Number(centerLng),
        safeRadius: Number(safeRadius),
        blockchainEnabled: useBlockchainID
      };
      await axios.post(`${API}/api/admin/create-group`, payload, getAuthHeader());
      alert("🚀 Group Trip Initialized!");
      setShowForm(false);
      setStartDateTime("");
      setEndDateTime("");
      fetchGroups();
    } catch (err) { alert(err.response?.data?.error || "Error"); }
  };

  useEffect(() => { fetchGroups(); }, []);

 const fetchUnreadCounts = useCallback(async () => {
  try {
    const counts = {};
    let updatedLastSeen = { ...lastSeenMsgId };
    let hasChanges = false;

    // Use Promise.all to fetch all groups in parallel (faster)
    await Promise.all(activeGroups.map(async (g) => {
      try {
        const res = await axios.get(`${API}/api/messages/${g._id}?chatType=quick`, getAuthHeader());
        const messages = res.data;
        
        // 1. Get the ID of the very last message in this chat
        const latestId = messages.length > 0 ? String(messages[messages.length - 1]._id) : null;

        // 2. If the Admin is CURRENTLY looking at this group, mark all as seen
        if (g._id === activeGroupId && latestId && latestId !== String(lastSeenMsgId[g._id])) {
          updatedLastSeen[g._id] = latestId;
          hasChanges = true;
        }

        // 3. Calculate unread for this group
        const lastSeenId = updatedLastSeen[g._id];
        
        // If we are currently in the group, the count is always 0
        if (g._id === activeGroupId) {
          counts[g._id] = 0;
        } else {
          // Count messages that:
          // - Were NOT sent by the Admin
          // - Appear AFTER the last seen message index
          const lastIndex = messages.findIndex((m) => String(m._id) === String(lastSeenId));
          
          counts[g._id] = messages.filter((m, index) => {
            const isFromTourist = m.senderName !== "Admin";
            
            if (!lastSeenId) return isFromTourist; // If never opened, count all tourist messages
            return isFromTourist && index > lastIndex;
          }).length;
        }
      } catch (e) {
        counts[g._id] = 0;
      }
    }));

    if (hasChanges) {
      setLastSeenMsgId(updatedLastSeen);
      localStorage.setItem("lastSeenMsgIds", JSON.stringify(updatedLastSeen));
    }
    setUnreadCounts(counts);
  } catch (err) {
    console.log("Unread sync error", err);
  }
}, [activeGroups, activeGroupId, lastSeenMsgId]);
  useEffect(() => {
    if (activeGroups.length > 0) {
      fetchUnreadCounts();
      const interval = setInterval(fetchUnreadCounts, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchUnreadCounts, activeGroups.length]);

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.logo}>🛡️ Admin Monitor</h2>
          <button style={styles.logoutBtn} onClick={() => { localStorage.clear(); window.location.href = "/"; }}>Logout</button>
        </div>
        
        <button style={styles.createBtn} onClick={() => setShowForm(true)}>+ Create New Tour</button>
        
        <div style={styles.scrollArea}>
          <p style={styles.sectionLabel}>ACTIVE TOURS</p>
          {activeGroups.map((g) => (
            <div key={g._id} style={{ position: 'relative' }}>
              <div onClick={() => { setSelectedGroup(g); setActiveGroupId(g._id); }} 
                style={{ ...styles.groupCard, borderColor: activeGroupId === g._id ? "#2a81cd" : "#5cfe7a", background: activeGroupId === g._id ? "#fffafa" : "lightgreen" }}>
                <div style={styles.groupInfo}>
                  <span style={styles.destText}>{g.destination}</span>
                  {unreadCounts[g._id] > 0 && <span style={styles.badge}>{unreadCounts[g._id]}</span>}
                </div>
                <div style={styles.groupMeta}>
                  <span>{new Date(g.startDate).toLocaleString()}</span>
                  <span style={styles.statusDot}>● Online</span>
                </div>
              </div>
              <button onClick={() => handleDeactivateGroup(g._id)} style={styles.inlineDeactivate}>🏁</button>
            </div>
          ))}

          {inactiveGroups.length > 0 && (
            <>
              <p style={{ ...styles.sectionLabel, marginTop: "25px" }}>COMPLETED / ARCHIVED</p>
              {inactiveGroups.map((g) => (
                <div key={g._id} style={styles.inactiveCard}>
                  <span style={{ color: "#3e3d3c" }}>  {g.destination}</span>
                  <small>{new Date(g.endDate).toLocaleDateString()}</small>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div style={styles.main}>
        {selectedGroup ? (
          <GroupView group={selectedGroup} onBack={() => { setSelectedGroup(null); setActiveGroupId(null); }} onDeactivate={() => handleDeactivateGroup(selectedGroup._id)} />
        ) : (
          <div style={styles.emptyState}>
             <div style={styles.statsRow}>
               <div style={styles.statBox}><h3>{activeGroups.length}</h3><p>Active Tours</p></div>
               <div style={styles.statBox}>
                 <h3 style={{color: '#e74c3c'}}>{Object.values(unreadCounts).reduce((a, b) => a + b, 0)}</h3>
                 <p>New Alerts</p>
               </div>
            </div>
            <h2 style={{ color: "#eadddd", marginTop: "45px" }}>Select a tour to start monitoring</h2>
          </div>
        )}
      </div>

      {showForm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Initialize New Group Trip</h3>
            <p style={styles.subLabel}>Destination:</p>
            <input value={destination} style={styles.input} placeholder="e.g. Paris Summer Tour" onChange={(e) => setDestination(e.target.value)} />
            
            <div style={{ display: "flex", gap: "10px", marginTop: '10px' }}>
                <div style={{flex: 1}}>
                    <p style={styles.subLabel}>Start Date & Time:</p>
                    <input value={startDateTime} type="datetime-local" style={{...styles.input, width: '90%'}} onChange={(e) => handleStartDateTimeChange(e.target.value)} />
                </div>
                <div style={{flex: 1}}>
                    <p style={styles.subLabel}>End Date & Time:</p>
                    <input value={endDateTime} type="datetime-local" style={{...styles.input, width: '90%'}} onChange={(e) => setEndDateTime(e.target.value)} />
                </div>
            </div>
            
            <p style={{...styles.subLabel, marginTop: '15px'}}>Max Members:</p>
            <input value={maxMembers} type="number" style={styles.input} onChange={(e) => handleMaxMembersChange(e.target.value)} />
            
            <div style={{ marginTop: '15px' }}> 
                <p style={styles.subLabel}>Invited Member Emails:</p>
                <div style={styles.emailScroll}>
                    {memberEmails.map((email, idx) => (
                        <input key={idx} value={email} placeholder={`Member ${idx + 1} Email`} style={{...styles.input, marginBottom: '8px', width: '94%'}} onChange={(e) => handleEmailChange(idx, e.target.value)} />
                    ))}
                </div>
            </div>

            <hr style={{margin: '15px 0', border: '0', borderTop: '1px solid #eee'}} />
            <p style={styles.subLabel}>AI Geofence Config:</p>
            <div style={{ display: "flex", gap: "5px", marginTop: '5px' }}>
                <input value={centerLat} type="number" style={styles.input} placeholder="Lat" onChange={(e) => setCenterLat(e.target.value)} />
                <input value={centerLng} type="number" style={styles.input} placeholder="Lng" onChange={(e) => setCenterLng(e.target.value)} />
                <input value={safeRadius} type="number" style={styles.input} placeholder="Radius (m)" onChange={(e) => setSafeRadius(e.target.value)} />
            </div>

            <button style={styles.saveBtn} onClick={handleCreateGroup}>Create Protected Trip</button>
            <button style={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { display: "flex",
     height: "100vh", 
     backgroundImage: `url(${bg2})`,
     backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
      fontFamily: "sans-serif" 
    },
  sidebar: { 
    width: "320px",
     background: "white",
      borderRight: "1px solid #c3c0c0",
       display: "flex", flexDirection: "column"
       },
  sidebarHeader: {
     padding: "20px", borderBottom: "1px solid #d3cdcd", display: "flex", justifyContent: "space-between", alignItems: "center" },
  logo: { fontSize: "18px", margin: 0, color: "#3986d3" },
  scrollArea: { flex: 1, overflowY: "auto", padding: "15px" },
  sectionLabel: { fontSize: "11px", fontWeight: "bold", color: "#999999", letterSpacing: "1px", marginBottom: "10px", textTransform: 'uppercase' },
  groupCard: { padding: "15px", borderRadius: "10px", border: "2px solid", cursor: "pointer", transition: "0.2s", marginBottom: "10px" },
  inlineDeactivate: { position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', zIndex: 5 },
  groupInfo: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" },
  destText: { fontWeight: "bold", fontSize: "15px", color: "#333", paddingRight: '20px' },
  groupMeta: { display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#777" },
  statusDot: { color: "#27ae60", fontWeight: "bold" },
  badge: { background: "#e74c3c", color: "white", borderRadius: "20px", padding: "2px 8px", fontSize: "11px", fontWeight: "bold" },
  createBtn: { margin: "15px", padding: "12px", background: "#2c3e50", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  main: { flex: 2, overflowY: "auto", position: 'relative' },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" },
  statsRow: { display: "flex", gap: "20px" },
  statBox: { background: "rgba(255,255,255,0.15)",backdropFilter: "blur(10px)",color: "#fff", padding: "20px 40px", borderRadius: "12px", textAlign: "center", boxShadow: "0 15px 6px rgba(0,0,0,0.05)", minWidth: '120px' },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { background: "white", padding: "25px", borderRadius: "15px", width: "450px", display: "flex", flexDirection: "column", maxHeight: '90vh', overflowY: 'auto' },
  emailScroll: { maxHeight: '150px', overflowY: 'auto', marginTop: '10px', paddingRight: '5px', border: '1px solid #eee', borderRadius: '8px', padding: '10px' },
  subLabel: { fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '5px' },
  input: { padding: "12px", border: "1px solid #ddd", borderRadius: "8px", outline: "none", fontSize: '14px' },
  saveBtn: { padding: "12px", background: "#4facfe", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", marginTop: '20px' },
  cancelBtn: { padding: "12px", background: "#eee", color: "#333", border: "none", borderRadius: "8px", cursor: "pointer", marginTop: '8px' },
  inactiveCard: { padding: "12px", borderRadius: "8px", background: "#fc6363", border: '1px solid #eee', display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" },
  logoutBtn: { background: "none", border: "1px solid #ddd", padding: "5px 10px", borderRadius: "5px", fontSize: "12px", cursor: "pointer" },
};