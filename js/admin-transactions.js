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
  })

  // Check if we have a transaction ID in the URL
  const urlParams = new URLSearchParams(window.location.search)
  const transactionId = urlParams.get("id")
  if (transactionId) {
    viewTransactionDetails(transactionId)
  } else {
    // Fetch and display transactions
    fetchTransactions()

    // Fetch and display pending transactions in the new pending section
    fetchPendingTransactions()

    // Handle search input
    document.getElementById("searchTransaction").addEventListener("input", () => {
      fetchTransactions()
    })

    // Handle type filter
    document.getElementById("typeFilter").addEventListener("change", () => {
      fetchTransactions()
    })

    // Handle status filter
    document.getElementById("statusFilter").addEventListener("change", () => {
      fetchTransactions()
    })
  }

  // Setup modal closing
  setupModalClosing()
})

// Mock function for simulateApiCall (replace with your actual API call)
async function simulateApiCall(endpoint, params) {
  console.log(`Simulating API call to ${endpoint} with params:`, params)
  // Replace this with actual API call logic
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockData = {
        success: true,
        data: [
          { id: 1, type: "deposit", amount: 100, status: "completed", date: "2024-01-01" },
          { id: 2, type: "withdrawal", amount: 50, status: "pending", date: "2024-01-02" },
          { id: 3, type: "deposit", amount: 200, status: "completed", date: "2024-01-03" },
        ],
      }

      // Simulate filtering
      let filteredData = mockData.data
      if (params.search) {
        filteredData = filteredData.filter((item) => item.id.toString().includes(params.search))
      }
      if (params.type && params.type !== "all") {
        filteredData = filteredData.filter((item) => item.type === params.type)
      }
      if (params.status && params.status !== "all") {
        filteredData = filteredData.filter((item) => item.status === params.status)
      }

      resolve({ success: true, data: filteredData.slice(0, params.limit) })
    }, 500)
  })
}

// Mock function for setupModalClosing (replace with your actual modal closing logic)
function setupModalClosing() {
  // Get the modals
  const modals = document.getElementsByClassName("modal")

  // Get the <span> elements that close the modals
  const spans = document.getElementsByClassName("close")

  // When the user clicks on <span> (x), close the modal
  for (let i = 0; i < spans.length; i++) {
    spans[i].onclick = () => {
      for (let j = 0; j < modals.length; j++) {
        modals[j].style.display = "none"
      }
    }
  }

  // When the user clicks anywhere outside of the modal, close it
  window.onclick = (event) => {
    for (let i = 0; i < modals.length; i++) {
      if (event.target == modals[i]) {
        modals[i].style.display = "none"
      }
    }
  }
}

