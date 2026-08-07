/* =============================================
   BudgetViz — Expense & Budget Visualizer
   JavaScript — Main Logic
   ============================================= */
'use strict';

// ─── Category Emoji Map ───────────────────────────────────────────────────────
const CATEGORY_EMOJI = {
  'Makanan':      '🍔',
  'Transportasi': '🚗',
  'Belanja':      '🛍️',
  'Hiburan':      '🎮',
  'Kesehatan':    '💊',
  'Pendidikan':   '📚',
  'Gaji':         '💼',
  'Lainnya':      '📌',
};

// ─── Chart Colors ─────────────────────────────────────────────────────────────
const CHART_COLORS = [
  '#5b9bd5','#4db88c','#e87c2e','#e8b84b',
  '#e05c5c','#a78bfa','#38bdf8','#fb923c',
  '#34d399','#f472b6','#facc15','#60a5fa',
];

// ─── Currency Config ──────────────────────────────────────────────────────────
const CURRENCY_CONFIG = {
  IDR: { symbol: 'Rp',  locale: 'id-ID', decimals: 0 },
  USD: { symbol: '$',   locale: 'en-US', decimals: 2 },
  EUR: { symbol: '€',   locale: 'de-DE', decimals: 2 },
  JPY: { symbol: '¥',   locale: 'ja-JP', decimals: 0 },
  SGD: { symbol: 'S$',  locale: 'en-SG', decimals: 2 },
  MYR: { symbol: 'RM',  locale: 'ms-MY', decimals: 2 },
  GBP: { symbol: '£',   locale: 'en-GB', decimals: 2 },
  CNY: { symbol: '¥',   locale: 'zh-CN', decimals: 2 },
};

function formatMoney(amount, currency = 'IDR') {
  const cfg = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG['IDR'];
  const fmt = new Intl.NumberFormat(cfg.locale, {
    minimumFractionDigits: cfg.decimals,
    maximumFractionDigits: cfg.decimals,
  }).format(amount);
  return `${cfg.symbol} ${fmt}`;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_CATS = [
  'Makanan','Transportasi','Belanja','Hiburan',
  'Kesehatan','Pendidikan','Gaji','Lainnya',
];

const LS_TX          = 'budgetviz_transactions';
const LS_CATS        = 'budgetviz_categories';
const LS_CATS_HIDDEN = 'budgetviz_cats_hidden';
const LS_CAT_RENAME  = 'budgetviz_cats_rename';
const LS_BUDGETS     = 'budgetviz_budgets';
const LS_THEME       = 'budgetviz_theme';

// ─── State ────────────────────────────────────────────────────────────────────
let transactions     = [];
let customCategories = [];
let hiddenDefaults   = [];
let renamedCats      = {};
/**
 * budgets: array of { id, category, amount, currency }
 * amount = alokasi/anggaran yang ditetapkan user untuk kategori tsb
 */
let budgets      = [];
let chartInstance = null;

// ─── DOM Refs ─────────────────────────────────────────────────────────────────
const form            = document.getElementById('transactionForm');
const itemNameInput   = document.getElementById('itemName');
const qtyInput        = document.getElementById('qty');
const totalPriceInput = document.getElementById('totalPrice');
const currencySelect  = document.getElementById('currencySelect');
const typeInput       = document.getElementById('type');
const categorySelect  = document.getElementById('category');
const customCatInput  = document.getElementById('customCategory');
const addCatBtn       = document.getElementById('addCategoryBtn');
const catListEl       = document.getElementById('catList');
const submitBtn       = document.getElementById('submitBtn');
const formCard        = document.getElementById('formCard');
const incomeBudgetPanel = document.getElementById('incomeBudgetPanel');

// field wrapper untuk hide/show
const fieldItemName   = document.getElementById('fieldItemName');
const fieldQty        = document.getElementById('fieldQty');
const labelTotalPrice = document.getElementById('labelTotalPrice');

const tabExpenseBtn   = document.getElementById('tabExpense');
const tabIncomeBtn    = document.getElementById('tabIncome');

const errName      = document.getElementById('errName');
const errQty       = document.getElementById('errQty');
const errPrice     = document.getElementById('errPrice');
const errCategory  = document.getElementById('errCategory');
const errCustomCat = document.getElementById('errCustomCat');

const subtotalDisplay  = document.getElementById('subtotalDisplay');
const unitPriceInfo    = document.getElementById('unitPriceInfo');
const unitPriceDisplay = document.getElementById('unitPriceDisplay');

const totalBalanceEl  = document.getElementById('totalBalance');
const totalIncomeEl   = document.getElementById('totalIncome');
const totalExpenseEl  = document.getElementById('totalExpense');

const transactionList = document.getElementById('transactionList');
const emptyState      = document.getElementById('emptyState');
const sortSelect      = document.getElementById('sortSelect');

const themeToggleBtn  = document.getElementById('themeToggle');
const themeIcon       = document.getElementById('themeIcon');
const htmlEl          = document.documentElement;

const chartCanvas   = document.getElementById('expenseChart');
const chartEmptyMsg = document.getElementById('chartEmpty');
const chartLegendEl = document.getElementById('chartLegend');
const toastEl       = document.getElementById('toast');

const budgetCatSelect   = document.getElementById('budgetCatSelect');
const budgetAmountInput = document.getElementById('budgetAmount');
const budgetCurrencySel = document.getElementById('budgetCurrencySelect');
const addBudgetBtn      = document.getElementById('addBudgetBtn');
const budgetListEl      = document.getElementById('budgetList');
const budgetEmptyEl     = document.getElementById('budgetEmpty');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2800);
}
function getCategoryEmoji(cat) { return CATEGORY_EMOJI[cat] || '🏷️'; }
function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}
function getSelectedCurrency() {
  return currencySelect ? currencySelect.value : 'IDR';
}
function displayName(cat) { return renamedCats[cat] || cat; }

