const STORAGE_KEY = "pf_expenses_v1";
const BUDGET_KEY = "pf_budget_v1";

let expenses = [];
let budget = 0;
let chart = null;

function saveExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function loadExpenses() {
  try {
    expenses = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    expenses = [];
  }
}

function saveBudget(val) {
  localStorage.setItem(BUDGET_KEY, String(val));
  budget = Number(val);
}

function loadBudget() {
  const raw = localStorage.getItem(BUDGET_KEY);
  budget = raw ? Number(raw) : 0;

  if (isNaN(budget)) budget = 0;
}

function formatCurrency(v) {
  return (
    "₹" +
    Number(v).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

const CAT_META = {
  Food: {
    icon: "🍔",
    color: "#f59e0b",
  },
  Transport: {
    icon: "🚗",
    color: "#06b6d4",
  },
  Rent: {
    icon: "🏠",
    color: "#8b5cf6",
  },
  Utilities: {
    icon: "💡",
    color: "#3b82f6",
  },
  Entertainment: {
    icon: "🎮",
    color: "#ec4899",
  },
  Health: {
    icon: "🏥",
    color: "#10b981",
  },
  Shopping: {
    icon: "🛍️",
    color: "#f43f5e",
  },
  Other: {
    icon: "📦",
    color: "#94a3b8",
  },
};

function getCatMeta(cat) {
  return CAT_META[cat] || { icon: "📦", color: "#94a3b8" };
}

let toastTimer = null;

function showToast(msg, type = "success") {
  const el = document.getElementById("appToast");
  const msgEl = document.getElementById("toastMsg");

  if (!el || !msgEl) return;

  msgEl.textContent = msg;
  el.className = "app-toast show " + type;

  if (toastTimer) clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    el.className = "app-toast";
  }, 3000);
}

function getCurrentYM() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function filterByYM(list, ym) {
  if (!ym) return list;

  return list.filter((e) => {
    const parts = e.date.split("-");

    return `${parts[0]}-${parts[1]}` === ym;
  });
}

function renderExpenses(filterYM) {
  const tbody = document.getElementById("expensesTbody");
  const emptyState = document.getElementById("emptyState");

  if (!tbody) return;

  const rows = filterByYM(expenses, filterYM).sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  tbody.innerHTML = "";

  if (rows.length === 0) {
    if (emptyState) emptyState.style.display = "flex";

    return;
  }

  if (emptyState) emptyState.style.display = "none";

  rows.forEach((e) => {
    const meta = getCatMeta(e.category);
    const tr = document.createElement("tr");
    const tdDate = document.createElement("td");

    tdDate.textContent = formatDate(e.date);
    tr.appendChild(tdDate);

    const tdCat = document.createElement("td");
    const badge = document.createElement("span");

    badge.className = "cat-badge";
    badge.textContent = `${meta.icon} ${e.category}`;
    badge.style.borderColor = meta.color + "44";
    badge.style.color = meta.color;

    tdCat.appendChild(badge);
    tr.appendChild(tdCat);

    const tdDesc = document.createElement("td");

    tdDesc.textContent = e.description || "—";
    tdDesc.style.color = "var(--text-secondary)";
    tr.appendChild(tdDesc);

    const tdAmt = document.createElement("td");

    tdAmt.className = "text-end amount-cell";
    tdAmt.textContent = formatCurrency(e.amount);
    tr.appendChild(tdAmt);

    const tdDel = document.createElement("td");
    const delBtn = document.createElement("button");

    delBtn.className = "btn-delete";
    delBtn.innerHTML = '<i class="bi bi-trash3"></i> Del';
    delBtn.addEventListener("click", () => {
      expenses = expenses.filter((x) => x.id !== e.id);
      saveExpenses();
      const ym = document.getElementById("filterMonth").value;
      renderExpenses(ym);
      updateSummary(ym);
      showToast("Expense deleted 🗑️", "error");
    });

    tdDel.appendChild(delBtn);
    tr.appendChild(tdDel);

    tbody.appendChild(tr);
  });
}

