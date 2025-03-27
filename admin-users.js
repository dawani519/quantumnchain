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

  // Check if we have a user ID in the URL
  const urlParams = new URLSearchParams(window.location.search)
  const userId = urlParams.get("id")
  if (userId) {
    // Show user details modal
    document.getElementById("userDetailsModal").style.display = "block"
    viewUserDetails(userId)
  } else {
    // Fetch and display users
    fetchUsers()

    // Handle search input
    document.getElementById("searchUser").addEventListener("input", () => {
      fetchUsers()
    })

    // Handle status filter
    document.getElementById("statusFilter").addEventListener("change", () => {
      fetchUsers()
    })

    // Handle add user button
    document.getElementById("addUserBtn").addEventListener("click", () => {
      showUserModal()
    })
  }

  // Handle user form submission
  document.getElementById("userForm").addEventListener("submit", (e) => {
    e.preventDefault()
    saveUser()
  })

  // Setup modal closing
  setupModalClosing()
})

async function fetchUsers(page = 1) {
  try {
    // Get filter values
    const searchQuery = document.getElementById("searchUser").value
    const statusFilter = document.getElementById("statusFilter").value
    const limit = 10

    // Build query string
    let queryString = `?page=${page}&limit=${limit}`
    if (searchQuery) {
      queryString += `&search=${encodeURIComponent(searchQuery)}`
    }
    if (statusFilter && statusFilter !== "all") {
      queryString += `&status=${encodeURIComponent(statusFilter)}`
    }

    const token = localStorage.getItem("qc_admin_token")
    console.log("Sending Authorization Token:", token)

    const response = await fetch(`http://localhost:8000/api/admin/users.php${queryString}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("qc_admin_token")}`,
      },
    })
    const rawText = await response.text()
    console.log("Raw API Response:", rawText)

    let data
    try {
      data = JSON.parse(rawText) // Fixed: removed 'const'
      console.log("Parsed JSON:", data)
    } catch (error) {
      console.error("JSON Parse Error:", error)
      showError("Unexpected server response.")
      return
    }

    if (data.success) {
      const usersTable = document.getElementById("usersList")
      usersTable.innerHTML = ""

      if (data.data.length === 0) {
        usersTable.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>'
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
          <td>${user.wallet_address || "Not set"}</td>
          <td><span class="status-badge ${statusClass}">${user.status}</span></td>
          <td class="action-buttons">
            <button class="btn btn-info btn-sm view-user" data-id="${user.id}">View</button>
            <button class="btn btn-primary btn-sm edit-user" data-id="${user.id}">Edit</button>
            <button class="btn btn-danger btn-sm delete-user" data-id="${user.id}">Delete</button>
          </td>
        `

        usersTable.appendChild(row)
      })

      // Add event listeners to action buttons
      document.querySelectorAll(".view-user").forEach((button) => {
        button.addEventListener("click", function () {
          const userId = this.getAttribute("data-id")
          document.getElementById("userDetailsModal").style.display = "block"
          viewUserDetails(userId)
        })
      })

      document.querySelectorAll(".edit-user").forEach((button) => {
        button.addEventListener("click", function () {
          const userId = this.getAttribute("data-id")
          editUser(userId)
        })
      })

      document.querySelectorAll(".delete-user").forEach((button) => {
        button.addEventListener("click", function () {
          const userId = this.getAttribute("data-id")
          deleteUser(userId)
        })
      })

      // Setup pagination
      setupPagination(data.pagination.totalPages, data.pagination.currentPage)
    } else {
      console.error("Failed to fetch users:", data.message)
      showError("Failed to load users. Please try again.")
    }
  } catch (error) {
    console.error("Error fetching users:", error)
    showError("Network error. Please check your connection and try again.")
  }
}

async function viewUserDetails(userId) {
  try {
    const response = await fetch(`http://localhost:8000/api/admin/users.php?id=${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("qc_admin_token")}`,
      },
    })
    const rawText = await response.text()
    console.log("Raw API Response:", rawText)

    let data
    try {
      data = JSON.parse(rawText) // Fixed: removed 'const'
      console.log("Parsed JSON:", data)
    } catch (error) {
      console.error("JSON Parse Error:", error)
      showError("Unexpected server response.")
      return
    }

    if (data.success) {
      const userDetails = document.getElementById("userDetails")

      // Determine status class
      let statusClass = ""
      if (data.data.status === "active") {
        statusClass = "status-success"
      } else if (data.data.status === "blocked") {
        statusClass = "status-failed"
      }

      // Format user details
      userDetails.innerHTML = `
        <div class="user-detail">
          <div class="detail-label">User ID:</div>
          <div class="detail-value">${data.data.id}</div>
        </div>
        <div class="user-detail">
          <div class="detail-label">Name:</div>
          <div class="detail-value">${data.data.name}</div>
        </div>
        <div class="user-detail">
          <div class="detail-label">Email:</div>
          <div class="detail-value">${data.data.email}</div>
        </div>
        <div class="user-detail">
          <div class="detail-label">Balance:</div>
          <div class="detail-value">$${Number.parseFloat(data.data.balance).toFixed(2)}</div>
        </div>
        <div class="user-detail">
          <div class="detail-label">Wallet Address:</div>
          <div class="detail-value">${data.data.wallet_address || "Not set"}</div>
        </div>
        <div class="user-detail">
          <div class="detail-label">Status:</div>
          <div class="detail-value"><span class="status-badge ${statusClass}">${data.data.status}</span></div>
        </div>
        <div class="user-detail">
          <div class="detail-label">Registration Date:</div>
          <div class="detail-value">${formatDate(data.data.registration_date)}</div>
        </div>
        <div class="user-detail">
          <div class="detail-label">Active Investments:</div>
          <div class="detail-value">${data.data.active_investments || 0}</div>
        </div>
        <div class="user-detail">
          <div class="detail-label">Total Profit:</div>
          <div class="detail-value">$${Number.parseFloat(data.data.total_profit || 0).toFixed(2)}</div>
        </div>
      `

      // Set up action buttons
      document.getElementById("stopProfitBtn").setAttribute("data-id", userId)
      document.getElementById("blockUserBtn").setAttribute("data-id", userId)
      document.getElementById("deleteUserBtn").setAttribute("data-id", userId)

      // Update button text based on user status
      if (data.data.status === "blocked") {
        document.getElementById("blockUserBtn").textContent = "Unblock User"
      } else {
        document.getElementById("blockUserBtn").textContent = "Block User"
      }

      // Add event listeners to action buttons
      document.getElementById("stopProfitBtn").onclick = () => {
        stopProfitIncrement(userId)
      }

      document.getElementById("blockUserBtn").onclick = () => {
        toggleUserBlock(userId, data.data.status)
      }

      document.getElementById("deleteUserBtn").onclick = () => {
        if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
          deleteUser(userId, true)
        }
      }
    } else {
      console.error("Failed to fetch user details:", data.message)
      showError("Failed to load user details. Please try again.")
    }
  } catch (error) {
    console.error("Error fetching user details:", error)
    showError("Network error. Please check your connection and try again.")
  }
}