// ─── LocalStorage ─────────────────────────────────────────────────────────────
function saveToStorage() {
  localStorage.setItem(LS_TX,          JSON.stringify(transactions));
  localStorage.setItem(LS_CATS,        JSON.stringify(customCategories));
  localStorage.setItem(LS_CATS_HIDDEN, JSON.stringify(hiddenDefaults));
  localStorage.setItem(LS_CAT_RENAME,  JSON.stringify(renamedCats));
  localStorage.setItem(LS_BUDGETS,     JSON.stringify(budgets));
}
function loadFromStorage() {
  const tx      = localStorage.getItem(LS_TX);
  const cats    = localStorage.getItem(LS_CATS);
  const hidden  = localStorage.getItem(LS_CATS_HIDDEN);
  const rename  = localStorage.getItem(LS_CAT_RENAME);
  const bud     = localStorage.getItem(LS_BUDGETS);
  const theme   = localStorage.getItem(LS_THEME);

  transactions     = tx     ? JSON.parse(tx)     : [];
  customCategories = cats   ? JSON.parse(cats)   : [];
  hiddenDefaults   = hidden ? JSON.parse(hidden) : [];
  renamedCats      = rename ? JSON.parse(rename) : {};
  budgets          = bud    ? JSON.parse(bud)    : [];

  if (theme) applyTheme(theme, false);
}

// ─── Theme ────────────────────────────────────────────────────────────────────
function applyTheme(theme, save = true) {
  htmlEl.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  if (save) localStorage.setItem(LS_THEME, theme);
  if (chartInstance) updateChart();
}
themeToggleBtn.addEventListener('click', () => {
  applyTheme(htmlEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

// ─── Tab Switcher (Income / Expense) ─────────────────────────────────────────
function setActiveTab(type) {
  typeInput.value = type;

  if (type === 'expense') {
    tabExpenseBtn.className = 'form-tab active-expense';
    tabIncomeBtn.className  = 'form-tab';
    tabExpenseBtn.setAttribute('aria-selected', 'true');
    tabIncomeBtn.setAttribute('aria-selected', 'false');
    formCard.className = 'glass-card form-card mode-expense';
    submitBtn.textContent = '⬇️ Catat Pengeluaran';

    // Tampilkan field nama barang & jumlah
    fieldItemName.classList.remove('field-hidden');
    fieldQty.classList.remove('field-hidden');
    labelTotalPrice.textContent = 'Harga Total';
    itemNameInput.placeholder = 'Sayur';

    // Sembunyikan budget panel
    if (incomeBudgetPanel) incomeBudgetPanel.style.display = 'none';

  } else {
    // income
    tabIncomeBtn.className  = 'form-tab active-income';
    tabExpenseBtn.className = 'form-tab';
    tabIncomeBtn.setAttribute('aria-selected', 'true');
    tabExpenseBtn.setAttribute('aria-selected', 'false');
    formCard.className = 'glass-card form-card mode-income';
    submitBtn.textContent = '⬆️ Catat Pemasukan';

    // Sembunyikan field nama barang & jumlah
    fieldItemName.classList.add('field-hidden');
    fieldQty.classList.add('field-hidden');
    labelTotalPrice.textContent = 'Nominal Pemasukan';

    // Bersihkan unit-price info juga
    unitPriceInfo.style.display = 'none';

    // Tampilkan budget planner panel
    if (incomeBudgetPanel) incomeBudgetPanel.style.display = 'block';
    renderBudgetList();
  }
}

tabExpenseBtn.addEventListener('click', () => setActiveTab('expense'));
tabIncomeBtn.addEventListener('click',  () => setActiveTab('income'));

// ─── Live Preview ─────────────────────────────────────────────────────────────
function updatePreview() {
  const qty      = parseFloat(qtyInput.value) || 0;
  const total    = parseFloat(totalPriceInput.value) || 0;
  const currency = getSelectedCurrency();

  subtotalDisplay.textContent = total > 0 ? formatMoney(total, currency) : '—';

  if (qty > 0 && total > 0) {
    unitPriceDisplay.textContent = formatMoney(total / qty, currency);
    unitPriceInfo.style.display  = 'flex';
  } else {
    unitPriceInfo.style.display = 'none';
  }
}
qtyInput.addEventListener('input',        updatePreview);
totalPriceInput.addEventListener('input', updatePreview);
currencySelect.addEventListener('change', updatePreview);

// ─── Category Options ─────────────────────────────────────────────────────────
function getAllVisibleCats() {
  return [
    ...DEFAULT_CATS.filter(c => !hiddenDefaults.includes(c)),
    ...customCategories,
  ];
}

function renderCategoryOptions() {
  categorySelect.innerHTML = '';
  getAllVisibleCats().forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = `${getCategoryEmoji(cat)} ${displayName(cat)}`;
    categorySelect.appendChild(opt);
  });
}

function renderBudgetCatOptions() {
  budgetCatSelect.innerHTML = '';
  getAllVisibleCats().forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = `${getCategoryEmoji(cat)} ${displayName(cat)}`;
    budgetCatSelect.appendChild(opt);
  });
}

