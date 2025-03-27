document.addEventListener("DOMContentLoaded", () => {
  // ✅ Mobile menu toggle functionality
  const menuToggle = document.querySelector(".mobile-menu-toggle")

  // Try to select nav menu with class first, then fallback to general selector
  const navMenu = document.querySelector("nav ul.nav-menu") || document.querySelector("nav ul")

  if (menuToggle && navMenu) {
    menuToggle.addEventListener("click", () => {
      navMenu.classList.toggle("active")

      // Toggle aria-expanded attribute for accessibility
      const isExpanded = navMenu.classList.contains("active")
      menuToggle.setAttribute("aria-expanded", isExpanded)

      // Optional: Toggle icon between bars and X
      const icon = menuToggle.querySelector("i")
      if (icon) {
        if (isExpanded) {
          icon.classList.remove("fa-bars")
          icon.classList.add("fa-times")
        } else {
          icon.classList.remove("fa-times")
          icon.classList.add("fa-bars")
        }
      }
    })

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      if (navMenu.classList.contains("active") && !navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
        navMenu.classList.remove("active")
        menuToggle.setAttribute("aria-expanded", false)

        // Reset icon
        const icon = menuToggle.querySelector("i")
        if (icon) {
          icon.classList.remove("fa-times")
          icon.classList.add("fa-bars")
        }
      }
    })
  }

  // ✅ Contact form submission
  const contactForm = document.getElementById("contactForm")
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const formData = new FormData(contactForm)
      const name = formData.get("name")
      const email = formData.get("email")
      const message = formData.get("message")

      // Here you would typically send this data to a server
      // For now, we'll just show an alert
      alert(`Thank you, ${name}! Your message has been received. We'll get back to you at ${email} soon.`)
      contactForm.reset()
    })
  }

  // ✅ Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault()

      const targetId = this.getAttribute("href")
      if (targetId === "#") return

      const targetElement = document.querySelector(targetId)
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 70,
          behavior: "smooth",
        })
      }
    })
  })

  // ✅ Feature Slider Functionality (For Mobile View)
  const slider = document.querySelector(".features-slider")
  const dots = document.querySelectorAll(".dot")
  let index = 0

  function updateSlider() {
    slider.style.transform = `translateX(-${index * 100}%)`
    dots.forEach((dot, i) => dot.classList.toggle("active", i === index))
  }

  function nextSlide() {
    index = (index + 1) % dots.length
    updateSlider()
  }

  function prevSlide() {
    index = (index - 1 + dots.length) % dots.length
    updateSlider()
  }

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      index = i
      updateSlider()
    })
  })

  // ✅ Enable swipe functionality for mobile users
  let startX,
    isDragging = false

  slider.addEventListener("touchstart", (e) => {
    isDragging = true
    startX = e.touches[0].clientX
  })

  slider.addEventListener("touchmove", (e) => {
    if (!isDragging) return
    const moveX = e.touches[0].clientX - startX
    if (moveX > 50) {
      prevSlide()
      isDragging = false
    } else if (moveX < -50) {
      nextSlide()
      isDragging = false
    }
  })

  slider.addEventListener("touchend", () => {
    isDragging = false
  })
})

