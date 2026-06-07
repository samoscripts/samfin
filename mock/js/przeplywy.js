const PRZEPLYWY_COLUMNS = [
  {
    key: "date",
    label: "Data",
    render: (tx) => escapeHtml(tx.date),
  },
  {
    key: "type",
    label: "Typ",
    render: (tx) => escapeHtml(DIRECTION_LABELS[tx.direction]),
  },
  {
    key: "paidFrom",
    label: "Skąd",
    render: (tx) => renderCell(tx.paidFrom, true),
  },
  {
    key: "paidTo",
    label: "Dokąd",
    render: (tx) => escapeHtml(tx.paidTo),
  },
  {
    key: "description",
    label: "Opis",
    render: (tx) => escapeHtml(tx.description),
  },
  {
    key: "wallet",
    label: "Portfel",
    render: (tx) => renderItemField(tx.items, "wallet", true),
  },
  {
    key: "concern",
    label: "Dotyczy",
    render: (tx) => renderItemField(tx.items, "concern"),
  },
  {
    key: "category",
    label: "Kategoria",
    render: (tx) => renderItemField(tx.items, "category"),
  },
  {
    key: "amount",
    label: "Kwota",
    render: (tx) => renderItemAmounts(tx.items),
  },
  {
    key: "amountTotal",
    label: "Kwota razem",
    render: (tx) => {
      const cls = amountClass(tx.amount);
      return `<span class="${cls}">${formatAmount(tx.amount)}</span>`;
    },
  },
  {
    key: "status",
    label: "Status",
    render: (tx) => escapeHtml(tx.status),
  },
];

const DIRECTION_LABELS = {
  EXPENSE: "Wydatek",
  INCOME: "Wpływ",
};

const STATUS_LABELS = {
  UNCLASSIFIED: "Nieklasyfikowany",
  PARTIALLY_CLASSIFIED: "Częściowo sklasyfikowany",
  CLASSIFIED: "Sklasyfikowany",
};

const WALLET_LABELS = {
  BUDZET_DOMOWY: "Budżet Domowy",
  PRYWATNY_BASI: "Prywatny Basi",
  PORTFEL_MACKA: "Portfel Maćka",
  SALON_FRYZJERSKI: "Salon Fryzjerski",
  SAMSOFT: "Samsoft",
};

const CONCERN_LABELS = {
  WSPOLNE: "Wspólne",
  MACIEJ: "Maciej",
  BASIA: "Basia",
  TOSIA: "Tosia",
  SALON: "Salon",
  SAMSOFT: "Samsoft",
};

const ENTITY_LABELS = {
  KONTO_WSPOLNE: "Konto wspólne",
  KONTO_MACKA: "Konto Maćka",
  KONTO_FIRMOWE_BASI: "Konto firmowe Basi",
  GOTOWKA: "Gotówka",
  BASIA: "Basia",
  MACIEJ: "Maciej",
  PAYTEL: "Paytel",
  ALLEGRO: "Allegro",
  SZWAGIERKA: "Szwagierka",
  ZUS: "ZUS",
  BIEDRONKA: "Biedronka",
  ROSSMANN: "Rossmann",
  ZALANDO: "Zalando",
  ENERGA: "Energa",
  ORLEN: "Orlen",
  HEBE: "Hebe",
  APTEKA: "Apteka",
  OSZCZEDNOSCI_WSPOLNE: "Oszczędności wspólne",
  OSZCZEDNOSCI_TOSI: "Oszczędności Tosi",
  URZAD_SKARBOWY: "Urząd skarbowy",
  HURTOWNIA_FRYZJERSKA: "Hurtownia fryzjerska",
  LODZIARNIA: "Lodziarnia",
  NIEZNANY: "Nieznany",
  PAYTEL_BASI: "Paytel Basi",
  LINIE_LOTNICZE: "Linie lotnicze",
  SKLEP_KOMPUTEROWY: "Sklep komputerowy",
  CASTORAMA: "Castorama",
  SKLEP_OBUWNICZY: "Sklep obuwniczy",
  SKLEP_SPOZYWCZY: "Sklep spożywczy",
  STEAM: "Steam",
  DOSTAWCA_OPALU: "Dostawca opału",
};

