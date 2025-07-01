function generateId() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

const incomeForm = document.getElementById('incomeForm');
const expenseForm = document.getElementById('expenseForm');
const incomeList = document.getElementById('incomeList');
const expenseList = document.getElementById('expenseList');
const incomeTotalEl = document.getElementById('incomeTotal');
const expenseTotalEl = document.getElementById('expenseTotal');
const balanceEl = document.getElementById('balance');
const balancePercentEl = document.getElementById('balancePercent');
const currentMonthEl = document.getElementById('currentMonth');

const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');

const incomeRecurringCheckbox = document.getElementById('incomeRecurring');
const incomeRepeatUntilInput = document.getElementById('incomeRepeatUntil');
const expenseRecurringCheckbox = document.getElementById('expenseRecurring');
const expenseRepeatUntilInput = document.getElementById('expenseRepeatUntil');

let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

function formatMonthYear(month, year) {
  return new Date(year, month).toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
}

function formatDateDMY(dateStr) {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function isPastOrToday(dateStr, today) {
  const itemDate = new Date(dateStr);
  itemDate.setHours(0,0,0,0);
  return itemDate <= today;
}

function generateRecurringItem(item) {
  const startDate = new Date(item.originalDate);
  const repeatUntilStr = item.repeatUntil;

  const viewMonth = new Date(currentYear, currentMonth);

  if (viewMonth < new Date(startDate.getFullYear(), startDate.getMonth())) return null;

  if (repeatUntilStr) {
    const [repeatYear, repeatMonth] = repeatUntilStr.split('-').map(Number);
    const repeatUntilDate = new Date(repeatYear, repeatMonth, 0);
    if (viewMonth > new Date(repeatYear, repeatMonth - 1)) return null;
  };

  let day = startDate.getDate();

  const lastDayOfViewMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  if (day > lastDayOfViewMonth) {
    day = lastDayOfViewMonth;
  }

  const year = currentYear;
  const month = currentMonth + 1;
  const dayStr = String(day).padStart(2, '0');
  const monthStr = String(month).padStart(2, '0');
  const dateStr = `${year}-${monthStr}-${dayStr}`;

  return {...item, date: dateStr};
}

let data = {
  incomes: [],
  expenses: []
};

function loadData(key) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function stopRecurring(type, id) {
  const arr = type === 'income' ? data.incomes : data.expenses;
  const dtype = type === 'income' ? 'incomes' : 'expenses';
  const item = arr.find(i => i.id === id);
  if (item) {
    const originalDate = new Date(item.date);
    const originalDay = originalDate.getDate();

    const maxDay = new Date(currentYear, currentMonth + 1, 0).getDate();

    const day = Math.min(originalDay, maxDay);

    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    item.repeatUntil = `${currentYear}-${monthStr}-${dayStr}`;

    saveData(dtype, arr);
    render();
  }
}

function removeById(arr, id) {
  const index = arr.findIndex(item => item.id === id);
  if (index !== -1) arr.splice(index, 1);
}

function deleteItem(type, id) {
  const arr = type === 'income' ? data.incomes : data.expenses;
  const dtype = type === 'income' ? 'incomes' : 'expenses';
  removeById(arr, id);
  saveData(dtype, arr);
  render();
}

let summaryChart;

function renderSummaryChart(incomes, expenses) {
  const incomeSum = incomes.reduce((sum, item) => sum + item.amount, 0);
  const expenseSum = expenses.reduce((sum, item) => sum + item.amount, 0);

  const ctx = document.getElementById('summaryChart').getContext('2d');

  if (summaryChart) {
    summaryChart.destroy();
  }

  summaryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Доходы', 'Расходы'],
      datasets: [{
        data: [incomeSum, expenseSum],
        backgroundColor: [
          '#9ecba1',
          '#e9747a'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: '#333'
          }
        }
      }
    }
  });
}

