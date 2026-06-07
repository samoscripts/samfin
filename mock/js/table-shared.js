function formatAmount(amount) {
  const abs = Math.abs(amount).toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = amount < 0 ? "-" : "+";
  return `${sign}${abs} zł`;
}

function amountClass(amount) {
  return amount < 0 ? "EXPENSE" : "INCOME";
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderCell(value, highlight) {
  if (value == null || value === "") return "-";
  if (highlight) return `<strong>${escapeHtml(value)}</strong>`;
  return escapeHtml(value);
}

function isSplit(tx) {
  return tx.items && tx.items.length > 1;
}

function renderItemAmounts(items) {
  if (!items || items.length === 0) return "-";

  if (items.length === 1) {
    const cls = amountClass(items[0].amount);
    return `<span class="${cls}">${formatAmount(items[0].amount)}</span>`;
  }

  return `<div class="split-items">${items
    .map((item) => {
      const cls = amountClass(item.amount);
      return `<div class="split-item"><span class="split-amount ${cls}">${formatAmount(item.amount)}</span></div>`;
    })
    .join("")}</div>`;
}

function renderItemField(items, field, highlight) {
  if (!items || items.length === 0) return "-";

  if (items.length === 1) {
    return renderCell(items[0][field], highlight && items[0][field] != null);
  }

  return `<div class="split-items">${items
    .map((item) => {
      const value = item[field];
      const label = value != null && value !== "" ? renderCell(value, highlight) : "-";
      return `<div class="split-item"><span class="split-label">${label}</span></div>`;
    })
    .join("")}</div>`;
}

function renderItemTags(items) {
  if (!items || items.length === 0) return "-";

  if (items.length === 1) {
    return renderTags(items[0].tags);
  }

  return `<div class="split-items">${items
    .map((item) => `<div class="split-item">${renderTags(item.tags)}</div>`)
    .join("")}</div>`;
}

function renderTags(tags) {
  if (!tags || tags.length === 0) return "-";
  return tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
}

function renderSelect(options) {
  return `<select>${options.map((opt) => `<option>${escapeHtml(opt)}</option>`).join("")}</select>`;
}

function renderTable(columns, transactions, tableWrapId) {
  const thead = columns.map(
    (col) => `<th class="col-${col.key}">${escapeHtml(col.label)}</th>`,
  ).join("");

  const tbody = transactions
    .map((tx) => {
      const rowClasses = [
        tx.unassigned ? "row-unassigned" : "",
        isSplit(tx) ? "row-split" : "",
      ]
        .filter(Boolean)
        .join(" ");

      const cells = columns.map(
        (col) => `<td class="col-${col.key}">${col.render(tx)}</td>`,
      ).join("");

      return `<tr class="${rowClasses}">${cells}</tr>`;
    })
    .join("");

  const container = document.getElementById(tableWrapId);
  container.innerHTML = `
    <table class="transactions">
      <thead><tr>${thead}</tr></thead>
      <tbody>${tbody}</tbody>
    </table>
  `;
}

function showLoadError(message) {
  const page = document.querySelector(".page");
  const error = document.createElement("p");
  error.className = "error";
  error.textContent = message;
  page.appendChild(error);
}
