document.addEventListener("DOMContentLoaded", () => {
  // Generate random withdrawals data
  const withdrawals = generateRandomWithdrawals();

  // Display only 5 withdrawals at a time
  displayWithdrawals(withdrawals.slice(0, 5));
});

function generateRandomWithdrawals() {
  const names = [
    "John Smith", "Sarah Mitchell", "Michael Thompson", "Emma Roberts", "David King",
    "Lisa Parker", "Robert Sanchez", "Jennifer Lopez", "William Howard", "Maria Gonzalez",
    "James Brown", "Patricia Carter", "Richard White", "Linda Foster", "Thomas Adams",
    "Elizabeth Davis", "Charles Evans", "Susan Nelson", "Joseph Martinez", "Karen Taylor",
    "Mark Wilson", "Emily Harris", "Daniel Allen", "Sophia Scott", "Matthew Clark",
    "Olivia Lewis", "Brian Walker", "Charlotte Hall", "Andrew Allen", "Mia Young",
    "Ethan Wright", "Isabella Green", "Joshua Lee", "Ava Anderson", "Ryan Hill",
    "Amelia Campbell", "Nathan Turner", "Evelyn Phillips", "Henry Ramirez", "Victoria Cooper",
    "Benjamin Stewart", "Zoey Collins", "Samuel Murphy", "Chloe Bell", "Alexander Rivera",
    "Scarlett Howard", "Elijah Ward", "Penelope Brooks", "Sebastian Flores", "Grace Sanders",
    "Daniel Jenkins", "Hannah Reed", "Jackson Kelly", "Madison Ross", "Aiden Wood",
    "Lily Powell", "Dylan Griffin", "Zoe Russell", "Leo Butler", "Nora Perry",
    "Gabriel Barnes", "Lucy Long", "Caleb Patterson", "Layla Bryant", "Isaac Hughes",
    "Hazel Foster", "Owen Jenkins", "Ellie Bell", "Julian Torres", "Savannah Simmons",
    "Levi Watson", "Stella Butler", "Aaron Powell", "Violet Brooks", "Eli Bennett",
    "Aurora Fisher", "Connor Ward", "Aria Coleman", "Hunter Barnes", "Bella Carter",
    "Adrian Cox", "Nevaeh Perez", "Jonathan Kelly", "Sophie Howard", "Dominic Sanders",
    "Paisley Adams", "Austin Morris", "Skylar Jenkins", "Evan White", "Sadie Walker",
    "Jeremiah Parker", "Nova Carter", "Jason Torres", "Kylie Hughes", "Zachary Brooks",
    "Alexa Green", "Angel Thomas", "Taylor Young", "Brandon Martinez", "Caroline Foster",
    "Lucas Wood", "Genesis Rivera", "Ezekiel Butler", "Autumn Bell", "Roman Powell",
    "Serenity Perry", "Ian Long", "Ariana Ramirez", "Jordan Russell", "Peyton Bryant",
    "Xavier Watson", "Luna Phillips", "Jace Griffin", "Isla Foster", "Jayden Jenkins",
    "Harper Ross", "Gavin Butler", "Naomi Hughes", "Axel Kelly", "Samantha Reed",
    "Kayden Ward", "Eva Campbell", "Bryson Torres", "Leah Bennett", "Ryder Simmons",
    "Elena Flores", "Asher Sanders", "Melanie Jenkins", "Easton Brooks", "Madeline Perry",
    "Mateo Hughes", "Sienna White", "Carlos Reed", "Ruby Powell", "Maxwell Carter",
    "Gianna Butler", "Justin Parker", "Mackenzie Long", "Adam Coleman", "Alice Barnes",
    "Bentley Bryant", "Annabelle Ramirez", "Luis Kelly", "Katherine Ross", "Harrison Wood",
    "Hadley Fisher", "Tristan Thomas", "Athena Young", "Jude Adams", "Valentina Morris",
    "Dean Russell", "Clara Simmons", "Sean Rivera", "Vivian Martinez", "Malachi Howard"
  ];

  const amounts = [...Array(200)].map((_, i) => (Math.random() * 4900 + 100).toFixed(2)); // 200 unique amounts

  const count = 200; // Generate 200 random withdrawals
  const withdrawals = [];

  for (let i = 0; i < count; i++) {
    const name = names[i]; // Unique name
    const amount = amounts[i]; // Unique amount

    // Random date within the last 30 days
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    const formattedDate = date.toISOString().split("T")[0];

    withdrawals.push({ name, amount, date: formattedDate });
  }

  return withdrawals;
}

function displayWithdrawals(withdrawals) {
  const withdrawalsTable = document.getElementById("withdrawalsTicker");

  if (!withdrawalsTable) return;
  withdrawalsTable.innerHTML = ""; // Clear previous data

  withdrawals.forEach((withdrawal) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${withdrawal.name}</td>
      <td>$${withdrawal.amount}</td>
      <td>${withdrawal.date}</td>
    `;
    withdrawalsTable.appendChild(row);
  });
}