async function fetchTransactions(page = 1) {
  try {
    // Get filter values
    const searchQuery = document.getElementById("searchTransaction").value
    const typeFilter = document.getElementById("typeFilter").value
    const statusFilter = document.getElementById("statusFilter").value
    const limit = 10

    // Build query string
    let queryString = `?page=${page}&limit=${limit}`
    if (searchQuery) {
      queryString += `&search=${encodeURIComponent(searchQuery)}`
    }
    if (typeFilter && typeFilter !== "all") {
      queryString += `&type=${encodeURIComponent(typeFilter)}`
    }
    if (statusFilter && statusFilter !== "all") {
      queryString += `&status=${encodeURIComponent(statusFilter)}`
    }

    const response = await fetch(`../api/admin/transactions.php${queryString}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("qc_admin_token")}`,
      },
    })

    const data = await response.json()

    if (data.success) {
      const transactionsTable = document.getElementById("transactionsList")
      transactionsTable.innerHTML = ""

      if (data.data.length === 0) {
        transactionsTable.innerHTML = '<tr><td colspan="7" class="text-center">No transactions found</td></tr>'
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
          <td class="action-buttons">
            <button class="btn btn-info btn-sm view-transaction" data-id="${transaction.id}">View</button>
            ${
              transaction.status === "pending"
                ? `
              <button class="btn btn-success btn-sm approve-transaction" data-id="${transaction.id}">Approve</button>
              <button class="btn btn-danger btn-sm reject-transaction" data-id="${transaction.id}">Reject</button>
            `
                : ""
            }
          </td>
        `

        transactionsTable.appendChild(row)
      })

      // Add event listeners to action buttons
      document.querySelectorAll(".view-transaction").forEach((button) => {
        button.addEventListener("click", function () {
          const transactionId = this.getAttribute("data-id")
          window.location.href = `transactions.html?id=${transactionId}`
        })
      })

      document.querySelectorAll(".approve-transaction").forEach((button) => {
        button.addEventListener("click", function () {
          const transactionId = this.getAttribute("data-id")
          updateTransactionStatus(transactionId, "completed")
        })
      })

      document.querySelectorAll(".reject-transaction").forEach((button) => {
        button.addEventListener("click", function () {
          const transactionId = this.getAttribute("data-id")
          updateTransactionStatus(transactionId, "failed")
        })
      })

      // Setup pagination
      setupPagination(data.pagination.totalPages, data.pagination.currentPage)
    } else {
      console.error("Failed to fetch transactions:", data.message)
      showError("Failed to load transactions. Please try again.")
    }
  } catch (error) {
    console.error("Error fetching transactions:", error)
    showError("Network error. Please check your connection and try again.")
  }
}

/**
 * NEW FUNCTIONALITY: Fetch pending transactions and render them in a dedicated table.
 */
async function fetchPendingTransactions() {
  try {
    // We use the same API endpoint with a filter for pending transactions.
    const queryString = `?status=pending&limit=10&page=1`
    const response = await fetch(`../api/admin/transactions.php${queryString}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("qc_admin_token")}`,
      },
    })
    const data = await response.json()
    console.log("Fetched Pending Transactions:", data)

    if (data.success) {
      renderPendingTransactions(data.data)
    } else {
      console.error("Failed to fetch pending transactions:", data.message)
      showError("Failed to load pending transactions. Please try again.")
    }
  } catch (error) {
    console.error("Error fetching pending transactions:", error)
    showError("Network error while fetching pending transactions.")
  }
}

/**
 * Render pending transactions in the pending transactions table.
 * Each row displays ID, User, Date, Amount, and action buttons.
 */
function renderPendingTransactions(transactions) {
  const pendingList = document.getElementById("pendingTransactionsList")
  pendingList.innerHTML = ""

  if (transactions.length === 0) {
    pendingList.innerHTML = '<tr><td colspan="5" class="text-center">No pending transactions found</td></tr>'
    return
  }

  transactions.forEach((tx) => {
    const row = document.createElement("tr")
    row.innerHTML = `
      <td>${tx.id}</td>
      <td>${tx.user_name}</td>
      <td>${formatDate(tx.date)}</td>
      <td>$${Number.parseFloat(tx.amount).toFixed(2)}</td>
      <td class="action-buttons">
        <button class="btn btn-success btn-sm pending-approve" data-id="${tx.id}">Approve</button>
        <button class="btn btn-danger btn-sm pending-reject" data-id="${tx.id}">Reject</button>
      </td>
    `
    pendingList.appendChild(row)
  })

  // Attach event listeners for approve and reject buttons.
  document.querySelectorAll(".pending-approve").forEach((button) => {
    button.addEventListener("click", function () {
      const txId = this.getAttribute("data-id")
      updateTransactionStatus(txId, "completed", true)
    })
  })

  document.querySelectorAll(".pending-reject").forEach((button) => {
    button.addEventListener("click", function () {
      const txId = this.getAttribute("data-id")
      updateTransactionStatus(txId, "failed", true)
    })
  })
}

/**
 * View transaction details in a dedicated page or modal.
 */
async function viewTransactionDetails(transactionId) {
  try {
    const response = await fetch(`../api/admin/transactions.php?id=${transactionId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("qc_admin_token")}`,
      },
    })

    const data = await response.json()

    if (data.success) {
      // Show transaction details section and hide transactions list
      document.getElementById("transactionsListSection").style.display = "none"
      document.getElementById("transactionDetailsSection").style.display = "block"

      const transactionDetails = document.getElementById("transactionDetails")

      // Determine status class
      let statusClass = ""
      if (data.data.status === "completed") {
        statusClass = "status-success"
      } else if (data.data.status === "pending") {
        statusClass = "status-pending"
      } else if (data.data.status === "failed") {
        statusClass = "status-failed"
      }

      // Format transaction details
      transactionDetails.innerHTML = `
        <div class="transaction-detail">
          <div class="detail-label">Transaction ID:</div>
          <div class="detail-value">${data.data.id}</div>
        </div>
        <div class="transaction-detail">
          <div class="detail-label">User:</div>
          <div class="detail-value">${data.data.user_name} (${data.data.user_email})</div>
        </div>
        <div class="transaction-detail">
          <div class="detail-label">Type:</div>
          <div class="detail-value">${data.data.type}</div>
        </div>
        <div class="transaction-detail">
          <div class="detail-label">Amount:</div>
          <div class="detail-value">$${Number.parseFloat(data.data.amount).toFixed(2)}</div>
        </div>
        ${
          data.data.fee
            ? `
        <div class="transaction-detail">
          <div class="detail-label">Fee:</div>
          <div class="detail-value">$${Number.parseFloat(data.data.fee).toFixed(2)}</div>
        </div>
        `
            : ""
        }
        ${
          data.data.payment_method
            ? `
        <div class="transaction-detail">
          <div class="detail-label">Payment Method:</div>
          <div class="detail-value">${data.data.payment_method}</div>
        </div>
        `
            : ""
        }
        ${
          data.data.wallet_address
            ? `
        <div class="transaction-detail">
          <div class="detail-label">Wallet Address:</div>
          <div class="detail-value">${data.data.wallet_address}</div>
        </div>
        `
            : ""
        }
        <div class="transaction-detail">
          <div class="detail-label">Date:</div>
          <div class="detail-value">${formatDate(data.data.date)}</div>
        </div>
        <div class="transaction-detail">
          <div class="detail-label">Status:</div>
          <div class="detail-value"><span class="status-badge ${statusClass}">${data.data.status}</span></div>
        </div>
        ${
          data.data.description
            ? `
        <div class="transaction-detail">
          <div class="detail-label">Description:</div>
          <div class="detail-value">${data.data.description}</div>
        </div>
        `
            : ""
        }
      `

      // Set up action buttons
      document.getElementById("backToTransactionsBtn").addEventListener("click", () => {
        window.location.href = "transactions.html"
      })

      // Show approve/reject buttons only for pending transactions
      const actionButtons = document.getElementById("transactionActionButtons")
      if (data.data.status === "pending") {
        actionButtons.innerHTML = `
          <button id="approveTransactionBtn" class="btn btn-success" data-id="${transactionId}">Approve Transaction</button>
          <button id="rejectTransactionBtn" class="btn btn-danger" data-id="${transactionId}">Reject Transaction</button>
        `

        // Add event listeners to action buttons
        document.getElementById("approveTransactionBtn").addEventListener("click", () => {
          updateTransactionStatus(transactionId, "completed", true)
        })

        document.getElementById("rejectTransactionBtn").addEventListener("click", () => {
          updateTransactionStatus(transactionId, "failed", true)
        })
      } else {
        actionButtons.innerHTML = ""
      }
    } else {
      console.error("Failed to fetch transaction details:", data.message)
      showError("Failed to load transaction details. Please try again.")
      window.location.href = "transactions.html"
    }
  } catch (error) {
    console.error("Error fetching transaction details:", error)
    showError("Network error. Please check your connection and try again.")
    window.location.href = "transactions.html"
  }
}

async function updateTransactionStatus(transactionId, status, redirect = false) {
  const statusText = status === "completed" ? "approve" : "reject"

  if (confirm(`Are you sure you want to ${statusText} this transaction?`)) {
    try {
      const response = await fetch("../api/admin/transactions.php", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("qc_admin_token")}`,
        },
        body: JSON.stringify({
          id: transactionId,
          status: status,
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`Transaction ${statusText}ed successfully!`)
        // If in transaction details view, redirect back to the transactions list.
        if (redirect) {
          window.location.href = "transactions.html"
        } else {
          // Refresh both transactions and pending transactions lists.
          fetchTransactions()
          fetchPendingTransactions()
        }
      } else {
        showError(data.message || `Failed to ${statusText} transaction. Please try again.`)
      }
    } catch (error) {
      console.error(`Error ${statusText}ing transaction:`, error)
      showError("Network error. Please check your connection and try again.")
    }
  }
}