async function editUser(userId) {
  try {
    const response = await fetch(`http://localhost:8000/api/admin/users.php?id=${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("qc_admin_token")}`,
      },
    })

    const rawText = await response.text()
    console.log("Raw API Response:", rawText)

    let data
    try {
      data = JSON.parse(rawText) // Fixed: removed 'const'
      console.log("Parsed JSON:", data)
    } catch (error) {
      console.error("JSON Parse Error:", error)
      showError("Unexpected server response.")
      return
    }

    if (data.success) {
      // Set form values
      document.getElementById("userId").value = data.data.id
      document.getElementById("name").value = data.data.name
      document.getElementById("email").value = data.data.email
      document.getElementById("password").value = ""
      document.getElementById("walletAddress").value = data.data.wallet_address || ""
      document.getElementById("balance").value = data.data.balance
      document.getElementById("status").value = data.data.status

      // Update modal title
      document.getElementById("userModalTitle").textContent = "Edit User"

      // Show modal
      document.getElementById("userModal").style.display = "block"
    } else {
      console.error("Failed to fetch user details:", data.message)
      showError("Failed to load user details for editing. Please try again.")
    }
  } catch (error) {
    console.error("Error fetching user details:", error)
    showError("Network error. Please check your connection and try again.")
  }
}

function showUserModal() {
  // Reset form
  document.getElementById("userForm").reset()
  document.getElementById("userId").value = ""

  // Update modal title
  document.getElementById("userModalTitle").textContent = "Add New User"

  // Show modal
  document.getElementById("userModal").style.display = "block"
}