function formatDate(dateStr) {
  try {
    const [y, m, d] = dateStr.split("-");
    const dt = new Date(Number(y), Number(m) - 1, Number(d));

    return dt.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch (e) {
    return dateStr;
  }
}

function updateSummary(filterYM) {
  const monthExpenses = filterByYM(expenses, filterYM);
  const total = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const remaining = budget - total;

  const elTotal = document.getElementById("totalThisMonth");
  const elCount = document.getElementById("countThisMonth");
  const elBudgetDisp = document.getElementById("budgetDisplay");
  const elRemaining = document.getElementById("remainingDisplay");
  const statRemaining = document.getElementById("statRemaining");

  if (elTotal) elTotal.textContent = formatCurrency(total);
  if (elCount) elCount.textContent = monthExpenses.length;
  if (elBudgetDisp)
    elBudgetDisp.textContent = budget > 0 ? formatCurrency(budget) : "—";

  if (elRemaining) {
    elRemaining.textContent = budget > 0 ? formatCurrency(remaining) : "—";
    elRemaining.style.color =
      remaining < 0 ? "var(--accent-rose)" : "var(--accent-green)";
  }

  if (statRemaining) {
    statRemaining.classList.toggle("overspent", budget > 0 && remaining < 0);
  }

  const progBar = document.getElementById("budgetProgress");
  const progPct = document.getElementById("progressPct");
  const progText = document.getElementById("budgetText");

  if (budget > 0) {
    const pct = Math.round((total / budget) * 100);
    const clampedPct = Math.min(100, pct);

    if (progBar) {
      progBar.style.width = clampedPct + "%";
      progBar.classList.toggle("danger", pct >= 100);
    }

    if (progPct) progPct.textContent = pct + "%";

    if (progText)
      progText.textContent = `${formatCurrency(total)} spent of ${formatCurrency(budget)}`;
  } else {
    if (progBar) {
      progBar.style.width = "0%";
      progBar.classList.remove("danger");
    }

    if (progPct) progPct.textContent = "0%";
    if (progText) progText.textContent = "No budget set";
  }

  renderChart(monthExpenses);
}

function renderChart(monthExpenses) {
  const byCat = {};

  monthExpenses.forEach((e) => {
    byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount);
  });

  const labels = Object.keys(byCat);
  const data = labels.map((l) => byCat[l]);
  const canvas = document.getElementById("expenseChart");
  const chartEmpty = document.getElementById("chartEmpty");

  if (!canvas) return;

  if (chart) {
    chart.destroy();
    chart = null;
  }

  if (labels.length === 0) {
    canvas.style.display = "none";
    if (chartEmpty) chartEmpty.style.display = "flex";

    return;
  }

  canvas.style.display = "block";
  if (chartEmpty) chartEmpty.style.display = "none";

  const colors = labels.map((l) => getCatMeta(l).color);

  chart = new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.map((c) => c + "cc"),
          borderColor: colors,
          borderWidth: 1.5,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      cutout: "68%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#94a3b8",
            font: { size: 11, family: "Inter, sans-serif" },
            padding: 14,
            boxWidth: 12,
            boxHeight: 12,
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${formatCurrency(ctx.parsed)}`,
          },
        },
      },
    },
  });
}

function updateMonthLabel(ym) {
  const el = document.getElementById("currentMonthLabel");

  if (!el) return;

  if (!ym) {
    el.textContent = "";
    return;
  }

  const [y, m] = ym.split("-");
  const dt = new Date(Number(y), Number(m) - 1, 1);

  el.textContent = dt.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

$(function () {
  try {
    loadExpenses();
    loadBudget();

    const curYM = getCurrentYM();
    const filterMonthEl = document.getElementById("filterMonth");

    if (filterMonthEl) filterMonthEl.value = curYM;

    const budgetInput = document.getElementById("budgetInput");

    if (budgetInput && budget > 0) budgetInput.value = budget;

    updateMonthLabel(curYM);
    renderExpenses(curYM);
    updateSummary(curYM);

    $("#filterMonth").on("change", function () {
      const f = $(this).val();

      updateMonthLabel(f);
      renderExpenses(f);
      updateSummary(f);
    });

    const parseAndSaveBudget = () => {
      const raw = document.getElementById("budgetInput").value;
      const v = parseFloat(raw);

      if (raw === "" || isNaN(v) || v < 0) {
        showToast("Enter a valid budget amount", "error");
        return;
      }

      saveBudget(v);
      updateSummary(document.getElementById("filterMonth").value);
      showToast("Budget saved! 🎯", "success");
    };

    document
      .getElementById("saveBudget")
      .addEventListener("click", parseAndSaveBudget);

    document.getElementById("budgetInput").addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        parseAndSaveBudget();
      }
    });

    $("#saveExpenseBtn").on("click", () => {
      const date = $("#expDate").val();
      const amount = parseFloat($("#expAmount").val());
      const category = $("#expCategory").val() || "Other";
      const desc = $("#expDesc").val().trim();
      const errEl = document.getElementById("formError");

      if (!date) {
        if (errEl) {
          errEl.textContent = "⚠ Please enter a date.";
          errEl.style.display = "block";
        }
        return;
      }
      if (isNaN(amount) || amount <= 0) {
        if (errEl) {
          errEl.textContent = "⚠ Please enter a valid amount greater than 0.";
          errEl.style.display = "block";
        }
        return;
      }
      if (errEl) errEl.style.display = "none";

      const item = {
        id: Date.now().toString(),
        date,
        amount: Number(amount.toFixed(2)),
        category,
        description: desc,
      };
      expenses.push(item);
      saveExpenses();

      const modalEl = document.getElementById("addExpenseModal");
      const bsModal =
        bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      bsModal.hide();

      $("#expenseForm")[0].reset();

      const ym = $("#filterMonth").val();

      renderExpenses(ym);
      updateSummary(ym);
      showToast(`Added: ${category} – ${formatCurrency(amount)} ✅`, "success");
    });

    $("#expDate, #expAmount").on("input", () => {
      const errEl = document.getElementById("formError");

      if (errEl) errEl.style.display = "none";
    });

    $('[data-bs-toggle="modal"]').each(function () {
      $(this).on("click.bsFallback", function () {
        const target = $(this).attr("data-bs-target");

        if (!target) return;

        const el = document.querySelector(target);

        if (!el) return;

        try {
          const m = bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el);
          m.show();
        } catch (err) {
          console.error("Modal open failed", err);
        }
      });
    });
  } catch (err) {
    console.error("FinanceFlow init error:", err);
  }
});
