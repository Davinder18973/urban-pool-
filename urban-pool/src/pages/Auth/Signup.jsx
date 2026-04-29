import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../config/firebase";
import { useNavigate } from "react-router-dom";
import "./Signup.css";

function Signup() {
  const navigate = useNavigate();

  // -------------------------
  // Form state
  // -------------------------
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // -------------------------
  // UI state
  // -------------------------
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // -------------------------
  // Signup handler
  // -------------------------
  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    // Basic validation
    if (!email || !password) {
      setError("Please fill all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      // Firebase signup
      await createUserWithEmailAndPassword(auth, email, password);

      // Redirect after success
      navigate("/login");
    } catch (err) {
      // Firebase error handling
      if (err.code === "auth/email-already-in-use") {
        setError("Email already in use");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address");
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSignup}>
        <h1>Create account</h1>
        <p>Sign up to start using UrbanPool</p>

        {error && <div className="auth-error">{error}</div>}

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="auth-btn"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>

        <p className="auth-footer">
          Already have an account?{" "}
          <span onClick={() => navigate("/login")}>Log in</span>
        </p>
      </form>
    </div>
  );
}

export default Signup;