async function saveUser() {
  const userId = document.getElementById("userId").value
  const name = document.getElementById("name").value
  const email = document.getElementById("email").value
  const password = document.getElementById("password").value
  const walletAddress = document.getElementById("walletAddress").value
  const balance = Number.parseFloat(document.getElementById("balance").value) || 0
  const status = document.getElementById("status").value

  // Validate inputs
  if (!name || !email) {
    showError("Name and email are required fields.")
    return
  }

  // If creating a new user, password is required
  if (!userId && !password) {
    showError("Password is required for new users.")
    return
  }

  const userData = {
    name,
    email,
    walletAddress,
    balance,
    status,
  }

  if (userId) {
    userData.id = userId
    if (password) {
      userData.password = password
    }
  } else {
    userData.password = password
  }

  try {
    const response = await fetch("http://localhost:8000/api/admin/users.php", {
      method: userId ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("qc_admin_token")}`,
      },
      body: JSON.stringify(userData),
    })

    const rawText = await response.text()
    console.log("Raw API Response:", rawText)

    let data
    try {
      data = JSON.parse(rawText) // Fixed: removed 'const'
      console.log("Parsed JSON:", data)
    } catch (error) {
      console.error("JSON Parse Error:", error)
      showError("Unexpected server response.")
      return
    }

    if (data.success) {
      alert(userId ? "User updated successfully!" : "User created successfully!")
      document.getElementById("userModal").style.display = "none"

      // Refresh the user list or details
      if (document.getElementById("userDetailsModal").style.display === "block") {
        viewUserDetails(userId)
      } else {
        fetchUsers()
      }
    } else {
      showError(data.message || "Failed to save user. Please try again.")
    }
  } catch (error) {
    console.error("Error saving user:", error)
    showError("Network error. Please check your connection and try again.")
  }
}

async function deleteUser(userId, redirect = false) {
  if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
    try {
      const response = await fetch("http://localhost:8000/api/admin/users.php", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("qc_admin_token")}`,
        },
        body: JSON.stringify({ id: userId }),
      })

      const rawText = await response.text()
      console.log("Raw API Response:", rawText)

      let data
      try {
        data = JSON.parse(rawText) // Fixed: removed 'const'
        console.log("Parsed JSON:", data)
      } catch (error) {
        console.error("JSON Parse Error:", error)
        showError("Unexpected server response.")
        return
      }

      if (data.success) {
        alert("User deleted successfully!")
        if (redirect) {
          document.getElementById("userDetailsModal").style.display = "none"
          window.location.href = "users.html"
        } else {
          fetchUsers()
        }
      } else {
        showError(data.message || "Failed to delete user. Please try again.")
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      showError("Network error. Please check your connection and try again.")
    }
  }
}

async function stopProfitIncrement(userId) {
  if (confirm("Are you sure you want to stop profit increment for this user?")) {
    try {
      const response = await fetch("http://localhost:8000/api/admin/stop-profit.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("qc_admin_token")}`,
        },
        body: JSON.stringify({ userId }),
      })

      const rawText = await response.text()
      console.log("Raw API Response:", rawText)

      let data
      try {
        data = JSON.parse(rawText) // Fixed: removed 'const'
        console.log("Parsed JSON:", data)
      } catch (error) {
        console.error("JSON Parse Error:", error)
        showError("Unexpected server response.")
        return
      }

      if (data.success) {
        alert("Profit increment stopped successfully!")
        viewUserDetails(userId)
      } else {
        showError(data.message || "Failed to stop profit increment. Please try again.")
      }
    } catch (error) {
      console.error("Error stopping profit increment:", error)
      showError("Network error. Please check your connection and try again.")
    }
  }
}

