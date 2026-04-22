import { useState, useEffect } from "react";
import axios from "axios";
import image from "../assets/image.png";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth <= 768;

  const handleSignup = async () => {
    if (!email || !password) {
      alert("Fill all fields");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/auth/admin/signup", {
        email,
        password,
      });
      alert("Signup Successful");
      window.location.href = "/";
    } catch (err) {
      alert(err.response?.data?.message || "Signup Failed");
    }
  };

  // 🟢 Move the styles INSIDE the component so it can see 'isMobile'
  const dynamicStyles = {
    container: {
      height: "100vh",
      display: "flex",
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
      background: "rgba(255, 255, 255, 0.1)", 
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
      fontSize: "16px",
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
        <h2>Create Admin Account</h2>
        <input
          style={dynamicStyles.input}
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          style={dynamicStyles.input}
          type={show ? "text" : "password"}
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          style={dynamicStyles.input}
          type={show ? "text" : "password"}
          placeholder="Confirm Password"
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <button style={dynamicStyles.toggleBtn} onClick={() => setShow(!show)}>
          {show ? "Hide Password" : "Show Password"}
        </button>
        <button style={dynamicStyles.btn} onClick={handleSignup}>
          Signup
        </button>
        <p style={dynamicStyles.link} onClick={() => (window.location.href = "/")}>
          Already have account? Login
        </p>
      </div>
    </div>
  );
}