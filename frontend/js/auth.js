const BACKEND = "https://varshareddy18-ai-homework-assistance.hf.space";

async function signup() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorEl = document.getElementById("authError");

  // Clear previous errors
  if (errorEl) errorEl.textContent = "";

  if (!email || !password) {
    showAuthError("Please enter both email and password.");
    return;
  }

  if (password.length < 6) {
    showAuthError("Password must be at least 6 characters long.");
    return;
  }

  // Show loading state
  const btn = document.querySelector(".auth-btn");
  const originalText = btn.textContent;
  btn.textContent = "Signing up...";
  btn.disabled = true;

  try {
    const res = await fetch(`${BACKEND}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
      alert(data.message || "Signup successful! Please log in.");
      window.location.href = "login.html";
      return;
    } else {
      showAuthError(data.detail || data.message || "Signup failed. Please try again.");
    }

  } catch (error) {
    console.log("Backend unavailable, using offline mode:", error.message);
    // FALLBACK: Offline signup using localStorage
    let users = JSON.parse(localStorage.getItem("users")) || {};

    if (users[email]) {
      showAuthError("This email is already registered. Please log in.");
      return;
    }

    users[email] = password;
    localStorage.setItem("users", JSON.stringify(users));

    alert("Signup successful! (Offline Mode)");
    window.location.href = "login.html";
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorEl = document.getElementById("authError");

  // Clear previous errors
  if (errorEl) errorEl.textContent = "";

  if (!email || !password) {
    showAuthError("Please enter both email and password.");
    return;
  }

  // Show loading state
  const btn = document.querySelector(".auth-btn");
  const originalText = btn.textContent;
  btn.textContent = "Logging in...";
  btn.disabled = true;

  try {
    const res = await fetch(`${BACKEND}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok && data.message === "Login successful") {
      // Store user info
      localStorage.setItem("user_id", data.email || email);
      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
      }
      window.location.href = "dashboard.html";
      return;
    } else {
      showAuthError(data.detail || data.message || "Invalid credentials. Please try again.");
    }

  } catch (error) {
    console.log("Backend unavailable, using offline mode:", error.message);
    // FALLBACK: Offline login using localStorage
    let users = JSON.parse(localStorage.getItem("users")) || {};

    if (users[email] && users[email] === password) {
      localStorage.setItem("user_id", email);
      window.location.href = "dashboard.html";
    } else {
      showAuthError("Invalid credentials. Please check your email and password.");
    }
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

function showAuthError(message) {
  let errorEl = document.getElementById("authError");
  if (!errorEl) {
    // Create the error element if it doesn't exist
    errorEl = document.createElement("p");
    errorEl.id = "authError";
    errorEl.style.cssText = "color: #ff4444; font-size: 14px; margin-top: 10px; text-align: center;";
    const btn = document.querySelector(".auth-btn");
    if (btn && btn.parentNode) {
      btn.parentNode.insertBefore(errorEl, btn.nextSibling);
    }
  }
  errorEl.textContent = message;
}