// ─── Cat List (manage panel) ──────────────────────────────────────────────────
function renderCatList() {
  catListEl.innerHTML = '';
  const allCats = [
    ...DEFAULT_CATS.map(c => ({ name: c, isDefault: true })),
    ...customCategories.map(c => ({ name: c, isDefault: false })),
  ];

  allCats.forEach(({ name, isDefault }) => {
    const isHidden = isDefault && hiddenDefaults.includes(name);
    const label    = displayName(name);

    const row = document.createElement('div');
    row.className = `cat-item${isHidden ? ' cat-hidden' : ''}`;

    const emoji = document.createElement('span');
    emoji.className = 'cat-item-emoji';
    emoji.textContent = getCategoryEmoji(name);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'cat-item-name';
    nameInput.value = label;
    nameInput.readOnly = true;

    const actions = document.createElement('div');
    actions.className = 'cat-item-actions';

    // Edit / Save
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'cat-action-btn cat-btn-edit';
    editBtn.title = 'Rename';
    editBtn.textContent = '✏️';
    let editing = false;

    editBtn.addEventListener('click', () => {
      editing = !editing;
      if (editing) {
        nameInput.readOnly = false;
        nameInput.classList.add('editing');
        nameInput.focus(); nameInput.select();
        editBtn.textContent = '💾';
        editBtn.classList.replace('cat-btn-edit','cat-btn-save');
      } else {
        const nv = nameInput.value.trim();
        if (nv && nv !== label) {
          renamedCats[name] = nv;
          saveToStorage();
          renderCategoryOptions();
          renderBudgetCatOptions();
          renderCatList();
          showToast(`Kategori diubah ke "${nv}" ✅`);
          return;
        }
        nameInput.value = label; nameInput.readOnly = true;
        nameInput.classList.remove('editing');
        editBtn.textContent = '✏️';
        editBtn.classList.replace('cat-btn-save','cat-btn-edit');
      }
    });
    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') editBtn.click();
      if (e.key === 'Escape') {
        editing = false; nameInput.value = label;
        nameInput.readOnly = true; nameInput.classList.remove('editing');
        editBtn.textContent = '✏️'; editBtn.classList.replace('cat-btn-save','cat-btn-edit');
      }
    });
    actions.appendChild(editBtn);

    if (isDefault) {
      const hideBtn = document.createElement('button');
      hideBtn.type = 'button';
      hideBtn.className = 'cat-action-btn cat-btn-hide';
      hideBtn.title = isHidden ? 'Tampilkan' : 'Sembunyikan';
      hideBtn.textContent = isHidden ? '👁️' : '🙈';
      hideBtn.addEventListener('click', () => {
        if (hiddenDefaults.includes(name)) hiddenDefaults = hiddenDefaults.filter(h=>h!==name);
        else hiddenDefaults.push(name);
        saveToStorage();
        renderCategoryOptions();
        renderBudgetCatOptions();
        renderCatList();
        renderBudgetList();
        showToast(hiddenDefaults.includes(name)
          ? `"${displayName(name)}" disembunyikan`
          : `"${displayName(name)}" ditampilkan kembali`);
      });
      actions.appendChild(hideBtn);
      const badge = document.createElement('span');
      badge.className = 'cat-badge-default';
      badge.textContent = 'default';
      row.append(emoji, nameInput, badge, actions);
    } else {
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'cat-action-btn cat-btn-del';
      delBtn.title = 'Hapus';
      delBtn.textContent = '🗑️';
      delBtn.addEventListener('click', () => {
        customCategories = customCategories.filter(c => c !== name);
        delete renamedCats[name];
        budgets = budgets.filter(b => b.category !== name);
        saveToStorage();
        renderCategoryOptions();
        renderBudgetCatOptions();
        renderCatList();
        renderBudgetList();
        showToast(`Kategori "${displayName(name)}" dihapus`);
      });
      actions.appendChild(delBtn);
      row.append(emoji, nameInput, actions);
    }
    catListEl.appendChild(row);
  });
}