function setupPagination(totalPages, currentPage) {
  const paginationElement = document.getElementById("transactionsPagination")
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
      fetchTransactions(currentPage - 1)
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
      fetchTransactions(i)
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
      fetchTransactions(currentPage + 1)
    }
  })
  nextItem.appendChild(nextLink)
  paginationList.appendChild(nextItem)

  paginationElement.appendChild(paginationList)
}

// Helper function to format dates
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString() + " " + date.toLocaleTimeString()
}

// Helper function to show error messages
function showError(message) {
  // Check if error container exists; if not, create one.
  let errorContainer = document.getElementById("errorContainer");
  if (!errorContainer) {
    errorContainer = document.createElement("div");
    errorContainer.id = "errorContainer";
    errorContainer.className = "error-container";
    // Use the .content-area instead of "main" since your HTML doesn't have a <main> element.
    const contentArea = document.querySelector(".content-area");
    if (contentArea) {
      contentArea.prepend(errorContainer);
    } else {
      // Fallback to the body if .content-area is not found.
      document.body.prepend(errorContainer);
    }
  }

  errorContainer.innerHTML = `
    <div class="error-message">
      <p>${message}</p>
      <button class="close-error">×</button>
    </div>
  `;

  // Add event listener to close button
  const closeBtn = errorContainer.querySelector(".close-error");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      errorContainer.innerHTML = "";
    });
  }

  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (errorContainer.querySelector(".error-message")) {
      errorContainer.innerHTML = "";
    }
  }, 5000);
}
