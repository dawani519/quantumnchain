document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in
  const userToken = localStorage.getItem("qc_user_token");
  if (!userToken) {
    window.location.href = "login.html";
    return;
  }

  // Initialize UI elements
  initializeUI();

  // Handle logout functionality
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("qc_user_token");
      localStorage.removeItem("qc_user_id");
      localStorage.removeItem("qc_user_name");
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

  // Fetch and display user balance
  // fetchUserData(); // ❌ Commented out to remove user balance

  // Fetch and display recent withdrawals
  // fetchRecentWithdrawals(); // ❌ Commented out to remove withdrawals table
});

// Initialize user UI (Name & Avatar)
function initializeUI() {
  const userName = localStorage.getItem("qc_user_name");
  if (userName) {
    document.getElementById("userName").textContent = userName;
    document.getElementById("userAvatar").textContent = userName.charAt(0).toUpperCase();
  }
}

// ❌ Fetch user balance data - Commented out to remove user balance
/*
async function fetchUserData() {
  try {
    const response = await fetch("http://localhost:8000/api/users.php", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("qc_user_token")}`,
      },
    });

    const rawText = await response.text();
    console.log("Raw API Response:", rawText);
    const userData = JSON.parse(rawText);
    console.log("Parsed JSON:", userData);

    if (userData.success) {
      document.getElementById("userBalance").textContent = Number(userData.user.balance).toFixed(2);
      document.getElementById("currentBalance").textContent = Number(userData.user.balance).toFixed(2);
    } else {
      console.error("❌ Failed to fetch user data:", userData.message);
    }
  } catch (error) {
    console.error("❌ Error fetching user data:", error);
  }
}
*/

// ❌ Fetch recent withdrawals for the logged-in user - Commented out to remove the withdrawals table
/*
async function fetchRecentWithdrawals() {
  try {
    const userId = localStorage.getItem("qc_user_id");

    const response = await fetch(`http://localhost:8000/api/transaction/withdraw.php?user_id=${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("qc_user_token")}`,
      },
    });

    const rawText = await response.text();
    console.log("Raw API Response:", rawText);
    const withdrawals = JSON.parse(rawText);
    console.log("Parsed JSON:", withdrawals);

    const withdrawalsTable = document.getElementById("recentWithdrawals");
    withdrawalsTable.innerHTML = "";

    if (withdrawals.success && withdrawals.data.length > 0) {
      withdrawals.data.forEach((withdrawal) => {
        const row = document.createElement("tr");

        let statusClass = "";
        if (withdrawal.status === "completed") statusClass = "status-success";
        else if (withdrawal.status === "pending") statusClass = "status-pending";
        else if (withdrawal.status === "failed") statusClass = "status-failed";

        row.innerHTML = `
          <td>${withdrawal.id}</td>
          <td>$${Number(withdrawal.amount).toFixed(2)}</td>
          <td>${withdrawal.payment_method}</td>
          <td>${formatDate(withdrawal.date)}</td>
          <td><span class="status-badge ${statusClass}">${withdrawal.status}</span></td>
        `;
        withdrawalsTable.appendChild(row);
      });
    } else {
      withdrawalsTable.innerHTML = '<tr><td colspan="5" class="text-center">No withdrawals found</td></tr>';
    }
  } catch (error) {
    console.error("❌ Error fetching withdrawals:", error);
  }
}
*/

// Handle withdrawal form submission
const withdrawForm = document.getElementById("withdrawForm");
if (withdrawForm) {
  withdrawForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const amount = Number.parseFloat(document.getElementById("amount").value);
    const withdrawalMethod = document.getElementById("withdrawalMethod").value;
    const walletAddress = document.getElementById("walletAddress").value;

    if (amount < 50) {
      alert("Minimum withdrawal amount is $50");
      return;
    }

    try {
      const response = await fetch("http://quantumnchain.com/api/transaction/withdraw.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("qc_user_token")}`,
        },
        body: JSON.stringify({
          user_id: localStorage.getItem("qc_user_id"),
          amount: amount,
          withdrawalMethod: withdrawalMethod,
          walletAddress: walletAddress,
        }),
      });

      const rawText = await response.text();
      console.log("Raw API Response:", rawText);
      const data = JSON.parse(rawText);
      console.log("Parsed JSON:", data);

      if (data.success) {
        alert("✅ Withdrawal request submitted successfully! It will be processed within 24 hours.");
        withdrawForm.reset();
        // fetchRecentWithdrawals(); // ❌ Commented out to prevent refreshing the withdrawals table
        // fetchUserData(); // ❌ Commented out to prevent refreshing user balance
      } else {
        alert(data.message || "❌ Withdrawal request failed. Please try again.");
      }
    } catch (error) {
      console.error("❌ Withdrawal error:", error);
      alert("An error occurred during withdrawal request. Please try again.");
    }
  });
}

// Helper function to format dates
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}
