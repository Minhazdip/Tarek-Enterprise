// Initialize
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('sale-date').value = new Date().toISOString().split('T')[0];
    loadSalesHistory();
    loadStockList('raw');
    loadStockList('furniture');
    loadExpenseHistory();
    populateProductDropdowns();
    document.getElementById('sales-form').addEventListener('submit', saveSales);
    document.getElementById('raw-stock-form').addEventListener('submit', function(e) { addStock(e, 'raw'); });
    document.getElementById('furniture-stock-form').addEventListener('submit', function(e) { addStock(e, 'furniture'); });
    document.getElementById('expense-form').addEventListener('submit', addExpense);
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('item-price') || e.target.classList.contains('item-quantity')) {
            calculateItemTotal(e.target.closest('.item-row'));
            calculateDailyTotal();
        }
    });
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('item-name')) updateProductDetails(e.target);
    });
});

function showTab(tabName, btn) {
    document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.getElementById(tabName).classList.add('active');
    if (btn) btn.classList.add('active');
    if (tabName === 'sales-history') loadSalesHistory();
    else if (tabName === 'add-stock') { loadStockList('raw'); loadStockList('furniture'); }
    else if (tabName === 'sales-entry') populateProductDropdowns();
    else if (tabName === 'daily-expenses') loadExpenseHistory();
}

function showCategory(categoryName, btn) {
    document.querySelectorAll('.category-section').forEach(function(s) { s.classList.remove('active'); });
    document.querySelectorAll('.category-btn').forEach(function(b) { b.classList.remove('active'); });
    var target = document.getElementById(categoryName);
    if (target) target.classList.add('active');
    if (btn) btn.classList.add('active');
    loadStockList(categoryName === 'raw-materials' ? 'raw' : 'furniture');
}

function addItem() {
    var container = document.getElementById('items-container');
    var row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = '<select class="item-name" required><option value="">Select Item</option></select>' +
        '<input type="number" placeholder="Price" class="item-price" step="0.01" min="0" required readonly>' +
        '<input type="number" placeholder="Quantity" class="item-quantity" step="0.1" min="0.1" required>' +
        '<span class="stock-available">Stock: 0</span>' +
        '<span class="item-total">0.00</span>' +
        '<input type="text" placeholder="Customer Name" class="customer-name" required>' +
        '<input type="number" placeholder="Due Payment" class="due-payment" step="0.01" min="0">' +
        '<button type="button" class="remove-item" onclick="removeItem(this)">x</button>';
    container.appendChild(row);
    populateProductDropdown(row.querySelector('.item-name'));
}

function removeItem(button) {
    button.closest('.item-row').remove();
    calculateDailyTotal();
}

function calculateItemTotal(row) {
    var price = parseFloat(row.querySelector('.item-price').value) || 0;
    var qty = parseFloat(row.querySelector('.item-quantity').value) || 0;
    row.querySelector('.item-total').textContent = (price * qty).toFixed(2);
}

function calculateDailyTotal() {
    var total = 0;
    document.querySelectorAll('.item-total').forEach(function(t) { total += parseFloat(t.textContent) || 0; });
    document.getElementById('daily-total').textContent = total.toFixed(2);
}

function populateProductDropdowns() {
    document.querySelectorAll('.item-name').forEach(function(s) { populateProductDropdown(s); });
}

function populateProductDropdown(select) {
    var current = select.value;
    select.innerHTML = '<option value="">Select Item</option>';
    ['raw', 'furniture'].forEach(function(cat) {
        var data = JSON.parse(localStorage.getItem('tarekStockData_' + cat)) || [];
        data.forEach(function(item) {
            if (item.quantity > 0) {
                var opt = document.createElement('option');
                opt.value = item.name + '|' + cat;
                opt.textContent = item.name + ' (' + (cat === 'raw' ? 'Raw' : 'Furniture') + ') - ' + item.quantity + ' ' + (item.unit || (cat === 'raw' ? 'KG' : 'Pieces'));
                select.appendChild(opt);
            }
        });
    });
    if (current) select.value = current;
}