addCatBtn.addEventListener('click', () => {
  const raw = customCatInput.value.trim();
  if (!raw) { errCustomCat.textContent='Nama tidak boleh kosong.'; customCatInput.classList.add('is-invalid'); return; }
  const all = [...DEFAULT_CATS,...customCategories];
  if (all.some(c=>c.toLowerCase()===raw.toLowerCase())) { errCustomCat.textContent='Kategori sudah ada.'; customCatInput.classList.add('is-invalid'); return; }
  if (raw.length>30) { errCustomCat.textContent='Maksimal 30 karakter.'; customCatInput.classList.add('is-invalid'); return; }
  customCategories.push(raw);
  saveToStorage();
  renderCategoryOptions(); renderBudgetCatOptions(); renderCatList();
  categorySelect.value = raw;
  customCatInput.value=''; customCatInput.classList.remove('is-invalid'); errCustomCat.textContent='';
  showToast(`Kategori "${raw}" ditambahkan! 🎉`);
});
customCatInput.addEventListener('input',()=>{ customCatInput.classList.remove('is-invalid'); errCustomCat.textContent=''; });

// ─── Budget Planner ───────────────────────────────────────────────────────────

/**
 * Hitung total pengeluaran per kategori dalam currency IDR-equivalent.
 * Karena budget bisa beda currency, kita bandingkan dalam currency budget masing-masing.
 * Yang dijumlah: transaksi expense dengan kategori & currency yang sama.
 */
function getExpenseForCat(category, currency) {
  return transactions
    .filter(t => t.type === 'expense' && t.category === category && (t.currency || 'IDR') === currency)
    .reduce((acc, t) => acc + t.amount, 0);
}

/**
 * Tambah atau update budget.
 * Jika kategori + currency sudah ada → update amount-nya.
 */
addBudgetBtn.addEventListener('click', () => {
  const cat    = budgetCatSelect.value;
  const amt    = parseFloat(budgetAmountInput.value);
  const cur    = budgetCurrencySel ? budgetCurrencySel.value : 'IDR';

  if (!cat) { showToast('Pilih kategori terlebih dahulu.'); return; }
  if (!amt || amt <= 0) { showToast('Masukkan nominal anggaran yang valid.'); return; }

  const existing = budgets.find(b => b.category === cat && b.currency === cur);
  if (existing) {
    existing.amount = amt;
    showToast(`Anggaran "${displayName(cat)}" diperbarui ke ${formatMoney(amt, cur)} ✅`);
  } else {
    budgets.push({ id: generateId(), category: cat, amount: amt, currency: cur });
    showToast(`Anggaran "${displayName(cat)}" → ${formatMoney(amt, cur)} ditambahkan! 🎉`);
  }

  saveToStorage();
  renderBudgetList();
  budgetAmountInput.value = '';
});

function renderBudgetList() {
  // Hapus semua item budget (bukan budgetEmpty)
  Array.from(budgetListEl.children).forEach(el => {
    if (!el.classList.contains('budget-empty')) el.remove();
  });

  if (budgets.length === 0) {
    budgetEmptyEl.style.display = 'block';
    return;
  }
  budgetEmptyEl.style.display = 'none';

  budgets.forEach(b => {
    const spent  = getExpenseForCat(b.category, b.currency);
    const pct    = b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 0;
    const rawPct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    const sisa   = Math.max(b.amount - spent, 0);

    // Tentukan level
    let level = 'ok';
    if (rawPct >= 100) level = 'danger';
    else if (rawPct >= 75) level = 'warning';

    const item = document.createElement('div');
    item.className = 'budget-item';
    item.dataset.id = b.id;

    item.innerHTML = `
      <div class="budget-item-header">
        <div class="budget-item-left">
          <span class="budget-item-emoji">${getCategoryEmoji(b.category)}</span>
          <span class="budget-item-name">${escapeHtml(displayName(b.category))}</span>
        </div>
        <span class="budget-item-amounts">
          ${formatMoney(spent, b.currency)} / ${formatMoney(b.amount, b.currency)}
        </span>
        <button class="budget-del-btn" data-id="${b.id}" title="Hapus anggaran">✕</button>
      </div>
      <div class="budget-bar-wrap">
        <div class="budget-bar-fill ${level}" style="width:${pct}%"></div>
      </div>
      <div class="budget-bar-label">
        <span>${rawPct >= 100
          ? `<span style="color:var(--accent-red);font-weight:600;">⚠️ Melebihi anggaran!</span>`
          : `Sisa: ${formatMoney(sisa, b.currency)}`
        }</span>
        <span class="pct ${level}">${rawPct.toFixed(1)}%</span>
      </div>
    `;

    item.querySelector('.budget-del-btn').addEventListener('click', () => {
      budgets = budgets.filter(x => x.id !== b.id);
      saveToStorage();
      renderBudgetList();
      showToast(`Anggaran "${displayName(b.category)}" dihapus`);
    });

    budgetListEl.appendChild(item);
  });
}

// ─── Validasi Form ────────────────────────────────────────────────────────────
function clearErrors() {
  [itemNameInput, qtyInput, totalPriceInput, categorySelect].forEach(el => el.classList.remove('is-invalid'));
  errName.textContent = errQty.textContent = errPrice.textContent = errCategory.textContent = '';
}

