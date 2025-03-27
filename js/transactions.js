document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in
  const userToken = localStorage.getItem("qc_user_token")
  if (!userToken) {
    window.location.href = "login.html"
    return
  }

  // Initialize UI elements
  initializeUI()

  // Handle logout
  document.getElementById("logoutBtn").addEventListener("click", (e) => {
    e.preventDefault()
    localStorage.removeItem("qc_user_token")
    localStorage.removeItem("qc_user_id")
    localStorage.removeItem("qc_user_name")
    window.location.href = "login.html"
  })

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
  fetchUserData()

  // Fetch and display transactions
  fetchTransactions()

  // Handle transaction type filter
  document.getElementById("transactionTypeFilter").addEventListener("change", () => {
    fetchTransactions()
  })

  // Handle transaction status filter
  document.getElementById("transactionStatusFilter").addEventListener("change", () => {
    fetchTransactions()
  })

  // Setup modal closing
  setupModalClosing()
})

function initializeUI() {
  // Set user name in the header
  const userName = localStorage.getItem("qc_user_name")
  if (userName) {
    document.getElementById("userName").textContent = userName
    document.getElementById("userAvatar").textContent = userName.charAt(0).toUpperCase()
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

    if (userData.success) {
      // Update UI with user data
      document.getElementById("userBalance").textContent = Number(userData.user.balance).toFixed(2);
    } else {
      console.error("Failed to fetch user data:", userData.message);
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
  }
}
      

async function fetchTransactions() {
  try {
    const typeFilter = document.getElementById("transactionTypeFilter").value;
    const statusFilter = document.getElementById("transactionStatusFilter").value;
    const userId = localStorage.getItem("qc_user_id");

    const response = await fetch(`http://localhost:8000/api/transaction/transactions.php?user_id=${userId}&type=${typeFilter}&status=${statusFilter}`, {
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

    const transactionsTable = document.getElementById("transactionsList");
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
          <td><button class="btn btn-info btn-sm view-transaction" data-id="${transaction.id}">View</button></td>
        `;

        transactionsTable.appendChild(row);
      });

      // Add event listeners to view buttons
      document.querySelectorAll(".view-transaction").forEach((button) => {
        button.addEventListener("click", function () {
          const transactionId = this.getAttribute("data-id");
          viewTransactionDetails(transactionId);
        });
      });

      // Setup pagination
      setupPagination(transactions.pagination.totalPages, transactions.pagination.currentPage);
    } else {
      transactionsTable.innerHTML = '<tr><td colspan="6" class="text-center">No transactions found</td></tr>';
    }
  } catch (error) {
    console.error("Error fetching transactions:", error);
  }
}

async function viewTransactionDetails(transactionId) {
  try {
    const response = await fetch(`http://localhost:8000/api/transaction/transactions.php?id=${transactionId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("qc_user_token")}`,
      },
    });

    const rawText = await response.text();
    console.log("Raw API Response:", rawText);

    const transaction = JSON.parse(rawText);
    console.log("Parsed JSON:", transaction);

    if (transaction.success) {
      const transactionDetails = document.getElementById("transactionDetails");

      // Determine status class
      let statusClass = "";
      if (transaction.data.status === "completed") {
        statusClass = "status-success";
      } else if (transaction.data.status === "pending") {
        statusClass = "status-pending";
      } else if (transaction.data.status === "failed") {
        statusClass = "status-failed";
      }

      // Format transaction details
      let detailsHTML = `
        <div class="transaction-detail">
            <div class="detail-label">Transaction ID:</div>
            <div class="detail-value">${transaction.data.id}</div>
        </div>
        <div class="transaction-detail">
            <div class="detail-label">Type:</div>
            <div class="detail-value">${transaction.data.type}</div>
        </div>
        <div class="transaction-detail">
            <div class="detail-label">Amount:</div>
            <div class="detail-value">$${Number(transaction.data.amount).toFixed(2)}</div>
        </div>
        <div class="transaction-detail">
            <div class="detail-label">Date:</div>
            <div class="detail-value">${formatDate(transaction.data.date)}</div>
        </div>
        <div class="transaction-detail">
            <div class="detail-label">Status:</div>
            <div class="detail-value"><span class="status-badge ${statusClass}">${transaction.data.status}</span></div>
        </div>
      `;

      // Add additional details based on transaction type
      if (transaction.data.type === "deposit") {
        detailsHTML += `
          <div class="transaction-detail">
              <div class="detail-label">Payment Method:</div>
              <div class="detail-value">${transaction.data.payment_method}</div>
          </div>
          <div class="transaction-detail">
              <div class="detail-label">Wallet Address:</div>
              <div class="detail-value">${transaction.data.wallet_address}</div>
          </div>
        `;
      } else if (transaction.data.type === "withdrawal") {
        detailsHTML += `
          <div class="transaction-detail">
              <div class="detail-label">Withdrawal Method:</div>
              <div class="detail-value">${transaction.data.payment_method}</div>
          </div>
          <div class="transaction-detail">
              <div class="detail-label">Wallet Address:</div>
              <div class="detail-value">${transaction.data.wallet_address}</div>
          </div>
        `;
      }

      transactionDetails.innerHTML = detailsHTML;

      // Show modal
      document.getElementById("transactionModal").style.display = "block";
    } else {
      console.error("Failed to fetch transaction details:", transaction.message);
    }
  } catch (error) {
    console.error("Error fetching transaction details:", error);
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
      goToPage(currentPage - 1)
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
      goToPage(i)
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
      goToPage(currentPage + 1)
    }
  })
  nextItem.appendChild(nextLink)
  paginationList.appendChild(nextItem)

  paginationElement.appendChild(paginationList)
}

function goToPage(page) {
  // Update current page and fetch transactions
  document.querySelector(".pagination-item a.active")?.classList.remove("active")
  document.querySelector(`.pagination-item a[text="${page}"]`)?.classList.add("active")
  fetchTransactions(page)
}

function setupModalClosing() {
  // Get the modal
  const modal = document.getElementById("transactionModal")

  // Get the <span> element that closes the modal
  const span = document.getElementsByClassName("close")[0]

  // When the user clicks on <span> (x), close the modal
  span.onclick = () => {
    modal.style.display = "none"
  }

  // When the user clicks anywhere outside of the modal, close it
  window.onclick = (event) => {
    if (event.target == modal) {
      modal.style.display = "none"
    }
  }
}

// Helper function to format dates
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString() + " " + date.toLocaleTimeString()
}