function updateProductDetails(select) {
    var row = select.closest('.item-row');
    var val = select.value;
    var stockEl = row.querySelector('.stock-available');
    var priceInput = row.querySelector('.item-price');
    if (!val) { priceInput.value = ''; stockEl.textContent = 'Stock: 0'; stockEl.classList.remove('low-stock'); return; }
    var parts = val.split('|');
    var productName = parts[0];
    var category = parts[1];
    var data = JSON.parse(localStorage.getItem('tarekStockData_' + category)) || [];
    var stockItem = data.find(function(i) { return i.name === productName; });
    if (stockItem) {
        priceInput.value = stockItem.sellingPrice;
        var unit = stockItem.unit || (category === 'raw' ? 'KG' : 'Pieces');
        stockEl.textContent = 'Stock: ' + stockItem.quantity + ' ' + unit;
        stockEl.classList.toggle('low-stock', stockItem.quantity <= 5);
        calculateItemTotal(row);
        calculateDailyTotal();
    }
}

function saveSales(event) {
    event.preventDefault();
    var date = document.getElementById('sale-date').value;
    var itemRows = document.querySelectorAll('.item-row');
    var items = [];
    var isValid = true;
    var stockError = false;

    itemRows.forEach(function(row) {
        var val = row.querySelector('.item-name').value.trim();
        var price = parseFloat(row.querySelector('.item-price').value);
        var qty = parseFloat(row.querySelector('.item-quantity').value);
        var customer = row.querySelector('.customer-name').value.trim();
        var due = parseFloat(row.querySelector('.due-payment').value) || 0;

        if (val && price > 0 && qty > 0 && customer) {
            var parts = val.split('|');
            var productName = parts[0];
            var category = parts[1];
            var data = JSON.parse(localStorage.getItem('tarekStockData_' + category)) || [];
            var stockItem = data.find(function(i) { return i.name === productName; });

            if (!stockItem) { alert('Product "' + productName + '" not found in stock!'); stockError = true; return; }

            var unit = stockItem.unit || (category === 'raw' ? 'KG' : 'Pieces');
            if (stockItem.quantity < qty) {
                alert('Insufficient stock for "' + productName + '". Available: ' + stockItem.quantity + ' ' + unit + ', Requested: ' + qty + ' ' + unit);
                stockError = true;
                return;
            }

            var buyingPrice = parseFloat(stockItem.buyingPrice) || 0;
            var profit = (price - buyingPrice) * qty;
            items.push({ name: productName, category: category, price: price, buyingPrice: buyingPrice, quantity: qty, unit: unit, customerName: customer, duePayment: due, total: price * qty, profit: profit });
        } else if (val || price || qty || customer) {
            isValid = false;
        }
    });

    if (stockError) return;
    if (!isValid || items.length === 0) { alert('Please fill in all item details correctly or remove empty rows.'); return; }

    updateStockAfterSale(items);

    var dailyTotal = items.reduce(function(s, i) { return s + i.total; }, 0);
    var salesData = JSON.parse(localStorage.getItem('tarekSalesData')) || [];
    var existingIndex = salesData.findIndex(function(r) { return r.date === date; });

    if (existingIndex !== -1) {
        salesData[existingIndex].items = salesData[existingIndex].items.concat(items);
        salesData[existingIndex].dailyTotal += dailyTotal;
    } else {
        salesData.push({ id: Date.now().toString(), date: date, items: items, dailyTotal: dailyTotal, createdAt: new Date().toISOString() });
    }

    salesData.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
    localStorage.setItem('tarekSalesData', JSON.stringify(salesData));
    alert('Sales record saved successfully!');
    clearForm();
    loadSalesHistory();
    loadStockList('raw');
    loadStockList('furniture');
    populateProductDropdowns();
}

function updateStockAfterSale(items) {
    items.forEach(function(item) {
        var key = 'tarekStockData_' + item.category;
        var data = JSON.parse(localStorage.getItem(key)) || [];
        var s = data.find(function(d) { return d.name === item.name; });
        if (s) { s.quantity = Math.max(0, s.quantity - item.quantity); s.updatedAt = new Date().toISOString(); }
        localStorage.setItem(key, JSON.stringify(data));
    });
}

