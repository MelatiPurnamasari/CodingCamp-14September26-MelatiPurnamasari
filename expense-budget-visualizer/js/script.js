const STORAGE_KEY = "expenseVisualizerTransactions";
const THEME_KEY = "expenseVisualizerTheme";

let transactions = [];
let spendingChart = null;

const form = document.getElementById("transactionForm");
const itemNameInput = document.getElementById("itemName");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const formMessage = document.getElementById("formMessage");
const totalBalance = document.getElementById("totalBalance");
const transactionList = document.getElementById("transactionList");
const transactionCount = document.getElementById("transactionCount");
const monthlyCount = document.getElementById("monthlyCount");
const monthlyTotal = document.getElementById("monthlyTotal");
const sortSelect = document.getElementById("sortSelect");
const themeToggle = document.getElementById("themeToggle");
const chartCard = document.querySelector(".chart-card");

function formatCurrency(value) {
  return `$${Number(value).toFixed(2)}`;
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadTransactions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    transactions = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Could not load transactions:", error);
    transactions = [];
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function calculateTotal(items = transactions) {
  return items.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
}

function updateTotalBalance() {
  totalBalance.textContent = formatCurrency(calculateTotal());
}

function getSortedTransactions() {
  const sorted = [...transactions];

  switch (sortSelect.value) {
    case "amountAsc":
      return sorted.sort((a, b) => Number(a.amount) - Number(b.amount));
    case "amountDesc":
      return sorted.sort((a, b) => Number(b.amount) - Number(a.amount));
    case "category":
      return sorted.sort((a, b) => a.category.localeCompare(b.category));
    default:
      return sorted.sort((a, b) => new Date(b.date) - new Date(a.date) || b.id.localeCompare(a.id));
  }
}

function renderTransactions() {
  transactionList.innerHTML = "";
  const sorted = getSortedTransactions();
  transactionCount.textContent = transactions.length;

  if (sorted.length === 0) {
    transactionList.innerHTML = `
      <div class="empty-state">
        No transactions yet.<br>
        Add your first expense!
      </div>
    `;
    return;
  }

  sorted.forEach((transaction) => {
    const item = document.createElement("article");
    item.className = "transaction-item";

    const info = document.createElement("div");
    info.className = "transaction-info";

    const name = document.createElement("p");
    name.className = "transaction-name";
    name.textContent = transaction.itemName;

    const amount = document.createElement("p");
    amount.className = "transaction-amount";
    amount.textContent = formatCurrency(transaction.amount);

    const category = document.createElement("span");
    category.className = "category-tag";
    category.textContent = transaction.category;

    info.append(name, amount, category);

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-btn";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete ${transaction.itemName}`);
    deleteButton.addEventListener("click", () => deleteTransaction(transaction.id));

    item.append(info, deleteButton);
    transactionList.appendChild(item);
  });
}

function deleteTransaction(id) {
  transactions = transactions.filter((transaction) => transaction.id !== id);
  saveTransactions();
  refreshUI();
}

function updateChart() {
  const totals = {
    Food: 0,
    Transport: 0,
    Fun: 0
  };

  transactions.forEach((transaction) => {
    if (Object.prototype.hasOwnProperty.call(totals, transaction.category)) {
      totals[transaction.category] += Number(transaction.amount);
    }
  });

  const labels = Object.keys(totals).filter((category) => totals[category] > 0);
  const values = labels.map((category) => totals[category]);

  if (spendingChart) {
    spendingChart.destroy();
    spendingChart = null;
  }

  if (labels.length === 0) {
    chartCard.classList.add("no-data");
    return;
  }

  chartCard.classList.remove("no-data");

  const canvas = document.getElementById("spendingChart");
  const ctx = canvas.getContext("2d");

  spendingChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: ["#2ecc71", "#3498db", "#e67e22"],
        borderColor: "#ffffff",
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 20,
            padding: 14
          }
        },
        tooltip: {
          callbacks: {
            label(context) {
              return `${context.label}: ${formatCurrency(context.raw)}`;
            }
          }
        }
      }
    }
  });
}

function renderMonthlySummary() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyTransactions = transactions.filter((transaction) => {
    const date = new Date(transaction.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  monthlyCount.textContent = monthlyTransactions.length;
  monthlyTotal.textContent = formatCurrency(calculateTotal(monthlyTransactions));
}

function validateForm() {
  const itemName = itemNameInput.value.trim();
  const amount = Number(amountInput.value);
  const category = categoryInput.value;

  if (!itemName || !amountInput.value || !category) {
    return "Please fill in all fields.";
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return "Amount must be greater than 0.";
  }

  return "";
}

function addTransaction(event) {
  event.preventDefault();

  const error = validateForm();

  if (error) {
    formMessage.textContent = error;
    return;
  }

  const transaction = {
    id: createId(),
    itemName: itemNameInput.value.trim(),
    amount: Number(amountInput.value),
    category: categoryInput.value,
    date: new Date().toISOString()
  };

  transactions.push(transaction);
  saveTransactions();

  form.reset();
  formMessage.textContent = "";
  refreshUI();
  itemNameInput.focus();
}

function refreshUI() {
  updateTotalBalance();
  renderTransactions();
  renderMonthlySummary();
  updateChart();
}

function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  themeToggle.setAttribute(
    "aria-label",
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
  );
}

function toggleTheme() {
  const nextTheme = document.body.classList.contains("dark") ? "light" : "dark";
  localStorage.setItem(THEME_KEY, nextTheme);
  applyTheme(nextTheme);
}

function initializeTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(savedTheme);
}

form.addEventListener("submit", addTransaction);
sortSelect.addEventListener("change", renderTransactions);
themeToggle.addEventListener("click", toggleTheme);

loadTransactions();
initializeTheme();
refreshUI();