function render() {
  currentMonthEl.textContent = formatMonthYear(currentMonth, currentYear);
  const ym = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  let incomesToShow = [];
  data.incomes.forEach(item => {
    if (item.recurring) {
      const gen = generateRecurringItem(item);
      if (gen) incomesToShow.push(gen);
    } else if (item.date.startsWith(ym)) {
      incomesToShow.push(item);
    }
  });

  incomesToShow.sort((a, b) => new Date(a.date) - new Date(b.date));

  let expensesToShow = [];
  data.expenses.forEach(item => {
    if (item.recurring) {
      const gen = generateRecurringItem(item);
      if (gen) expensesToShow.push(gen);
    } else if (item.date.startsWith(ym)) {
      expensesToShow.push(item);
    }
  });

  expensesToShow.sort((a, b) => new Date(a.date) - new Date(b.date));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  incomeList.innerHTML = '';
  incomesToShow.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${formatDateDMY(item.date)} — ${item.description || '(без описания)'} — ${item.amount.toFixed(2)} ₽</span>
      <span>
        ${item.recurring ? `<span class="stop-recurring-btn" title="Остановить повторение" data-type="income" data-id="${item.id}">⏹</span>` : ''}
        <span class="delete-btn" title="Удалить" data-type="income" data-id="${item.id}">❌</span>
      </span>
    `;
    if (isPastOrToday(item.date, today)) {
      li.classList.add('past-date');
    }
    incomeList.appendChild(li);
  });

  expenseList.innerHTML = '';
  expensesToShow.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${formatDateDMY(item.date)} — ${item.description || '(без описания)'} — ${item.amount.toFixed(2)} ₽</span>
      <span>
        ${item.recurring ? `<span class="stop-recurring-btn" title="Остановить повторение" data-type="expense" data-id="${item.id}">⏹</span>` : ''}
        <span class="delete-btn" title="Удалить" data-type="expense" data-id="${item.id}">❌</span>
      </span>
    `;
    if (isPastOrToday(item.date, today)) {
      li.classList.add('past-date');
    }
    expenseList.appendChild(li);
  });

  const filteredIncomes = incomesToShow.filter(i => {
    const d = new Date(i.date);
    d.setHours(0, 0, 0, 0);
    return d <= today;
  });

  const filteredExpenses = expensesToShow.filter(i => {
    const d = new Date(i.date);
    d.setHours(0, 0, 0, 0);
    return d <= today;
  });

  const incomeSum = filteredIncomes.reduce((sum, i) => sum + i.amount, 0);
  const expenseSum = filteredExpenses.reduce((sum, i) => sum + i.amount, 0);
  const balance = incomeSum - expenseSum;
  const percent = incomeSum > 0 ? ((balance / incomeSum) * 100).toFixed(2) : 0;

  incomeTotalEl.textContent = incomeSum.toFixed(2) + ' ₽';
  expenseTotalEl.textContent = expenseSum.toFixed(2) + ' ₽';
  balanceEl.textContent = balance.toFixed(2) + ' ₽';
  balanceEl.className = balance < 0 ? 'negative-balance' : '';
  balancePercentEl.textContent = (balance >= 0 ? '+' : '') + percent + '%';
  balancePercentEl.className = balance < 0 ? 'negative-balance' : '';

  renderSummaryChart(filteredIncomes, filteredExpenses);
}

prevMonthBtn.onclick = () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  render();
};
nextMonthBtn.onclick = () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  render();
};

incomeRecurringCheckbox.onchange = () => {
  incomeRepeatUntilInput.style.display = incomeRecurringCheckbox.checked ? 'inline-block' : 'none';
  if (!incomeRecurringCheckbox.checked) incomeRepeatUntilInput.value = '';
};
expenseRecurringCheckbox.onchange = () => {
  expenseRepeatUntilInput.style.display = expenseRecurringCheckbox.checked ? 'inline-block' : 'none';
  if (!expenseRecurringCheckbox.checked) expenseRepeatUntilInput.value = '';
};

incomeForm.onsubmit = e => {
  e.preventDefault();
  const date = incomeForm.incomeDate.value;
  const amount = parseFloat(incomeForm.incomeAmount.value);
  if (!date || isNaN(amount) || amount <= 0) return alert('Проверьте дату и сумму дохода');
  const description = incomeForm.incomeDescription.value.trim();
  const recurring = incomeRecurringCheckbox.checked;
  const repeatUntil = recurring && incomeRepeatUntilInput.value ? incomeRepeatUntilInput.value : null;

  data.incomes.push({
    id: generateId(),
    date,
    originalDate: date,
    amount,
    description,
    recurring,
    repeatUntil
  });
  saveData('incomes', data.incomes);
  render();
  incomeForm.reset();
  incomeRepeatUntilInput.style.display = 'none';
};

expenseForm.onsubmit = e => {
  e.preventDefault();
  const date = expenseForm.expenseDate.value;
  const amount = parseFloat(expenseForm.expenseAmount.value);
  if (!date || isNaN(amount) || amount <= 0) return alert('Проверьте дату и сумму расхода');
  const description = expenseForm.expenseDescription.value.trim();
  const recurring = expenseRecurringCheckbox.checked;
  const repeatUntil = recurring && expenseRepeatUntilInput.value ? expenseRepeatUntilInput.value : null;

  data.expenses.push({
    id: generateId(),
    date,
    originalDate: date,
    amount,
    description,
    recurring,
    repeatUntil
  });
  saveData('expenses', data.expenses);
  render();
  expenseForm.reset();
  expenseRepeatUntilInput.style.display = 'none';
};

document.body.addEventListener('click', e => {
  if (e.target.classList.contains('delete-btn')) {
    const type = e.target.getAttribute('data-type');
    const id = e.target.getAttribute('data-id');
    if (confirm('Удалить запись?')) {
      deleteItem(type, id);
    }
  }
  if (e.target.classList.contains('stop-recurring-btn')) {
    const type = e.target.getAttribute('data-type');
    const id = e.target.getAttribute('data-id');
    if (confirm('Остановить повторение для этой записи?')) {
      stopRecurring(type, id);
    }
  }
});

// Экспорт
document.getElementById('exportBtn').addEventListener('click', () => {
  const data = {
    incomes: loadData('incomes'),
    expenses: loadData('expenses')
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'finance_data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Импорт
const importInput = document.getElementById('importFileInput');

document.getElementById('importBtn').addEventListener('click', () => {
  importInput.click();
});

importInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.incomes || !data.expenses) throw new Error('Неверный формат файла');

      saveData('incomes', data.incomes);
      saveData('expenses', data.expenses);
      render();
      alert('Данные успешно импортированы!');
    } catch (err) {
      alert('Ошибка при импорте: ' + err.message);
    }
  };
  reader.readAsText(file);
});

data.incomes = loadData('incomes');
data.expenses = loadData('expenses');
render();