function validateForm(name, qty, total, category, isIncome) {
  let ok = true;

  if (!isIncome) {
    // Pengeluaran: butuh nama & qty
    if (!name) {
      errName.textContent = 'Nama tidak boleh kosong.';
      itemNameInput.classList.add('is-invalid'); ok = false;
    } else if (name.length > 60) {
      errName.textContent = 'Maksimal 60 karakter.';
      itemNameInput.classList.add('is-invalid'); ok = false;
    }

    if (!qty || isNaN(qty) || Number(qty) <= 0) {
      errQty.textContent = 'Jumlah harus > 0.';
      qtyInput.classList.add('is-invalid'); ok = false;
    } else if (!Number.isInteger(Number(qty))) {
      errQty.textContent = 'Harus bilangan bulat.';
      qtyInput.classList.add('is-invalid'); ok = false;
    }
  }

  if (!total || isNaN(total) || Number(total) <= 0) {
    errPrice.textContent = 'Nominal harus > 0.';
    totalPriceInput.classList.add('is-invalid'); ok = false;
  } else if (Number(total) > 1_000_000_000_000) {
    errPrice.textContent = 'Terlalu besar.';
    totalPriceInput.classList.add('is-invalid'); ok = false;
  }

  if (!category) {
    errCategory.textContent = 'Pilih kategori.';
    categorySelect.classList.add('is-invalid'); ok = false;
  }
  return ok;
}

itemNameInput.addEventListener('input',   () => { itemNameInput.classList.remove('is-invalid');   errName.textContent = ''; });
qtyInput.addEventListener('input',        () => { qtyInput.classList.remove('is-invalid');        errQty.textContent = ''; });
totalPriceInput.addEventListener('input', () => { totalPriceInput.classList.remove('is-invalid'); errPrice.textContent = ''; });
categorySelect.addEventListener('change', () => { categorySelect.classList.remove('is-invalid');  errCategory.textContent = ''; });

// ─── Submit ───────────────────────────────────────────────────────────────────
form.addEventListener('submit', e => {
  e.preventDefault();
  clearErrors();

  const type     = typeInput.value;
  const isIncome = type === 'income';
  const category = categorySelect.value;
  const currency = getSelectedCurrency();
  const total    = totalPriceInput.value.trim();

  // Untuk income: nama & qty tidak dipakai dari input
  const name = isIncome
    ? `Pemasukan — ${displayName(category)}`
    : itemNameInput.value.trim();
  const qty  = isIncome ? '1' : qtyInput.value.trim();

  if (!validateForm(name, qty, total, category, isIncome)) return;

  const totalNum = Number(total);
  const qtyNum   = Number(qty);

  transactions.unshift({
    id:        generateId(),
    name,
    qty:       qtyNum,
    unitPrice: totalNum / qtyNum,
    amount:    totalNum,
    currency,
    type,
    category,
    date: new Date().toISOString(),
  });

  saveToStorage();
  renderAll();
  renderBudgetList();

  form.reset();
  subtotalDisplay.textContent = '—';
  unitPriceInfo.style.display = 'none';
  setActiveTab(type);
  renderCategoryOptions();
  renderCatList();

  showToast(`${isIncome ? '⬆️' : '⬇️'} "${name}" dicatat! ✅`);
});

// ─── Hapus Transaksi ──────────────────────────────────────────────────────────
function deleteTransaction(id) {
  const tx = transactions.find(t => t.id === id);
  transactions = transactions.filter(t => t.id !== id);
  saveToStorage();
  renderAll();
  renderBudgetList();
  if (tx) showToast(`"${tx.name}" dihapus. 🗑️`);
}

// ─── Sort ─────────────────────────────────────────────────────────────────────
function getSortedTransactions() {
  const sorted = [...transactions];
  switch (sortSelect.value) {
    case 'newest':  sorted.sort((a,b) => new Date(b.date)-new Date(a.date)); break;
    case 'oldest':  sorted.sort((a,b) => new Date(a.date)-new Date(b.date)); break;
    case 'highest': sorted.sort((a,b) => b.amount-a.amount); break;
    case 'lowest':  sorted.sort((a,b) => a.amount-b.amount); break;
  }
  return sorted;
}
sortSelect.addEventListener('change', renderTransactionList);

// ─── Hapus Transaksi ──────────────────────────────────────────────────────────
function deleteTransaction(id) {
  const tx = transactions.find(t => t.id === id);
  transactions = transactions.filter(t => t.id !== id);
  saveToStorage();
  renderAll();
  renderBudgetList();
  if (tx) showToast(`"${tx.name}" dihapus. 🗑️`);
}

// ─── Sort ─────────────────────────────────────────────────────────────────────
function getSortedTransactions() {
  const sorted = [...transactions];
  switch (sortSelect.value) {
    case 'newest':  sorted.sort((a,b) => new Date(b.date) - new Date(a.date)); break;
    case 'oldest':  sorted.sort((a,b) => new Date(a.date) - new Date(b.date)); break;
    case 'highest': sorted.sort((a,b) => b.amount - a.amount); break;
    case 'lowest':  sorted.sort((a,b) => a.amount - b.amount); break;
  }
  return sorted;
}
sortSelect.addEventListener('change', renderTransactionList);

