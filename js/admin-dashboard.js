document.addEventListener("DOMContentLoaded", () => {
  // Check if admin is logged in
  const adminToken = localStorage.getItem("qc_admin_token")
  if (!adminToken) {
    window.location.href = "login.html"
    return
  }

  // Handle logout
  document.getElementById("adminLogoutBtn").addEventListener("click", (e) => {
    e.preventDefault()
    localStorage.removeItem("qc_admin_token")
    localStorage.removeItem("qc_admin_id")
    localStorage.removeItem("qc_admin_name")
    window.location.href = "login.html"
  })

  // Handle mobile menu toggle
  document.getElementById("menuToggle").addEventListener("click", () => {
    document.querySelector(".sidebar").classList.toggle("active")
    document.querySelector(".main-content").classList.toggle("sidebar-collapsed")
  })

  // Fetch and display dashboard statistics
  fetchDashboardStats()

  // Fetch and display recent users
  fetchRecentUsers()

  // Fetch and display recent transactions
  fetchRecentTransactions()
})

async function fetchDashboardStats() {
  try {
    const response = await fetch("../api/admin/dashboard-stats.php", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("qc_admin_token")}`,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const data = await response.json()

    if (data.success) {
      // Update UI with stats data
      document.getElementById("totalUsers").textContent = data.data.totalUsers
      document.getElementById("activeInvestments").textContent = data.data.activeInvestments

      // Add pending withdrawals if the element exists
      if (document.getElementById("pendingWithdrawals")) {
        document.getElementById("pendingWithdrawals").textContent = data.data.pendingWithdrawals
      }
    } else {
      console.error("Failed to fetch dashboard stats:", data.message)
      showError("Failed to load dashboard statistics. Please try again.")
    }
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    showError("Network error. Please check your connection and try again.")
  }
}

async function fetchRecentUsers() {
  try {
    const response = await fetch("../api/admin/users.php?limit=5", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("qc_admin_token")}`,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const data = await response.json()

    if (data.success) {
      const usersTable = document.getElementById("recentUsers")
      usersTable.innerHTML = ""

      if (data.data.length === 0) {
        usersTable.innerHTML = '<tr><td colspan="6" class="text-center">No users found</td></tr>'
        return
      }

      data.data.forEach((user) => {
        const row = document.createElement("tr")

        // Determine status class
        let statusClass = ""
        if (user.status === "active") {
          statusClass = "status-success"
        } else if (user.status === "blocked") {
          statusClass = "status-failed"
        }

        row.innerHTML = `
          <td>${user.id}</td>
          <td>${user.name}</td>
          <td>${user.email}</td>
          <td>$${Number.parseFloat(user.balance).toFixed(2)}</td>
          <td><span class="status-badge ${statusClass}">${user.status}</span></td>
          <td>
            <a href="users.html?id=${user.id}" class="btn btn-info btn-sm">View</a>
          </td>
        `

        usersTable.appendChild(row)
      })
    } else {
      console.error("Failed to fetch users:", data.message)
      showError("Failed to load recent users. Please try again.")
    }
  } catch (error) {
    console.error("Error fetching users:", error)
    showError("Network error. Please check your connection and try again.")
  }
}

async function fetchRecentTransactions() {
  try {
    const response = await fetch("../api/admin/transactions.php?limit=5", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("qc_admin_token")}`,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    // Try to parse the response as text first to check for PHP errors
    const responseText = await response.text()

    // Check if the response starts with HTML (which would indicate a PHP error)
    if (responseText.trim().startsWith("<")) {
      console.error("PHP Error:", responseText)
      showError("Server error. Please contact the administrator.")
      return
    }

    // If it's not an HTML error, parse as JSON
    const data = JSON.parse(responseText)

    if (data.success) {
      const transactionsTable = document.getElementById("recentTransactions")
      transactionsTable.innerHTML = ""

      if (data.data.length === 0) {
        transactionsTable.innerHTML = '<tr><td colspan="6" class="text-center">No transactions found</td></tr>'
        return
      }

      data.data.forEach((transaction) => {
        const row = document.createElement("tr")

        // Determine status class
        let statusClass = ""
        if (transaction.status === "completed") {
          statusClass = "status-success"
        } else if (transaction.status === "pending") {
          statusClass = "status-pending"
        } else if (transaction.status === "failed") {
          statusClass = "status-failed"
        }

        row.innerHTML = `
          <td>${transaction.id}</td>
          <td>${transaction.user_name}</td>
          <td>${transaction.type}</td>
          <td>$${Number.parseFloat(transaction.amount).toFixed(2)}</td>
          <td>${formatDate(transaction.date)}</td>
          <td><span class="status-badge ${statusClass}">${transaction.status}</span></td>
        `

        transactionsTable.appendChild(row)
      })
    } else {
      console.error("Failed to fetch transactions:", data.message)
      showError("Failed to load recent transactions. Please try again.")
    }
  } catch (error) {
    console.error("Error fetching transactions:", error)
    showError("Network error. Please check your connection and try again.")
  }
}

// Helper function to format dates
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString() + " " + date.toLocaleTimeString()
}

// Helper function to show error messages
function showError(message) {
  // Check if error container exists, if not create one
  let errorContainer = document.getElementById("errorContainer")
  if (!errorContainer) {
    errorContainer = document.createElement("div")
    errorContainer.id = "errorContainer"
    errorContainer.className = "error-container"
    document.querySelector(".content-area").prepend(errorContainer)
  }

  errorContainer.innerHTML = `
    <div class="error-message">
      <p>${message}</p>
      <button class="close-error">×</button>
    </div>
  `

  // Add event listener to close button
  document.querySelector(".close-error").addEventListener("click", () => {
    errorContainer.innerHTML = ""
  })

  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (errorContainer.querySelector(".error-message")) {
      errorContainer.innerHTML = ""
    }
  }, 5000)
}