function clearForm() {
    document.getElementById('sales-form').reset();
    document.getElementById('sale-date').value = new Date().toISOString().split('T')[0];
    var container = document.getElementById('items-container');
    container.innerHTML = '<div class="item-row">' +
        '<select class="item-name" required><option value="">Select Item</option></select>' +
        '<input type="number" placeholder="Price" class="item-price" step="0.01" min="0" required readonly>' +
        '<input type="number" placeholder="Quantity" class="item-quantity" step="0.1" min="0.1" required>' +
        '<span class="stock-available">Stock: 0</span>' +
        '<span class="item-total">0.00</span>' +
        '<input type="text" placeholder="Customer Name" class="customer-name" required>' +
        '<input type="number" placeholder="Due Payment" class="due-payment" step="0.01" min="0">' +
        '<button type="button" class="remove-item" onclick="removeItem(this)">x</button>' +
        '</div>';
    populateProductDropdown(container.querySelector('.item-name'));
    document.getElementById('daily-total').textContent = '0.00';
}

function loadSalesHistory() {
    displaySalesRecords(JSON.parse(localStorage.getItem('tarekSalesData')) || []);
}

function getItemProfit(item) {
    if (typeof item.profit === 'number') return item.profit;
    return (item.price - (parseFloat(item.buyingPrice) || 0)) * item.quantity;
}

function displaySalesRecords(records) {
    var salesList = document.getElementById('sales-list');
    var totalRecordsEl = document.getElementById('total-records');
    var totalAmountEl = document.getElementById('total-amount');
    var totalProfitEl = document.getElementById('total-profit');

    if (records.length === 0) {
        salesList.innerHTML = '<div class="no-records">No sales records found.</div>';
        totalRecordsEl.textContent = '0';
        totalAmountEl.textContent = '0.00';
        totalProfitEl.textContent = '0.00';
        return;
    }

    var grandRevenue = 0, grandProfit = 0;
    records.forEach(function(r) {
        grandRevenue += r.dailyTotal;
        r.items.forEach(function(i) { grandProfit += getItemProfit(i); });
    });

    totalRecordsEl.textContent = records.length;
    totalAmountEl.textContent = grandRevenue.toFixed(2);
    totalProfitEl.textContent = grandProfit.toFixed(2);

    salesList.innerHTML = records.map(function(record) {
        var recordProfit = 0;
        record.items.forEach(function(i) { recordProfit += getItemProfit(i); });
        var cost = record.dailyTotal - recordProfit;

        var itemsHtml = record.items.map(function(item) {
            var unit = item.unit || (item.category === 'raw' ? 'KG' : 'Pieces');
            var itemProfit = getItemProfit(item);
            var dueHtml = item.duePayment > 0 ? ' <span class="item-due">(Due: $' + item.duePayment.toFixed(2) + ')</span>' : '';
            return '<div class="item-detail">' +
                '<span>' + item.name + ' — ' + item.customerName + '</span>' +
                '<span>' + item.quantity + ' ' + unit + ' x $' + item.price.toFixed(2) +
                ' = $' + item.total.toFixed(2) +
                ' <span class="item-profit">+$' + itemProfit.toFixed(2) + ' profit</span>' + dueHtml + '</span>' +
                '</div>';
        }).join('');

        return '<div class="sales-record">' +
            '<div class="record-header">' +
                '<h4>Date: ' + formatDate(record.date) + '</h4>' +
                '<span class="daily-profit-badge">Daily Profit: $' + recordProfit.toFixed(2) + '</span>' +
            '</div>' +
            '<div class="record-totals">' +
                '<span class="record-total">Revenue: $' + record.dailyTotal.toFixed(2) + '</span>' +
                '<span class="record-cost">Cost: $' + cost.toFixed(2) + '</span>' +
                '<span class="record-profit">Net Profit: $' + recordProfit.toFixed(2) + '</span>' +
            '</div>' +
            '<div class="items-list">' + itemsHtml + '</div>' +
            '</div>';
    }).join('');
}