// ─── Render Transaction List ──────────────────────────────────────────────────
function renderTransactionList() {
  const sorted = getSortedTransactions();

  if (sorted.length === 0) {
    transactionList.innerHTML = '';
    transactionList.appendChild(emptyState);
    emptyState.style.display = 'flex';
    return;
  }
  emptyState.style.display = 'none';
  transactionList.innerHTML = '';

  sorted.forEach(tx => {
    const item      = document.createElement('div');
    item.className  = 'transaction-item';
    item.dataset.id = tx.id;

    const isIncome  = tx.type === 'income';
    const emoji     = getCategoryEmoji(tx.category);
    const amtSign   = isIncome ? '+' : '-';
    const amtClass  = isIncome ? 'income' : 'expense';
    const iconClass = isIncome ? 'income-icon' : 'expense-icon';
    const cur       = tx.currency || 'IDR';

    // Untuk pengeluaran tampilkan detail qty × harga satuan
    const qtyDetail = (!isIncome && tx.qty && tx.unitPrice)
      ? `<span class="item-qty">${tx.qty} pcs &middot; ${formatMoney(tx.unitPrice, cur)}/satuan</span>`
      : '';

    item.innerHTML = `
      <div class="item-icon ${iconClass}" aria-hidden="true">${emoji}</div>
      <div class="item-info">
        <p class="item-name" title="${escapeHtml(tx.name)}">${escapeHtml(tx.name)}</p>
        <div class="item-meta">
          <span class="item-category">${escapeHtml(displayName(tx.category))}</span>
          ${qtyDetail}
          <span class="item-date">${formatDate(tx.date)}</span>
        </div>
      </div>
      <span class="item-amount ${amtClass}">${amtSign}${formatMoney(tx.amount, cur)}</span>
      <button class="delete-btn" data-id="${tx.id}"
        title="Hapus transaksi"
        aria-label="Hapus ${escapeHtml(tx.name)}">🗑️</button>
    `;
    transactionList.appendChild(item);
  });

  transactionList.querySelectorAll('.delete-btn').forEach(btn =>
    btn.addEventListener('click', () => deleteTransaction(btn.dataset.id))
  );
}

// ─── Render Balance ───────────────────────────────────────────────────────────
function renderBalance() {
  const incomeByC  = {};
  const expenseByC = {};

  transactions.forEach(t => {
    const c = t.currency || 'IDR';
    if (t.type === 'income') incomeByC[c]  = (incomeByC[c]  || 0) + t.amount;
    else                     expenseByC[c] = (expenseByC[c] || 0) + t.amount;
  });

  const allCurs = [...new Set([...Object.keys(incomeByC), ...Object.keys(expenseByC)])];

  if (allCurs.length === 0) {
    totalBalanceEl.textContent = formatMoney(0, 'IDR');
    totalIncomeEl.textContent  = formatMoney(0, 'IDR');
    totalExpenseEl.textContent = formatMoney(0, 'IDR');
    totalBalanceEl.classList.remove('positive', 'negative');
    return;
  }

  if (allCurs.length === 1) {
    const c   = allCurs[0];
    const inc = incomeByC[c]  || 0;
    const exp = expenseByC[c] || 0;
    const bal = inc - exp;
    totalBalanceEl.textContent = formatMoney(bal, c);
    totalIncomeEl.textContent  = formatMoney(inc, c);
    totalExpenseEl.textContent = formatMoney(exp, c);
    totalBalanceEl.classList.remove('positive', 'negative');
    if (bal > 0) totalBalanceEl.classList.add('positive');
    else if (bal < 0) totalBalanceEl.classList.add('negative');
  } else {
    totalBalanceEl.innerHTML = allCurs.map(c => {
      const bal = (incomeByC[c] || 0) - (expenseByC[c] || 0);
      return `<span class="${bal >= 0 ? 'positive' : 'negative'}" style="display:block;font-size:1.2rem">${formatMoney(bal, c)}</span>`;
    }).join('');
    totalIncomeEl.innerHTML  = allCurs.filter(c => incomeByC[c])
      .map(c => `<span style="display:block">${formatMoney(incomeByC[c], c)}</span>`).join('') || formatMoney(0,'IDR');
    totalExpenseEl.innerHTML = allCurs.filter(c => expenseByC[c])
      .map(c => `<span style="display:block">${formatMoney(expenseByC[c], c)}</span>`).join('') || formatMoney(0,'IDR');
    totalBalanceEl.classList.remove('positive','negative');
  }
}

// ─── Pie Chart ────────────────────────────────────────────────────────────────
function buildChartData() {
  const map = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    map[t.category] = (map[t.category] || 0) + t.amount;
  });
  const labels = Object.keys(map);
  const data   = Object.values(map);
  const colors = labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);
  return { labels, data, colors };
}

