import { useParams } from "react-router-dom";
import { useEffect } from "react";

export default function Join() {
  const { groupId } = useParams();

  useEffect(() => {
    // Try to open app
    window.location.href = `touristapp://join/${groupId}`;

    // Fallback (if app not installed)
    setTimeout(() => {
      alert("If app didn't open, please install Tourist App");
    }, 2000);
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Opening App...</h2>
      <p>If nothing happens, please open the app manually.</p>
    </div>
  );
}