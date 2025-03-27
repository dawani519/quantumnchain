document.addEventListener("DOMContentLoaded", () => {
  // ✅ Check if user is already logged in
  const userToken = localStorage.getItem("qc_user_token");

  if (userToken) {
    // ✅ Redirect logged-in users to dashboard
    if (window.location.pathname.includes("login.html") || window.location.pathname.includes("register.html")) {
      window.location.href = "dashboard.html";
    }
  }

  // ✅ LOGIN FORM HANDLING
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      try {
        console.log("Attempting login with:", email);

        const response = await fetch("http://localhost:8000/api/auth/login.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const rawText = await response.text();
        console.log("Raw API Response:", rawText);

        const data = JSON.parse(rawText);
        console.log("Parsed JSON:", data);

        if (data.success) {
          console.log("✅ Login Successful. Storing token...");

          // ✅ Clear old tokens before storing new one
          localStorage.removeItem("qc_user_token");
          localStorage.removeItem("qc_user_id");
          localStorage.removeItem("qc_user_name");

          // ✅ Store new login data
          localStorage.setItem("qc_user_token", data.token);
          localStorage.setItem("qc_user_id", data.user.id);
          localStorage.setItem("qc_user_name", data.user.name);

          console.log("New token stored:", localStorage.getItem("qc_user_token"));

          // ✅ Redirect to dashboard
          window.location.href = "dashboard.html";
        } else {
          alert(data.message || "Login failed. Please check your credentials.");
        }
      } catch (error) {
        console.error("❌ Login error:", error);
        alert("An error occurred during login. Please try again.");
      }
    });
  }

  // ✅ REGISTRATION FORM HANDLING
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("name").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;
      const walletAddress = document.getElementById("walletAddress").value;

      // ✅ Check password match
      if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
      }

      try {
        console.log("Attempting registration:", email);

        const response = await fetch("http://localhost:8000/api/auth/register.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, email, password, walletAddress }),
        });

        const rawText = await response.text();
        console.log("Raw API Response:", rawText);

        const data = JSON.parse(rawText);
        console.log("Parsed JSON:", data);

        if (data.success) {
          alert("🎉 Registration successful! You can now log in.");
          window.location.href = "login.html";
        } else {
          alert(data.message || "Registration failed. Please try again.");
        }
      } catch (error) {
        console.error("❌ Registration error:", error);
        alert("An error occurred during registration. Please try again.");
      }
    });
  }
});