function updateChart() {
  const { labels, data, colors } = buildChartData();
  const isDark = htmlEl.getAttribute('data-theme') === 'dark';

  if (data.length === 0) {
    chartEmptyMsg.style.display = 'block';
    chartCanvas.style.display   = 'none';
    chartLegendEl.innerHTML     = '';
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    return;
  }

  chartEmptyMsg.style.display = 'none';
  chartCanvas.style.display   = 'block';

  const chartData = {
    labels,
    datasets: [{
      data,
      backgroundColor:  colors,
      borderColor:      isDark ? 'rgba(13,22,38,0.7)' : 'rgba(255,255,255,0.85)',
      borderWidth: 3, hoverBorderWidth: 4, hoverOffset: 8,
    }],
  };

  const chartOptions = {
    responsive: true, maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => {
            const total = ctx.dataset.data.reduce((a,b) => a+b, 0);
            const pct   = ((ctx.parsed / total) * 100).toFixed(1);
            return ` ${ctx.parsed.toLocaleString('id-ID')} (${pct}%)`;
          },
        },
        backgroundColor: isDark ? '#111e36' : '#fff',
        titleColor:  isDark ? '#ddeeff' : '#1a2a4a',
        bodyColor:   isDark ? '#90b8d8' : '#4a6080',
        borderColor: isDark ? 'rgba(91,155,213,0.2)' : 'rgba(91,155,213,0.3)',
        borderWidth: 1, padding: 10, cornerRadius: 10,
        displayColors: true, boxPadding: 4,
      },
    },
    animation: { animateRotate: true, duration: 600 },
  };

  if (chartInstance) {
    chartInstance.data    = chartData;
    chartInstance.options = chartOptions;
    chartInstance.update();
  } else {
    chartInstance = new Chart(chartCanvas, { type: 'doughnut', data: chartData, options: chartOptions });
  }

  chartLegendEl.innerHTML = labels.map((label, i) => {
    const total = data.reduce((a,b) => a+b, 0);
    const pct   = total > 0 ? ((data[i]/total)*100).toFixed(0) : 0;
    return `<div class="legend-item">
      <span class="legend-dot" style="background:${colors[i]}"></span>
      <span>${escapeHtml(displayName(label))} (${pct}%)</span>
    </div>`;
  }).join('');
}

// ─── Render All ───────────────────────────────────────────────────────────────
function renderAll() {
  renderBalance();
  renderTransactionList();
  updateChart();
  renderLimitWarning();
  renderMonthlySummary();
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  loadFromStorage();
  renderCategoryOptions();
  renderBudgetCatOptions();
  renderCatList();
  renderBudgetList();
  renderAll();
  setActiveTab('expense');
  initYearSelector();
  initSpendingLimit();

  // ── Cegah scroll mengubah nilai input number ──────────────────────────────
  document.querySelectorAll('input[type="number"]').forEach(el => {
    el.addEventListener('wheel', e => { e.preventDefault(); }, { passive: false });
    el.addEventListener('focus', () => {
      el.addEventListener('wheel', preventDefault, { passive: false });
    });
    el.addEventListener('blur', () => {
      el.removeEventListener('wheel', preventDefault);
    });
  });
}

function preventDefault(e) { e.preventDefault(); }

// ─── Year Selector (2000–4000) ─────────────────────────────────────────────
function initYearSelector() {
  const sel = document.getElementById('summaryYearSelect');
  if (!sel) return;
  const currentYear = new Date().getFullYear();
  for (let y = 2000; y <= 4000; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === currentYear) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', renderMonthlySummary);
}

// ─── Spending Limit ────────────────────────────────────────────────────────
let spendingLimit = null; // { amount, currency }
const LS_LIMIT    = 'budgetviz_spending_limit';

function initSpendingLimit() {
  const saved = localStorage.getItem(LS_LIMIT);
  if (saved) spendingLimit = JSON.parse(saved);

  const setBtn   = document.getElementById('setLimitBtn');
  const clearBtn = document.getElementById('clearLimitBtn');
  const input    = document.getElementById('spendingLimitInput');
  const curSel   = document.getElementById('limitCurrencySelect');

  if (!setBtn) return;

  // ── Blokir scroll pada input limit juga ─────────────────────────────────
  if (input) {
    input.addEventListener('wheel', e => e.preventDefault(), { passive: false });
  }

  if (spendingLimit) {
    input.value    = spendingLimit.amount;
    curSel.value   = spendingLimit.currency;
    clearBtn.style.display = 'inline-flex';
  }

  setBtn.addEventListener('click', () => {
    const amt = parseFloat(input.value);
    const cur = curSel.value;
    if (!amt || amt <= 0) { showToast('Masukkan nominal batas yang valid.'); return; }
    spendingLimit = { amount: amt, currency: cur };
    localStorage.setItem(LS_LIMIT, JSON.stringify(spendingLimit));
    clearBtn.style.display = 'inline-flex';
    renderLimitWarning();
    showToast(`Batas pengeluaran: ${formatMoney(amt, cur)} ✅`);
  });

  clearBtn.addEventListener('click', () => {
    spendingLimit = null;
    localStorage.removeItem(LS_LIMIT);
    input.value = '';
    clearBtn.style.display = 'none';
    renderLimitWarning();
    showToast('Batas pengeluaran dihapus.');
  });

  renderLimitWarning();
}

