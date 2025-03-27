document.addEventListener("DOMContentLoaded", () => {
  // Check if we're already logged in
  const adminToken = localStorage.getItem("qc_admin_token")
  if (adminToken) {
    window.location.href = "dashboard.html"
    return
  }

  // Handle login form submission
  const loginForm = document.getElementById("adminLoginForm")
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault()

      const email = document.getElementById("email").value
      const password = document.getElementById("password").value

      // Validate inputs
      if (!email || !password) {
        showError("Please enter both email and password.")
        return
      }

      try {
        const response = await fetch("http://localhost:8000/api/auth/admin-login.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        })

        const textResponse = await response.text()
        console.log("Raw Response:", textResponse)
        
        const data = JSON.parse(textResponse)


        if (data.success) {
          // Store admin data in localStorage
          localStorage.setItem("qc_admin_token", data.token)
          localStorage.setItem("qc_admin_id", data.admin.id)
          localStorage.setItem("qc_admin_name", data.admin.name)

          // Redirect to dashboard
          window.location.href = "dashboard.html"
        } else {
          showError(data.message || "Login failed. Please check your credentials.")
        }
      } catch (error) {
        console.error("Login error:", error)
        showError("Network error. Please check your connection and try again.")
      }
    })
  }
})

// Helper function to show error messages
function showError(message) {
  const errorElement = document.getElementById("loginError")
  if (errorElement) {
    errorElement.textContent = message
    errorElement.style.display = "block"

    // Hide error after 5 seconds
    setTimeout(() => {
      errorElement.style.display = "none"
    }, 5000)
  }
}