function searchSales() {
    var date = document.getElementById('search-date').value;
    var month = document.getElementById('search-month').value;
    var data = JSON.parse(localStorage.getItem('tarekSalesData')) || [];
    if (date) data = data.filter(function(r) { return r.date === date; });
    else if (month) data = data.filter(function(r) { return r.date.startsWith(month); });
    displaySalesRecords(data);
}

function showAllSales() {
    document.getElementById('search-date').value = '';
    document.getElementById('search-month').value = '';
    loadSalesHistory();
}

function formatDate(str) {
    return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function exportToExcel() {
    var date = document.getElementById('search-date').value;
    var month = document.getElementById('search-month').value;
    var data = JSON.parse(localStorage.getItem('tarekSalesData')) || [];
    if (date) data = data.filter(function(r) { return r.date === date; });
    else if (month) data = data.filter(function(r) { return r.date.startsWith(month); });
    if (data.length === 0) { alert('No data to export.'); return; }
    data.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
    var wb = XLSX.utils.book_new();
    createSalesSheet(wb, data);
    createSummarySheet(wb, data);
    var filename = 'Tarek_Enterprise_Sales_Report';
    if (date) filename += '_' + date;
    else if (month) filename += '_' + month.replace('-', '_');
    else filename += '_All_Records';
    filename += '_' + new Date().toISOString().split('T')[0] + '.xlsx';
    XLSX.writeFile(wb, filename);
}

function createSalesSheet(wb, data) {
    var rows = [['TAREK ENTERPRISE - SALES REPORT'], ['Generated: ' + new Date().toLocaleDateString()], [],
        ['Date','Item','Category','Customer','Selling Price','Buying Price','Qty','Unit','Revenue','Profit','Due','Daily Total']];
    data.forEach(function(record, ri) {
        if (ri > 0) rows.push([]);
        record.items.forEach(function(item, ii) {
            var unit = item.unit || (item.category === 'raw' ? 'KG' : 'Pieces');
            var profit = getItemProfit(item);
            rows.push([
                ii === 0 ? formatDate(record.date) : '',
                item.name,
                item.category === 'raw' ? 'Raw Materials' : 'Furniture',
                item.customerName || 'N/A',
                '$' + item.price.toFixed(2),
                '$' + (item.buyingPrice || 0).toFixed(2),
                item.quantity, unit,
                '$' + item.total.toFixed(2),
                '$' + profit.toFixed(2),
                item.duePayment > 0 ? '$' + item.duePayment.toFixed(2) : '$0.00',
                ii === 0 ? '$' + record.dailyTotal.toFixed(2) : ''
            ]);
        });
    });
    var ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [15,20,15,20,14,14,8,8,14,14,14,14].map(function(w) { return { width: w }; });
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Details');
}

function createSummarySheet(wb, data) {
    var rows = [['TAREK ENTERPRISE - SUMMARY'], ['Generated: ' + new Date().toLocaleDateString()], [],
        ['Date','Items Sold','Raw (KG)','Furniture (Pcs)','Revenue','Cost','Profit','Due','Net Received']];
    var totals = { revenue: 0, profit: 0, due: 0, raw: 0, fur: 0, items: 0 };
    data.forEach(function(record) {
        var rawQty = 0, furQty = 0, dailyDue = 0, dailyProfit = 0;
        record.items.forEach(function(item) {
            if (item.category === 'raw') rawQty += item.quantity; else furQty += item.quantity;
            dailyDue += item.duePayment || 0;
            dailyProfit += getItemProfit(item);
        });
        var cost = record.dailyTotal - dailyProfit;
        rows.push([formatDate(record.date), record.items.length, rawQty + ' KG', furQty + ' Pcs',
            '$' + record.dailyTotal.toFixed(2), '$' + cost.toFixed(2), '$' + dailyProfit.toFixed(2),
            '$' + dailyDue.toFixed(2), '$' + (record.dailyTotal - dailyDue).toFixed(2)]);
        totals.revenue += record.dailyTotal; totals.profit += dailyProfit; totals.due += dailyDue;
        totals.raw += rawQty; totals.fur += furQty; totals.items += record.items.length;
    });
    rows.push([], ['TOTALS', totals.items, totals.raw + ' KG', totals.fur + ' Pcs',
        '$' + totals.revenue.toFixed(2), '$' + (totals.revenue - totals.profit).toFixed(2),
        '$' + totals.profit.toFixed(2), '$' + totals.due.toFixed(2), '$' + (totals.revenue - totals.due).toFixed(2)]);
    var ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [15,10,12,14,14,14,14,14,14].map(function(w) { return { width: w }; });
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');
}

// Stock Management
function addStock(event, category) {
    event.preventDefault();
    var prefix = category === 'raw' ? 'raw' : 'furniture';
    var productName = document.getElementById(prefix + '-product-name').value.trim();
    var buyingPrice = parseFloat(document.getElementById(prefix + '-buying-price').value);
    var sellingPrice = parseFloat(document.getElementById(prefix + '-selling-price').value);
    var quantity = parseFloat(document.getElementById(prefix + '-stock-quantity').value);
    if (!productName || buyingPrice <= 0 || sellingPrice <= 0 || quantity <= 0) { alert('Please fill in all required fields with valid values.'); return; }
    if (sellingPrice <= buyingPrice) { if (!confirm('Selling price is not higher than buying price. Continue anyway?')) return; }
    var key = 'tarekStockData_' + category;
    var data = JSON.parse(localStorage.getItem(key)) || [];
    var idx = data.findIndex(function(i) { return i.name.toLowerCase() === productName.toLowerCase(); });
    if (idx !== -1) {
        if (confirm('"' + productName + '" already exists. Add to existing stock?')) {
            data[idx].quantity += quantity;
            data[idx].buyingPrice = buyingPrice;
            data[idx].sellingPrice = sellingPrice;
            data[idx].updatedAt = new Date().toISOString();
        } else return;
    } else {
        data.push({ id: Date.now().toString(), name: productName, buyingPrice: buyingPrice, sellingPrice: sellingPrice,
            quantity: quantity, category: category, unit: category === 'raw' ? 'KG' : 'Pieces',
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    localStorage.setItem(key, JSON.stringify(data));
    alert('Stock added successfully!');
    document.getElementById(prefix + '-stock-form').reset();
    loadStockList(category);
    populateProductDropdowns();
}

function loadStockList(category) {
    displayStockItems(JSON.parse(localStorage.getItem('tarekStockData_' + category)) || [], category);
}

function displayStockItems(items, category) {
    var prefix = category === 'raw' ? 'raw' : 'furniture';
    var list = document.getElementById(prefix + '-stock-list');
    document.getElementById(prefix + '-total-products').textContent = items.length;
    document.getElementById(prefix + '-total-stock-value').textContent = items.reduce(function(s, i) { return s + i.buyingPrice * i.quantity; }, 0).toFixed(2);
    document.getElementById(prefix + '-low-stock-count').textContent = items.filter(function(i) { return i.quantity <= 5; }).length;
    if (items.length === 0) { list.innerHTML = '<div class="no-stock">No stock items found.</div>'; return; }
    list.innerHTML = items.map(function(item) {
        var cls = item.quantity === 0 ? 'out-of-stock' : item.quantity <= 5 ? 'low-stock' : '';
        var unit = item.unit || (item.category === 'raw' ? 'KG' : 'Pieces');
        return '<div class="stock-item ' + cls + '">' +
            '<div class="stock-header"><span class="stock-name">' + item.name + '</span>' +
            '<span class="stock-quantity ' + cls + '">Stock: ' + item.quantity + ' ' + unit + '</span></div>' +
            '<div class="stock-details">' +
            '<div class="stock-detail-item"><span>Buying Price:</span><span>$' + item.buyingPrice.toFixed(2) + '</span></div>' +
            '<div class="stock-detail-item"><span>Selling Price:</span><span>$' + item.sellingPrice.toFixed(2) + '</span></div>' +
            '<div class="stock-detail-item"><span>Profit/unit:</span><span>$' + (item.sellingPrice - item.buyingPrice).toFixed(2) + '</span></div>' +
            '<div class="stock-detail-item"><span>Total Value:</span><span>$' + (item.buyingPrice * item.quantity).toFixed(2) + '</span></div>' +
            '</div>' +
            '<div class="stock-actions">' +
            '<button class="edit-stock" onclick="editStock(\'' + item.id + '\',\'' + category + '\')">Edit</button>' +
            '<button class="delete-stock" onclick="deleteStock(\'' + item.id + '\',\'' + category + '\')">Delete</button>' +
            '</div></div>';
    }).join('');
}

function searchStock(category) {
    var prefix = category === 'raw' ? 'raw' : 'furniture';
    var term = document.getElementById(prefix + '-stock-search').value.toLowerCase();
    var data = JSON.parse(localStorage.getItem('tarekStockData_' + category)) || [];
    displayStockItems(data.filter(function(i) { return i.name.toLowerCase().includes(term); }), category);
}

function showAllStock(category) {
    document.getElementById((category === 'raw' ? 'raw' : 'furniture') + '-stock-search').value = '';
    loadStockList(category);
}

function editStock(id, category) {
    var key = 'tarekStockData_' + category;
    var data = JSON.parse(localStorage.getItem(key)) || [];
    var item = data.find(function(i) { return i.id === id; });
    if (!item) return;
    var unit = item.unit || (category === 'raw' ? 'KG' : 'Pieces');
    var q = prompt('Edit quantity for "' + item.name + '" (' + unit + '):', item.quantity);
    var bp = prompt('Edit buying price for "' + item.name + '":', item.buyingPrice);
    var sp = prompt('Edit selling price for "' + item.name + '":', item.sellingPrice);
    if (q !== null && bp !== null && sp !== null) {
        var qty = parseFloat(q), buy = parseFloat(bp), sell = parseFloat(sp);
        if (qty >= 0 && buy > 0 && sell > 0) {
            item.quantity = qty; item.buyingPrice = buy; item.sellingPrice = sell;
            item.updatedAt = new Date().toISOString();
            localStorage.setItem(key, JSON.stringify(data));
            loadStockList(category); populateProductDropdowns();
        } else alert('Invalid values entered.');
    }
}

function deleteStock(id, category) {
    if (!confirm('Delete this stock item?')) return;
    var key = 'tarekStockData_' + category;
    var data = JSON.parse(localStorage.getItem(key)) || [];
    localStorage.setItem(key, JSON.stringify(data.filter(function(i) { return i.id !== id; })));
    loadStockList(category); populateProductDropdowns();
}

// Expenses
function addExpense(event) {
    event.preventDefault();
    var date = document.getElementById('expense-date').value;
    var name = document.getElementById('expense-name').value.trim();
    var description = document.getElementById('expense-description').value.trim();
    var amount = parseFloat(document.getElementById('expense-amount').value);
    if (!date || !name || amount <= 0) { alert('Please fill in all required fields.'); return; }
    var expenses = JSON.parse(localStorage.getItem('tarekExpenseData')) || [];
    expenses.push({ id: Date.now().toString(), date: date, name: name, description: description, amount: amount, createdAt: new Date().toISOString() });
    expenses.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
    localStorage.setItem('tarekExpenseData', JSON.stringify(expenses));
    alert('Expense added successfully!');
    clearExpenseForm();
    loadExpenseHistory();
}

function clearExpenseForm() {
    document.getElementById('expense-form').reset();
    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
}

function loadExpenseHistory() {
    displayExpenses(JSON.parse(localStorage.getItem('tarekExpenseData')) || []);
}

function displayExpenses(expenses) {
    var list = document.getElementById('expense-list');
    var today = new Date().toISOString().split('T')[0];
    var thisMonth = today.substring(0, 7);
    document.getElementById('today-expenses').textContent = '$' + expenses.filter(function(e) { return e.date === today; }).reduce(function(s, e) { return s + e.amount; }, 0).toFixed(2);
    document.getElementById('month-expenses').textContent = '$' + expenses.filter(function(e) { return e.date.startsWith(thisMonth); }).reduce(function(s, e) { return s + e.amount; }, 0).toFixed(2);
    document.getElementById('total-expense-records').textContent = expenses.length;
    if (expenses.length === 0) { list.innerHTML = '<div class="no-expenses">No expense records found.</div>'; return; }
    list.innerHTML = expenses.map(function(e) {
        return '<div class="expense-record">' +
            '<div class="expense-header"><span class="expense-name">' + e.name + '</span><span class="expense-amount">$' + e.amount.toFixed(2) + '</span></div>' +
            (e.description ? '<div class="expense-details">' + e.description + '</div>' : '') +
            '<div class="expense-date">' + formatDate(e.date) + '</div>' +
            '<div class="expense-actions">' +
            '<button class="edit-expense" onclick="editExpense(\'' + e.id + '\')">Edit</button>' +
            '<button class="delete-expense" onclick="deleteExpense(\'' + e.id + '\')">Delete</button>' +
            '</div></div>';
    }).join('');
}

function searchExpenses() {
    var date = document.getElementById('expense-search-date').value;
    var month = document.getElementById('expense-search-month').value;
    var name = document.getElementById('expense-search-name').value.toLowerCase();
    var data = JSON.parse(localStorage.getItem('tarekExpenseData')) || [];
    if (date) data = data.filter(function(e) { return e.date === date; });
    else if (month) data = data.filter(function(e) { return e.date.startsWith(month); });
    if (name) data = data.filter(function(e) { return e.name.toLowerCase().includes(name); });
    displayExpenses(data);
}

function showAllExpenses() {
    document.getElementById('expense-search-date').value = '';
    document.getElementById('expense-search-month').value = '';
    document.getElementById('expense-search-name').value = '';
    loadExpenseHistory();
}

function editExpense(id) {
    var expenses = JSON.parse(localStorage.getItem('tarekExpenseData')) || [];
    var e = expenses.find(function(x) { return x.id === id; });
    if (!e) return;
    var n = prompt('Edit expense name:', e.name);
    var a = prompt('Edit amount:', e.amount);
    var d = prompt('Edit description:', e.description);
    if (n !== null && a !== null) {
        var amt = parseFloat(a);
        if (n.trim() && amt > 0) {
            e.name = n.trim(); e.amount = amt; e.description = d || '';
            localStorage.setItem('tarekExpenseData', JSON.stringify(expenses));
            loadExpenseHistory();
        } else alert('Invalid values entered.');
    }
}

function deleteExpense(id) {
    if (!confirm('Delete this expense record?')) return;
    var data = JSON.parse(localStorage.getItem('tarekExpenseData')) || [];
    localStorage.setItem('tarekExpenseData', JSON.stringify(data.filter(function(e) { return e.id !== id; })));
    loadExpenseHistory();
}

function exportExpensesToExcel() {
    var date = document.getElementById('expense-search-date').value;
    var month = document.getElementById('expense-search-month').value;
    var name = document.getElementById('expense-search-name').value.toLowerCase();
    var data = JSON.parse(localStorage.getItem('tarekExpenseData')) || [];
    if (date) data = data.filter(function(e) { return e.date === date; });
    else if (month) data = data.filter(function(e) { return e.date.startsWith(month); });
    if (name) data = data.filter(function(e) { return e.name.toLowerCase().includes(name); });
    if (data.length === 0) { alert('No data to export.'); return; }
    data.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
    var rows = [['TAREK ENTERPRISE - EXPENSE REPORT'], ['Generated: ' + new Date().toLocaleDateString()], [],
        ['Date', 'Expense Name', 'Description', 'Amount']];
    data.forEach(function(e) { rows.push([formatDate(e.date), e.name, e.description || '', '$' + e.amount.toFixed(2)]); });
    rows.push([], ['TOTAL', '', '', '$' + data.reduce(function(s, e) { return s + e.amount; }, 0).toFixed(2)]);
    var wb = XLSX.utils.book_new();
    var ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [15, 25, 30, 15].map(function(w) { return { width: w }; });
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    var filename = 'Tarek_Enterprise_Expenses';
    if (date) filename += '_' + date;
    else if (month) filename += '_' + month.replace('-', '_');
    filename += '_' + new Date().toISOString().split('T')[0] + '.xlsx';
    XLSX.writeFile(wb, filename);
}