async function toggleUserBlock(userId, currentStatus) {
  const newStatus = currentStatus === "blocked" ? "active" : "blocked"
  const action = newStatus === "blocked" ? "block" : "unblock"

  if (confirm(`Are you sure you want to ${action} this user?`)) {
    try {
      const response = await fetch("http://localhost:8000/api/admin/users.php", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("qc_admin_token")}`,
        },
        body: JSON.stringify({
          id: userId,
          status: newStatus,
        }),
      })

      const rawText = await response.text()
      console.log("Raw API Response:", rawText)

      let data
      try {
        data = JSON.parse(rawText) // Fixed: removed 'const'
        console.log("Parsed JSON:", data)
      } catch (error) {
        console.error("JSON Parse Error:", error)
        showError("Unexpected server response.")
        return
      }

      if (data.success) {
        alert(`User ${action}ed successfully!`)
        viewUserDetails(userId)
      } else {
        showError(data.message || `Failed to ${action} user. Please try again.`)
      }
    } catch (error) {
      console.error(`Error ${action}ing user:`, error)
      showError("Network error. Please check your connection and try again.")
    }
  }
}

function setupPagination(totalPages, currentPage) {
  const paginationElement = document.getElementById("usersPagination")
  paginationElement.innerHTML = ""

  if (totalPages <= 1) {
    return
  }

  const paginationList = document.createElement("ul")
  paginationList.className = "pagination-list"

  // Previous button
  const prevItem = document.createElement("li")
  prevItem.className = "pagination-item"
  const prevLink = document.createElement("a")
  prevLink.href = "#"
  prevLink.textContent = "Previous"
  prevLink.className = currentPage === 1 ? "disabled" : ""
  prevLink.addEventListener("click", (e) => {
    e.preventDefault()
    if (currentPage > 1) {
      fetchUsers(currentPage - 1)
    }
  })
  prevItem.appendChild(prevLink)
  paginationList.appendChild(prevItem)

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    const pageItem = document.createElement("li")
    pageItem.className = "pagination-item"
    const pageLink = document.createElement("a")
    pageLink.href = "#"
    pageLink.textContent = i
    pageLink.className = i === currentPage ? "active" : ""
    pageLink.addEventListener("click", (e) => {
      e.preventDefault()
      fetchUsers(i)
    })
    pageItem.appendChild(pageLink)
    paginationList.appendChild(pageItem)
  }

  // Next button
  const nextItem = document.createElement("li")
  nextItem.className = "pagination-item"
  const nextLink = document.createElement("a")
  nextLink.href = "#"
  nextLink.textContent = "Next"
  nextLink.className = currentPage === totalPages ? "disabled" : ""
  nextLink.addEventListener("click", (e) => {
    e.preventDefault()
    if (currentPage < totalPages) {
      fetchUsers(currentPage + 1)
    }
  })
  nextItem.appendChild(nextLink)
  paginationList.appendChild(nextItem)

  paginationElement.appendChild(paginationList)
}

function setupModalClosing() {
  // Get the modals
  const userModal = document.getElementById("userModal")
  const userDetailsModal = document.getElementById("userDetailsModal")

  // Get the <span> elements that close the modals
  const spans = document.getElementsByClassName("close")

  // When the user clicks on <span> (x), close the modal
  for (let i = 0; i < spans.length; i++) {
    spans[i].onclick = function () {
      if (this.closest("#userModal")) {
        userModal.style.display = "none"
      } else if (this.closest("#userDetailsModal")) {
        userDetailsModal.style.display = "none"
      }
    }
  }

  // When the user clicks anywhere outside of the modal, close it
  window.onclick = (event) => {
    if (event.target == userModal) {
      userModal.style.display = "none"
    } else if (event.target == userDetailsModal) {
      userDetailsModal.style.display = "none"
    }
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

