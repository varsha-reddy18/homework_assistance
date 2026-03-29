const BACKEND = "http://127.0.0.1:8000";

async function signup() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Please enter email and password");
    return;
  }

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
      alert(data.message || "Signup successful");
      window.location.href = "login.html";
      return;
    } else {
      alert(data.detail || data.message || "Signup failed");
      return;
    }

  } catch (error) {
    // ✅ FALLBACK SIGNUP
    let users = JSON.parse(localStorage.getItem("users")) || {};

    if (users[email]) {
      alert("User already exists (Offline Mode)");
      return;
    }

    users[email] = password;
    localStorage.setItem("users", JSON.stringify(users));

    alert("Signup successful (Offline Mode)");
    window.location.href = "login.html";
  }
}

async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Please enter email and password");
    return;
  }

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
      localStorage.setItem("user_id", email);
      window.location.href = "dashboard.html";
      return;
    } else {
      alert(data.detail || data.message || "Invalid credentials");
      return;
    }

  } catch (error) {
    // ✅ FALLBACK LOGIN
    let users = JSON.parse(localStorage.getItem("users")) || {};

    if (users[email] === password) {
      localStorage.setItem("user_id", email);
      window.location.href = "dashboard.html";
    } else {
      alert("Invalid credentials (Offline Mode)");
    }
  }
}