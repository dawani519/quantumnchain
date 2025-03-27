document.addEventListener("DOMContentLoaded", () => {
  // Get elements
  const planSelect = document.getElementById("plan-select")
  const investmentAmount = document.getElementById("investment-amount")
  const calculateBtn = document.getElementById("calculate-btn")
  const resultPlan = document.getElementById("result-plan")
  const resultAmount = document.getElementById("result-amount")
  const resultDuration = document.getElementById("result-duration")
  const resultCapital = document.getElementById("result-capital")
  const resultProfit = document.getElementById("result-profit")

  // Plan details
  const plans = {
    starter: {
      name: "Starter",
      dailyRate: 0.1, // 10%
      duration: 4, // weeks
    },
    gold: {
      name: "Gold",
      dailyRate: 0.1, // 10%
      duration: 8, // weeks
    },
    platinum: {
      name: "Platinum",
      dailyRate: 0.15, // 15%
      duration: 8, // weeks
    },
  }

  // Calculate button click handler
  calculateBtn.addEventListener("click", () => {
    calculateReturns()
  })

  // Initial calculation
  calculateReturns()

  // Calculate investment returns
  function calculateReturns() {
    const selectedPlan = planSelect.value
    const amount = Number.parseFloat(investmentAmount.value)

    if (isNaN(amount) || amount < 500) {
      alert("Please enter a valid amount (minimum $500)")
      investmentAmount.value = 500
      return
    }

    const plan = plans[selectedPlan]
    const durationWeeks = plan.duration
    const durationDays = durationWeeks * 7
    const dailyProfit = amount * plan.dailyRate
    const totalProfit = dailyProfit * durationDays

    // Update results
    resultPlan.textContent = plan.name
    resultAmount.textContent = `$${amount.toFixed(2)}`
    resultDuration.textContent = `${durationWeeks} weeks`
    resultCapital.textContent = `$${amount.toFixed(2)}`
    resultProfit.textContent = `$${totalProfit.toFixed(2)}`
  }
})

