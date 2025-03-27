document.addEventListener("DOMContentLoaded", () => {
  // ✅ Check if user is logged in
  const userToken = localStorage.getItem("qc_user_token");
  if (!userToken) {
    window.location.href = "login.html";
    return;
  }

  // ✅ Initialize UI
  initializeUI();

  // ✅ Logout functionality
  document.getElementById("logoutBtn").addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = "login.html";
  });

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

  // ✅ Fetch and display user data
  fetchUserData();

  // ✅ Fetch and display active investments
  fetchActiveInvestments();

  // ✅ Handle deposit form submission
  const depositForm = document.getElementById("depositForm");
  if (depositForm) {
    depositForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const amount = Number.parseFloat(document.getElementById("amount").value);
      const paymentMethod = document.getElementById("paymentMethod").value;
      const packageId = localStorage.getItem("qc_user_id"); // ✅ Set packageId to logged-in user ID

      if (amount < 100) {
        alert("Minimum deposit amount is $100");
        return;
      }

      // Show payment modal
      showPaymentModal(amount, paymentMethod, packageId);
    });
  }

  // ✅ Handle payment confirmation
  const confirmDepositBtn = document.getElementById("confirmDepositBtn");
  if (confirmDepositBtn) {
    confirmDepositBtn.addEventListener("click", async () => {
      const amount = Number.parseFloat(document.getElementById("paymentAmount").textContent);
      const paymentMethod = document.getElementById("paymentCurrency").textContent.toLowerCase();
      const packageId = localStorage.getItem("qc_user_id"); // ✅ Include packageId

      try {
        const requestData = {
          user_id: localStorage.getItem("qc_user_id"),
          amount: amount,
          paymentMethod: paymentMethod, // ✅ Ensure correct field names
          packageId: packageId, // ✅ Ensure packageId is sent
        };

        console.log("Sending Deposit Request:", requestData);

        const response = await fetch("http://localhost:8000/api/transaction/deposit.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("qc_user_token")}`,
          },
          body: JSON.stringify(requestData),
        });

        const data = await response.json();
        console.log("Parsed JSON:", data);

        if (data.success) {
          alert("✅ Deposit successful! Your investment has been added to your account.");
          closePaymentModal();
          document.getElementById("depositForm").reset();
          fetchActiveInvestments(); // Refresh active investments
          fetchUserData(); // Update balance
        } else {
          alert(data.message || "❌ Deposit failed. Please try again.");
        }
      } catch (error) {
        console.error("❌ Deposit error:", error);
        alert("An error occurred during deposit. Please try again.");
      }
    });
  }

  // ✅ Close modal when clicking on the X or outside the modal
  setupModalClosing();
});

// ✅ Initialize user UI (Name & Avatar)
function initializeUI() {
  const userName = localStorage.getItem("qc_user_name");
  if (userName) {
    document.getElementById("userName").textContent = userName;
    document.getElementById("userAvatar").textContent = userName.charAt(0).toUpperCase();
  }
}

// ✅ Fetch user data (Now includes wallet addresses)
async function fetchUserData() {
  try {
    const response = await fetch("http://localhost:8000/api/users.php", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("qc_user_token")}`,
      },
    });

    const data = await response.json();
    console.log("Parsed JSON:", data);

    if (data.success) {
      // ✅ Update balance and wallet addresses in UI
      document.getElementById("userBalance").textContent = Number(data.user.balance).toFixed(2);
      localStorage.setItem("bitcoin_wallet", data.user.bitcoin_wallet || "");
      localStorage.setItem("ethereum_wallet", data.user.ethereum_wallet || "");
      localStorage.setItem("usdt_wallet", data.user.usdt_wallet || "");
    } else {
      console.error("❌ Failed to fetch user data:", data.message);
    }
  } catch (error) {
    console.error("❌ Error fetching user data:", error);
  }
}

// ✅ Fetch active investments
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

    const data = await response.json();
    console.log("Parsed JSON:", data);

    const investmentsTable = document.getElementById("activeInvestmentsList");
    investmentsTable.innerHTML = "";

    if (data.success && data.data.length > 0) {
      data.data.forEach((investment) => {
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
  } catch (error) {
    console.error("❌ Error fetching investments:", error);
  }
}

// ✅ Show payment modal with correct wallet address
function showPaymentModal(amount, paymentMethod) {
  const modal = document.getElementById("paymentModal");
  document.getElementById("paymentAmount").textContent = amount.toFixed(2);
  document.getElementById("paymentCurrency").textContent = paymentMethod.toUpperCase();

  let walletAddress = "";

  switch (paymentMethod) {
    case "bitcoin":
      walletAddress = localStorage.getItem("bitcoin_wallet");
      break;
    case "ethereum":
      walletAddress = localStorage.getItem("ethereum_wallet");
      break;
    case "usdt":
      walletAddress = localStorage.getItem("usdt_wallet");
      break;
    default:
      walletAddress = "N/A";
  }

  document.getElementById("depositWalletAddress").textContent = walletAddress || "No wallet address available";

  modal.style.display = "block";
}

// ✅ Close modal
function closePaymentModal() {
  document.getElementById("paymentModal").style.display = "none";
}

// ✅ Setup modal closing behavior
function setupModalClosing() {
  const modal = document.getElementById("paymentModal");
  const closeBtn = document.getElementsByClassName("close")[0];

  closeBtn.onclick = () => {
    modal.style.display = "none";
  };

  window.onclick = (event) => {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };
}

// ✅ Helper function to format dates
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}