function renderLimitWarning() {
  const banner = document.getElementById('limitWarningBanner');
  if (!banner) return;

  if (!spendingLimit) {
    banner.style.display = 'none';
    return;
  }

  const { amount: limit, currency } = spendingLimit;
  const now   = new Date();
  const month = now.getMonth();
  const year  = now.getFullYear();

  const thisMonthExpense = transactions
    .filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense'
        && (t.currency || 'IDR') === currency
        && d.getMonth() === month
        && d.getFullYear() === year;
    })
    .reduce((acc, t) => acc + t.amount, 0);

  const pct    = (thisMonthExpense / limit) * 100;
  const sisa   = Math.max(limit - thisMonthExpense, 0);

  let cls = 'warn-ok', icon = '✅', msg = '';
  if (pct >= 100) {
    cls  = 'warn-danger';
    icon = '🚨';
    msg  = `Pengeluaran bulan ini <strong>${formatMoney(thisMonthExpense, currency)}</strong> telah melebihi batas <strong>${formatMoney(limit, currency)}</strong> (${pct.toFixed(1)}%)!`;
  } else if (pct >= 80) {
    cls  = 'warn-warning';
    icon = '⚠️';
    msg  = `Pengeluaran bulan ini <strong>${formatMoney(thisMonthExpense, currency)}</strong> sudah ${pct.toFixed(1)}% dari batas. Sisa: <strong>${formatMoney(sisa, currency)}</strong>.`;
  } else {
    msg  = `Pengeluaran bulan ini: <strong>${formatMoney(thisMonthExpense, currency)}</strong> dari <strong>${formatMoney(limit, currency)}</strong> (${pct.toFixed(1)}%). Aman!`;
  }

  banner.style.display = 'flex';
  banner.className     = `limit-warning-banner ${cls}`;
  banner.innerHTML     = `<span>${icon}</span><span>${msg}</span>`;
}

// ─── Monthly Summary ────────────────────────────────────────────────────────
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

function renderMonthlySummary() {
  const content    = document.getElementById('monthlySummaryContent');
  const emptyEl    = document.getElementById('monthlyEmpty');
  const yearSelect = document.getElementById('summaryYearSelect');
  if (!content || !yearSelect) return;

  const selectedYear = parseInt(yearSelect.value);

  const expenseOnly = transactions.filter(t => {
    return t.type === 'expense' && new Date(t.date).getFullYear() === selectedYear;
  });

  if (expenseOnly.length === 0) {
    content.innerHTML = '';
    content.appendChild(emptyEl);
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  // Aggregate per bulan → per kategori
  const monthMap = {}; // { 0: { Makanan: 50000, ... }, ... }
  expenseOnly.forEach(t => {
    const m = new Date(t.date).getMonth();
    if (!monthMap[m]) monthMap[m] = {};
    monthMap[m][t.category] = (monthMap[m][t.category] || 0) + t.amount;
  });

  // Hitung total per bulan untuk bar proportions
  const grid = document.createElement('div');
  grid.className = 'monthly-grid';

  Object.keys(monthMap)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach(m => {
      const catData = monthMap[m];
      const total   = Object.values(catData).reduce((a, b) => a + b, 0);

      // Cek apakah bulan ini melebihi spending limit
      const isOverLimit = spendingLimit
        && expenseOnly
          .filter(t => new Date(t.date).getMonth() === m && (t.currency||'IDR') === spendingLimit.currency)
          .reduce((a, t) => a + t.amount, 0) >= spendingLimit.amount;

      const card = document.createElement('div');
      card.className = 'month-card';

      // Breakdown bar per kategori (top 4)
      const sortedCats = Object.entries(catData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

      const barsHtml = sortedCats.map(([cat, amt], i) => {
        const pct   = total > 0 ? (amt / total) * 100 : 0;
        const color = CHART_COLORS[i % CHART_COLORS.length];
        return `
          <div class="month-cat-row">
            <span style="font-size:0.75rem;flex-shrink:0">${getCategoryEmoji(cat)}</span>
            <div class="month-cat-bar-wrap">
              <div class="month-cat-bar-fill" style="width:${pct}%;background:${color}"></div>
            </div>
            <span class="month-cat-amount">${formatMoney(amt, 'IDR')}</span>
          </div>`;
      }).join('');

      const limitBadge = isOverLimit
        ? `<span class="month-limit-badge over">⚠️ Melebihi batas</span>`
        : '';

      card.innerHTML = `
        <div class="month-card-header">
          <span class="month-card-name">${MONTH_NAMES[m]} ${selectedYear}</span>
          <span class="month-card-total">${formatMoney(total, 'IDR')}${limitBadge}</span>
        </div>
        <div class="month-cat-list">${barsHtml}</div>
      `;

      grid.appendChild(card);
    });

  content.innerHTML = '';
  content.appendChild(grid);
}

document.addEventListener('DOMContentLoaded', init);
