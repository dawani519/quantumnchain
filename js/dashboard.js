document.addEventListener("DOMContentLoaded", () => {
  // ✅ Check if user is logged in
  const userToken = localStorage.getItem("qc_user_token");
  if (!userToken) {
    window.location.href = "login.html";
    return;
  }

  // Initialize UI elements
  initializeDashboard();

  // Handle logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
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

  // Fetch and display user data
  fetchUserData();

  // Fetch and display recent transactions
  fetchRecentTransactions();

  // Fetch and display active investments
  fetchActiveInvestments();
});

async function initializeDashboard() {
  // Set user name in header
  const userName = localStorage.getItem("qc_user_name");
  if (userName) {
    // Use optional chaining to avoid errors if element not found
    document.getElementById("userName") && (document.getElementById("userName").textContent = userName);
    document.getElementById("userAvatar") && (document.getElementById("userAvatar").textContent = userName.charAt(0).toUpperCase());
  }
}

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

    if (!userData.success && userData.message === "Invalid or expired token") {
      console.warn("Token expired. Logging out...");
      handleExpiredToken();
      return;
    }

    if (userData.success) {
      // Update balance and wallet addresses in UI safely.
      document.getElementById("userBalance") && (document.getElementById("userBalance").textContent = Number(userData.user.balance).toFixed(2));
      document.getElementById("totalBalance") && (document.getElementById("totalBalance").textContent = Number(userData.user.balance).toFixed(2));
      document.getElementById("activeInvestments") && (document.getElementById("activeInvestments").textContent = userData.user.active_investments || 0);
      document.getElementById("totalProfit") && (document.getElementById("totalProfit").textContent = Number(userData.user.total_profit || 0).toFixed(2));
      document.getElementById("walletAddress") && (document.getElementById("walletAddress").textContent = userData.user.wallet_address || "Not set");
    } else {
      console.error("Failed to fetch user data:", userData.message);
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
  }
}

async function fetchRecentTransactions() {
  try {
    const userId = localStorage.getItem("qc_user_id");

    const response = await fetch(`http://localhost:8000/api/transaction/transactions.php?user_id=${userId}&limit=5`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("qc_user_token")}`,
      },
    });

    const rawText = await response.text();
    console.log("Raw API Response:", rawText);

    const transactions = JSON.parse(rawText);
    console.log("Parsed JSON:", transactions);

    if (!transactions.success && transactions.message === "Invalid or expired token") {
      console.warn("Token expired. Logging out...");
      handleExpiredToken();
      return;
    }

    const transactionsTable = document.getElementById("recentTransactions");
    if (transactionsTable) {
      transactionsTable.innerHTML = "";

      if (transactions.success && transactions.data.length > 0) {
        transactions.data.forEach((transaction) => {
          const row = document.createElement("tr");

          // Determine status class
          let statusClass = "";
          if (transaction.status === "completed") {
            statusClass = "status-success";
          } else if (transaction.status === "pending") {
            statusClass = "status-pending";
          } else if (transaction.status === "failed") {
            statusClass = "status-failed";
          }

          row.innerHTML = `
            <td>${transaction.id}</td>
            <td>${transaction.type}</td>
            <td>$${Number(transaction.amount).toFixed(2)}</td>
            <td>${formatDate(transaction.date)}</td>
            <td><span class="status-badge ${statusClass}">${transaction.status}</span></td>
          `;

          transactionsTable.appendChild(row);
        });
      } else {
        transactionsTable.innerHTML = '<tr><td colspan="5" class="text-center">No transactions found</td></tr>';
      }
    }
  } catch (error) {
    console.error("Error fetching transactions:", error);
  }
}

async function fetchActiveInvestments() {
  try {
    const userId = localStorage.getItem("qc_user_id");

    const response = await fetch(`http://localhost:8000/api/investment/active-investments.php?user_id=${userId}&status=active`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("qc_user_token")}`,
      },
    });

    const rawText = await response.text();
    console.log("Raw API Response:", rawText);

    const investments = JSON.parse(rawText);
    console.log("Parsed JSON:", investments);

    const investmentsTable = document.getElementById("activeInvestmentsList");
    if (investmentsTable) {
      investmentsTable.innerHTML = "";

      if (investments.success && investments.data.length > 0) {
        investments.data.forEach((investment) => {
          const row = document.createElement("tr");

          row.innerHTML = `
            <td>${investment.id}</td>
            <td>$${Number(investment.amount).toFixed(2)}</td>
            <td>${formatDate(investment.start_date)}</td>
            <td>$${Number(investment.current_profit).toFixed(2)} (${Math.round(investment.profit_percentage)}%)</td>
            <td><span class="status-badge status-success">Active</span></td>
          `;

          investmentsTable.appendChild(row);
        });
      } else {
        investmentsTable.innerHTML = '<tr><td colspan="5" class="text-center">No active investments found</td></tr>';
      }
    }
  } catch (error) {
    console.error("Error fetching investments:", error);
  }
}

// Helper function to format dates
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}

function handleExpiredToken() {
  alert("Your session has expired. Please log in again.");
  localStorage.removeItem("qc_user_token");
  localStorage.removeItem("qc_user_id");
  localStorage.removeItem("qc_user_name");
  window.location.href = "login.html"; // Redirect to login page
}
