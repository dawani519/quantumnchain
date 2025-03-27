document.addEventListener("DOMContentLoaded", () => {
  // ✅ Check if user ID exists in localStorage
  const userId = localStorage.getItem("qc_user_id");
  if (!userId) {
    console.error("User ID not found in localStorage!");
    // Optionally, redirect to login or show an error message.
    window.location.href = "login.html";
    return;
  }

  // ✅ Initialize UI
  initializeUI();

  // ✅ Logout functionality (optional; remove if not needed)
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("Logout clicked – clearing localStorage and redirecting.");
      localStorage.clear();
      window.location.href = "login.html";
    });
  }

  // Handle mobile menu toggle functionality
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.querySelector(".sidebar");
  const closeSidebar = document.getElementById("closeSidebar");

  // When the menu toggle is clicked, open the sidebar
  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent event from bubbling to document
      sidebar.classList.add("active");
    });
  }

  // When the close button is clicked, hide the sidebar
  if (closeSidebar) {
    closeSidebar.addEventListener("click", (e) => {
      e.stopPropagation();
      sidebar.classList.remove("active");
    });
  }

  // Hide sidebar when tapping anywhere outside of it (only on mobile)
  document.addEventListener("click", (e) => {
    if (sidebar.classList.contains("active") &&
        !sidebar.contains(e.target) &&
        !menuToggle.contains(e.target)) {
      sidebar.classList.remove("active");
    }
  });
  // ✅ Fetch and display user profile data using the stored user ID
  fetchUserProfile(userId);

  // ✅ Handle profile form submission
  document.getElementById("profileForm").addEventListener("submit", (e) => {
    e.preventDefault();
    updateProfile(userId);
  });

  // ✅ Handle security toggles

  document.getElementById("emailNotificationsToggle").addEventListener("change", function () {
    updateSecuritySetting("emailNotifications", this.checked);
  });
});

// ✅ Initialize user UI (Name & Avatar)
function initializeUI() {
  const userName = localStorage.getItem("qc_user_name");
  if (userName) {
   // document.getElementById("userName").textContent = userName;
    //document.getElementById("userAvatar").textContent = userName.charAt(0).toUpperCase();
  }
}

// ✅ Fetch user data using the user ID from localStorage
async function fetchUserProfile(userId) {
  try {
    const response = await fetch(`http://localhost:8000/api/user/profile.php?user_id=${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const rawText = await response.text();
    console.log("Raw API Response:", rawText);

    let data;
    try {
      data = JSON.parse(rawText);
      console.log("Parsed JSON:", data);
    } catch (error) {
      console.error("JSON Parse Error:", error);
      showError("Unexpected server response.");
      return;
    }

    if (data.success) {
      // Update user info in the topbar
    //  document.getElementById("userName").textContent = data.data.name;
     // document.getElementById("userBalance").textContent = `$${Number.parseFloat(data.data.balance).toFixed(2)}`;
     // document.getElementById("userAvatar").textContent = getInitials(data.data.name);

      // Update profile information
      document.getElementById("profileName").textContent = data.data.name;
      //document.getElementById("profileEmail").textContent = data.data.email;
      document.getElementById("profileAvatar").textContent = getInitials(data.data.name);
      document.getElementById("profileBalance").textContent = `$${Number.parseFloat(data.data.balance).toFixed(2)}`;
      //document.getElementById("profileProfit").textContent = `$${Number.parseFloat(data.data.total_profit || 0).toFixed(2)}`;

      // Fill form fields
      document.getElementById("fullName").value = data.data.name;
      document.getElementById("email").value = data.data.email;
      document.getElementById("walletAddress").value = data.data.wallet_address || "";

      // Set security toggles (using API values or defaults)
    } else {
      console.error("Failed to fetch profile:", data.message);
      showError("Failed to load profile. Please try again.");
    }
  } catch (error) {
    console.error("Error fetching profile:", error);
    showError("Network error. Please check your connection and try again.");
  }
}

// ✅ Update user profile using the user ID
async function updateProfile(userId) {
  const fullName = document.getElementById("fullName").value;
  const email = document.getElementById("email").value;
  const walletAddress = document.getElementById("walletAddress").value;
  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  // Validate inputs
  if (!fullName || !email) {
    showError("Name and email are required fields.");
    return;
  }
  if (newPassword && newPassword !== confirmPassword) {
    showError("New passwords do not match.");
    return;
  }

  // Prepare data for API
  const profileData = {
    name: fullName,
    email: email,
    wallet_address: walletAddress,
  };

  if (currentPassword && newPassword) {
    profileData.current_password = currentPassword;
    profileData.new_password = newPassword;
  }

  try {
    const response = await fetch("http://localhost:8000/api/user/update-profile.php?user_id=" + userId, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profileData),
    });

    const rawText = await response.text();
    console.log("Raw API Response:", rawText);

    let data;
    try {
      data = JSON.parse(rawText);
      console.log("Parsed JSON:", data);
    } catch (error) {
      console.error("JSON Parse Error:", error);
      showError("Unexpected server response.");
      return;
    }

    if (data.success) {
      // Clear password fields
      document.getElementById("currentPassword").value = "";
      document.getElementById("newPassword").value = "";
      document.getElementById("confirmPassword").value = "";

      // Show success message
      document.getElementById("successMessage").style.display = "flex";

      // Refresh profile data
      fetchUserProfile(userId);
    } else {
      showError(data.message || "Failed to update profile. Please try again.");
    }
  } catch (error) {
    console.error("Error updating profile:", error);
    showError("Network error. Please check your connection and try again.");
  }
}

// ✅ Update security setting (dummy implementation)
async function updateSecuritySetting(setting, enabled) {
  console.log(`Setting ${setting} to ${enabled}`);
  document.getElementById("successMessage").style.display = "flex";
  document.getElementById("successMessage").querySelector("p").textContent = `Security setting updated successfully!`;
}

// ✅ Helper function to get initials from name
function getInitials(name) {
  if (!name) return "U";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
}

// ✅ Helper function to show error messages
function showError(message) {
  let errorContainer = document.getElementById("errorContainer");
  if (!errorContainer) {
    errorContainer = document.createElement("div");
    errorContainer.id = "errorContainer";
    errorContainer.className = "error-container";
    document.querySelector(".content-area").prepend(errorContainer);
  }
  errorContainer.innerHTML = `
    <div class="error-message">
      <p>${message}</p>
      <button class="close-error">×</button>
    </div>
  `;
  document.querySelector(".close-error").addEventListener("click", () => {
    errorContainer.innerHTML = "";
  });
  setTimeout(() => {
    if (errorContainer.querySelector(".error-message")) {
      errorContainer.innerHTML = "";
    }
  }, 5000);
}

// ✅ Helper function to format dates
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}

// ✅ Helper functions to show success messages
function showSuccess(message) {
  showMessage(message, "success");
}

function showMessage(message, type) {
  let messageContainer = document.getElementById("messageContainer");
  if (!messageContainer) {
    messageContainer = document.createElement("div");
    messageContainer.id = "messageContainer";
    messageContainer.className = "message-container";
    document.querySelector(".content-area").prepend(messageContainer);
  }
  const className = type === "error" ? "error-message" : "success-message";
  messageContainer.innerHTML = `
    <div class="${className}">
      <p>${message}</p>
      <button class="close-message">×</button>
    </div>
  `;
  document.querySelector(".close-message").addEventListener("click", () => {
    messageContainer.innerHTML = "";
  });
  setTimeout(() => {
    if (messageContainer.querySelector(`.${className}`)) {
      messageContainer.innerHTML = "";
    }
  }, 5000);
}