let allTransactions = [];

function formatPrzeplywyForDisplay(transactions) {
  return transactions.map((tx) => ({
    ...tx,
    paidFrom: ENTITY_LABELS[tx.paidFrom] || tx.paidFrom,
    paidTo: ENTITY_LABELS[tx.paidTo] || tx.paidTo,
    status: STATUS_LABELS[tx.status] || tx.status,
    items: tx.items?.map((item) => ({
      ...item,
      wallet: item.wallet ? WALLET_LABELS[item.wallet] || item.wallet : item.wallet,
      concern: item.concern ? CONCERN_LABELS[item.concern] || item.concern : item.concern,
    })),
  }));
}

function getFilterValues(container) {
  const selects = container.querySelectorAll("select[data-filter]");
  const values = {};
  selects.forEach((sel) => {
    values[sel.dataset.filter] = sel.value;
  });
  return values;
}

function filterTransactions(transactions, values) {
  return transactions.filter((tx) => {
    if (values.type && values.type !== "Wszystkie typy" && tx.direction !== values.type) {
      return false;
    }

    if (values.paidFrom && values.paidFrom !== "Skąd" && tx.paidFrom !== values.paidFrom) {
      return false;
    }
    if (values.paidTo && values.paidTo !== "Dokąd" && tx.paidTo !== values.paidTo) {
      return false;
    }
    if (values.wallet && values.wallet !== "Portfel") {
      if (!tx.items?.some((item) => item.wallet === values.wallet)) return false;
    }
    if (values.concern && values.concern !== "Dotyczy") {
      if (!tx.items?.some((item) => item.concern === values.concern)) return false;
    }
    if (values.categories && values.categories !== "Kategoria") {
      if (!tx.items?.some((item) => item.category === values.categories)) return false;
    }
    if (values.status && values.status !== "Wszystkie statusy" && tx.status !== values.status) {
      return false;
    }

    const query = values.search?.trim().toLowerCase();
    if (query && !tx.description.toLowerCase().includes(query)) return false;

    return true;
  });
}

function renderPrzeplywyTable(transactions) {
  renderTable(
    PRZEPLYWY_COLUMNS,
    formatPrzeplywyForDisplay(transactions),
    "table-wrap-przeplywy",
  );
}

function bindPrzeplywyFilters(container) {
  const rerender = () => {
    const values = getFilterValues(container);
    const search = container.querySelector('input[type="text"]');
    values.search = search?.value || "";
    renderPrzeplywyTable(filterTransactions(allTransactions, values));
  };

  container.querySelectorAll("select, input").forEach((el) => {
    el.addEventListener("change", rerender);
    if (el.tagName === "INPUT") el.addEventListener("input", rerender);
  });
}

function renderPrzeplywyFilters(filters) {
  const container = document.getElementById("filters-przeplywy");
  const select = (key, options) =>
    `<select data-filter="${key}">${options.map((opt) => `<option>${escapeHtml(opt)}</option>`).join("")}</select>`;

  container.innerHTML = `
    <input type="text" placeholder="Szukaj po opisie..." />
    ${select("type", filters.type)}
    ${select("paidFrom", filters.paidFrom)}
    ${select("paidTo", filters.paidTo)}
    ${select("wallet", filters.wallet)}
    ${select("concern", filters.concern)}
    ${select("categories", filters.categories)}
    ${select("status", filters.status)}
  `;

  bindPrzeplywyFilters(container);
}

document.addEventListener("DOMContentLoaded", initPrzeplywy);

async function initPrzeplywy() {
  try {
    const response = await fetch("json/flows.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    allTransactions = data.transactions;
    renderPrzeplywyFilters(data.filters);
    renderPrzeplywyTable(allTransactions);
  } catch (err) {
    showLoadError(
      `Nie udało się załadować przepływów: ${err.message}. Uruchom stronę przez serwer HTTP.`,
    );
  }
}
