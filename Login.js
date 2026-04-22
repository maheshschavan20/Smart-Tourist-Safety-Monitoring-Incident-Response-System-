import { useState, useEffect } from "react";
import axios from "axios";
import image from "../assets/image.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- RESPONSIVE LOGIC ---
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth <= 768;

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Enter email and password");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/auth/admin/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("admin", JSON.stringify(res.data.admin));
      window.location.href = "/dashboard";
    } catch (err) {
      alert(err.response?.data?.message || "Login Failed");
    } finally {
      setLoading(false);
    }
  };

  // --- RESPONSIVE STYLES ---
  const dynamicStyles = {
    container: {
      height: "100vh",
      display: "flex",
      // Center the card on mobile, keep it left on desktop
      justifyContent: isMobile ? "center" : "flex-start",
      alignItems: "center",
      padding: isMobile ? "0" : "0 2%",
      backgroundImage: `url(${image})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    },
    card: {
      padding: "30px",
      borderRadius: "15px",
      width: "90%",
      maxWidth: "350px",
      display: "flex",
      flexDirection: "column",
      gap: "15px",
      boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
      background: "rgba(255, 255, 255, 0.1)", // Glassmorphism
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: "1px solid rgba(255, 255, 255, 0.18)",
      color: "#fff",
    },
    input: {
      padding: "12px",
      borderRadius: "8px",
      border: "none",
      outline: "none",
      fontSize: "16px", // Prevents auto-zoom on mobile browsers
      background: "rgba(255, 255, 255, 0.9)",
    },
    btn: {
      padding: "12px",
      background: "#4facfe",
      color: "white",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: "16px",
      marginTop: "10px",
    },
    toggleBtn: {
      background: "none",
      border: "none",
      color: "#fff",
      cursor: "pointer",
      fontSize: "12px",
      textAlign: "right",
      textDecoration: "underline",
    },
    link: {
      color: "#fff",
      cursor: "pointer",
      textAlign: "center",
      fontSize: "14px",
      marginTop: "10px",
    },
  };

  return (
    <div style={dynamicStyles.container}>
      <div style={dynamicStyles.card}>
        <h2 style={{ textAlign: "center", marginBottom: "10px" }}>Admin Login</h2>

        <input
          style={dynamicStyles.input}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <input
            style={dynamicStyles.input}
            type={show ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button style={dynamicStyles.toggleBtn} onClick={() => setShow(!show)}>
            {show ? "Hide Password" : "Show Password"}
          </button>
        </div>

        <button style={dynamicStyles.btn} onClick={handleLogin}>
          {loading ? "Logging..." : "Login"}
        </button>

        <p style={dynamicStyles.link} onClick={() => (window.location.href = "/signup")}>
          Don't have account? <span style={{ fontWeight: "bold", textDecoration: "underline" }}>Signup</span>
        </p>
      </div>
    </div>
  );
}