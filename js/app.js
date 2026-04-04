// Initialize the application
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
        if (e.target.classList.contains('item-name')) {
            updateProductDetails(e.target);
        }
    });
});

// Tab switching
function showTab(tabName, clickedButton) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    if (clickedButton) {
        clickedButton.classList.add('active');
    }
    if (tabName === 'sales-history') loadSalesHistory();
    else if (tabName === 'add-stock') { loadStockList('raw'); loadStockList('furniture'); }
    else if (tabName === 'sales-entry') populateProductDropdowns();
    else if (tabName === 'daily-expenses') loadExpenseHistory();
}

// Category switching
function showCategory(categoryName, clickedButton) {
    document.querySelectorAll('.category-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    const target = document.getElementById(categoryName);
    if (target) target.classList.add('active');
    if (clickedButton) clickedButton.classList.add('active');
    const category = categoryName === 'raw-materials' ? 'raw' : 'furniture';
    loadStockList(category);
}

// Add item row
function addItem() {
    const container = document.getElementById('items-container');
    const newRow = document.createElement('div');
    newRow.className = 'item-row';
    newRow.innerHTML = `
        <select class="item-name" required><option value="">Select Item</option></select>
        <input type="number" placeholder="Price" class="item-price" step="0.01" min="0" required readonly>
        <input type="number" placeholder="Quantity" class="item-quantity" step="0.1" min="0.1" required>
        <span class="stock-available">Stock: 0</span>
        <span class="item-total">0.00</span>
        <input type="text" placeholder="Customer Name" class="customer-name" required>
        <input type="number" placeholder="Due Payment" class="due-payment" step="0.01" min="0">
        <button type="button" class="remove-item" onclick="removeItem(this)">×</button>
    `;
    container.appendChild(newRow);
    populateProductDropdown(newRow.querySelector('.item-name'));
}

function removeItem(button) {
    button.closest('.item-row').remove();
    calculateDailyTotal();
}

function calculateItemTotal(itemRow) {
    const price = parseFloat(itemRow.querySelector('.item-price').value) || 0;
    const qty = parseFloat(itemRow.querySelector('.item-quantity').value) || 0;
    itemRow.querySelector('.item-total').textContent = (price * qty).toFixed(2);
}

function calculateDailyTotal() {
    let total = 0;
    document.querySelectorAll('.item-total').forEach(t => { total += parseFloat(t.textContent) || 0; });
    document.getElementById('daily-total').textContent = total.toFixed(2);
}

// Populate product dropdowns
function populateProductDropdowns() {
    document.querySelectorAll('.item-name').forEach(select => populateProductDropdown(select));
}

function populateProductDropdown(select) {
    const currentValue = select.value;
    select.innerHTML = '<option value="">Select Item</option>';
    ['raw', 'furniture'].forEach(category => {
        const storageKey = `tarekStockData_${category}`;
        const stockData = JSON.parse(localStorage.getItem(storageKey)) || [];
        stockData.forEach(item => {
            if (item.quantity > 0) {
                const option = document.createElement('option');
                option.value = `${item.name}|${category}`;
                option.textContent = `${item.name} (${category === 'raw' ? 'Raw' : 'Furniture'}) - ${item.quantity} ${item.unit || (category === 'raw' ? 'KG' : 'Pieces')}`;
                select.appendChild(option);
            }
        });
    });
    if (currentValue) select.value = currentValue;
}

function updateProductDetails(select) {
    const row = select.closest('.item-row');
    const selectedValue = select.value;
    const stockAvailable = row.querySelector('.stock-available');
    const priceInput = row.querySelector('.item-price');

    if (!selectedValue) {
        priceInput.value = '';
        stockAvailable.textContent = 'Stock: 0';
        stockAvailable.classList.remove('low-stock');
        return;
    }

    const [productName, category] = selectedValue.split('|');
    const storageKey = `tarekStockData_${category}`;
    const stockData = JSON.parse(localStorage.getItem(storageKey)) || [];
    const stockItem = stockData.find(item => item.name === productName);

    if (stockItem) {
        priceInput.value = stockItem.sellingPrice;
        const unit = stockItem.unit || (category === 'raw' ? 'KG' : 'Pieces');
        stockAvailable.textContent = `Stock: ${stockItem.quantity} ${unit}`;
        stockAvailable.classList.toggle('low-stock', stockItem.quantity <= 5);
        calculateItemTotal(row);
        calculateDailyTotal();
    }
}

// Save sales
function saveSales(event) {
    event.preventDefault();
    const date = document.getElementById('sale-date').value;
    const itemRows = document.querySelectorAll('.item-row');
    const items = [];
    let isValid = true;
    let stockError = false;

    itemRows.forEach(row => {
        const selectedValue = row.querySelector('.item-name').value.trim();
        const price = parseFloat(row.querySelector('.item-price').value);
        const weight = parseFloat(row.querySelector('.item-quantity').value);
        const customerName = row.querySelector('.customer-name').value.trim();
        const duePayment = parseFloat(row.querySelector('.due-payment').value) || 0;

        if (selectedValue && price > 0 && weight > 0 && customerName) {
            const [productName, category] = selectedValue.split('|');
            const storageKey = `tarekStockData_${category}`;
            const stockData = JSON.parse(localStorage.getItem(storageKey)) || [];
            const stockItem = stockData.find(item => item.name === productName);

            if (!stockItem) { alert(`Product "${productName}" not found in stock!`); stockError = true; return; }

            if (stockItem.quantity < weight) {
                const unit = stockItem.unit || (category === 'raw' ? 'KG' : 'Pieces');
                alert(`Insufficient stock for "${productName}". Available: ${stockItem.quantity} ${unit}, Requested: ${weight} ${unit}`);
                stockError = true;
                return;
            }

            const buyingPrice = stockItem.buyingPrice || 0;
            items.push({ name: productName, category, price, buyingPrice, quantity: weight, customerName, duePayment, total: price * weight, profit: (price - buyingPrice) * weight });
        } else if (selectedValue || price || weight || customerName) {
            isValid = false;
        }
    });

    if (!isValid || items.length === 0 || stockError) {
        if (!stockError) alert('Please fill in all item details correctly or remove empty rows.');
        return;
    }

    updateStockAfterSale(items);

    const dailyTotal = items.reduce((sum, item) => sum + item.total, 0);
    const salesRecord = { id: Date.now().toString(), date, items, dailyTotal, createdAt: new Date().toISOString() };

    let salesData = JSON.parse(localStorage.getItem('tarekSalesData')) || [];
    const existingIndex = salesData.findIndex(r => r.date === date);
    if (existingIndex !== -1) {
        // Append new items to the existing record for that date
        salesData[existingIndex].items = salesData[existingIndex].items.concat(items);
        salesData[existingIndex].dailyTotal += dailyTotal;
    } else {
        salesData.push(salesRecord);
    }

    salesData.sort((a, b) => new Date(b.date) - new Date(a.date));
    localStorage.setItem('tarekSalesData', JSON.stringify(salesData));
    alert('Sales record saved successfully!');
    clearForm();
    loadSalesHistory();
    loadStockList('raw');
    loadStockList('furniture');
    populateProductDropdowns();
}

function updateStockAfterSale(items) {
    items.forEach(item => {
        const storageKey = `tarekStockData_${item.category}`;
        const stockData = JSON.parse(localStorage.getItem(storageKey)) || [];
        const stockItem = stockData.find(s => s.name === item.name);
        if (stockItem) {
            stockItem.quantity = Math.max(0, stockItem.quantity - item.quantity);
            stockItem.updatedAt = new Date().toISOString();
        }
        localStorage.setItem(storageKey, JSON.stringify(stockData));
    });
}

function clearForm() {
    document.getElementById('sales-form').reset();
    document.getElementById('sale-date').value = new Date().toISOString().split('T')[0];
    const container = document.getElementById('items-container');
    container.innerHTML = `
        <div class="item-row">
            <select class="item-name" required><option value="">Select Item</option></select>
            <input type="number" placeholder="Price" class="item-price" step="0.01" min="0" required readonly>
            <input type="number" placeholder="Quantity" class="item-quantity" step="0.1" min="0.1" required>
            <span class="stock-available">Stock: 0</span>
            <span class="item-total">0.00</span>
            <input type="text" placeholder="Customer Name" class="customer-name" required>
            <input type="number" placeholder="Due Payment" class="due-payment" step="0.01" min="0">
            <button type="button" class="remove-item" onclick="removeItem(this)">×</button>
        </div>
    `;
    populateProductDropdown(container.querySelector('.item-name'));
    document.getElementById('daily-total').textContent = '0.00';
}

// Sales History
function loadSalesHistory() {
    const salesData = JSON.parse(localStorage.getItem('tarekSalesData')) || [];
    displaySalesRecords(salesData);
}

function displaySalesRecords(records) {
    const salesList = document.getElementById('sales-list');
    const totalRecords = document.getElementById('total-records');
    const totalAmount = document.getElementById('total-amount');

    if (records.length === 0) {
        salesList.innerHTML = '<div class="no-records">No sales records found.</div>';
        totalRecords.textContent = '0';
        totalAmount.textContent = '0.00';
        document.getElementById('total-profit').textContent = '0.00';
        return;
    }

    totalRecords.textContent = records.length;
    totalAmount.textContent = records.reduce(function(sum, r) { return sum + r.dailyTotal; }, 0).toFixed(2);

    var totalProfit = records.reduce(function(sum, r) {
        return sum + r.items.reduce(function(s, i) {
            var p = (i.profit !== undefined) ? i.profit : (i.price - (i.buyingPrice || 0)) * i.quantity;
            return s + p;
        }, 0);
    }, 0);
    document.getElementById('total-profit').textContent = totalProfit.toFixed(2);

    salesList.innerHTML = records.map(function(record) {
        var recordProfit = record.items.reduce(function(s, i) {
            return s + ((i.profit !== undefined) ? i.profit : (i.price - (i.buyingPrice || 0)) * i.quantity);
        }, 0);

        var itemsHtml = record.items.map(function(item) {
            var unit = item.unit || (item.category === 'raw' ? 'KG' : 'Pieces');
            var itemProfit = (item.profit !== undefined) ? item.profit : (item.price - (item.buyingPrice || 0)) * item.quantity;
            var dueHtml = item.duePayment > 0 ? '<span class="item-due">(Due: $' + item.duePayment.toFixed(2) + ')</span>' : '';
            return '<div class="item-detail">' +
                '<span>' + item.name + ' \u2014 ' + item.customerName + '</span>' +
                '<span>' + item.quantity + ' ' + unit + ' \u00d7 $' + item.price.toFixed(2) +
                ' = $' + item.total.toFixed(2) +
                ' <span class="item-profit">+$' + itemProfit.toFixed(2) + ' profit</span>' +
                dueHtml + '</span>' +
                '</div>';
        }).join('');

        var cost = record.dailyTotal - recordProfit;
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
    const searchDate = document.getElementById('search-date').value;
    const searchMonth = document.getElementById('search-month').value;
    let data = JSON.parse(localStorage.getItem('tarekSalesData')) || [];
    if (searchDate) data = data.filter(r => r.date === searchDate);
    else if (searchMonth) data = data.filter(r => r.date.startsWith(searchMonth));
    displaySalesRecords(data);
}

function showAllSales() {
    document.getElementById('search-date').value = '';
    document.getElementById('search-month').value = '';
    loadSalesHistory();
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Export Sales to Excel
function exportToExcel() {
    const searchDate = document.getElementById('search-date').value;
    const searchMonth = document.getElementById('search-month').value;
    let data = JSON.parse(localStorage.getItem('tarekSalesData')) || [];
    if (searchDate) data = data.filter(r => r.date === searchDate);
    else if (searchMonth) data = data.filter(r => r.date.startsWith(searchMonth));
    if (data.length === 0) { alert('No data to export.'); return; }
    data.sort((a, b) => new Date(a.date) - new Date(b.date));
    const wb = XLSX.utils.book_new();
    createSalesSheet(wb, data);
    createSummarySheet(wb, data);
    let filename = 'Tarek_Enterprise_Sales_Report';
    if (searchDate) filename += `_${searchDate}`;
    else if (searchMonth) filename += `_${searchMonth.replace('-', '_')}`;
    else filename += '_All_Records';
    filename += `_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
}

function createSalesSheet(wb, dataToExport) {
    const rows = [
        ['TAREK ENTERPRISE - SALES REPORT'],
        ['Generated on: ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })],
        [],
        ['Date', 'Item Name', 'Category', 'Customer Name', 'Price per Unit', 'Quantity', 'Unit', 'Item Total', 'Due Payment', 'Daily Total']
    ];
    let grandTotal = 0, totalDue = 0;
    dataToExport.forEach((record, ri) => {
        if (ri > 0) rows.push([]);
        record.items.forEach((item, ii) => {
            const unit = item.unit || (item.category === 'raw' ? 'KG' : 'Pieces');
            rows.push([
                ii === 0 ? formatDate(record.date) : '',
                item.name,
                item.category === 'raw' ? 'Raw Materials' : 'Furniture Materials',
                item.customerName || 'N/A',
                `$${item.price.toFixed(2)}`, item.quantity, unit,
                `$${item.total.toFixed(2)}`,
                item.duePayment > 0 ? `$${item.duePayment.toFixed(2)}` : '$0.00',
                ii === 0 ? `$${record.dailyTotal.toFixed(2)}` : ''
            ]);
            if (ii === 0) grandTotal += record.dailyTotal;
            totalDue += (item.duePayment || 0);
        });
    });
    rows.push([], ['SUMMARY'], ['Total Records:', dataToExport.length],
        ['Total Sales Amount:', `$${grandTotal.toFixed(2)}`],
        ['Total Due Payments:', `$${totalDue.toFixed(2)}`],
        ['Net Amount Received:', `$${(grandTotal - totalDue).toFixed(2)}`]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [15,20,18,20,15,12,10,15,15,15].map(w => ({ width: w }));
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Details');
}

function createSummarySheet(wb, dataToExport) {
    const rows = [
        ['TAREK ENTERPRISE - DAILY SUMMARY'],
        ['Generated on: ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })],
        [],
        ['Date', 'Total Items Sold', 'Raw Materials (KG)', 'Furniture (Pieces)', 'Daily Sales', 'Due Payments', 'Net Received']
    ];
    let totalSales = 0, totalDue = 0, totalRaw = 0, totalFurniture = 0;
    dataToExport.forEach(record => {
        let rawQty = 0, furQty = 0, dailyDue = 0;
        record.items.forEach(item => {
            if (item.category === 'raw') rawQty += item.quantity;
            else furQty += item.quantity;
            dailyDue += (item.duePayment || 0);
        });
        rows.push([formatDate(record.date), record.items.length, `${rawQty} KG`, `${furQty} Pieces`,
            `$${record.dailyTotal.toFixed(2)}`, `$${dailyDue.toFixed(2)}`, `$${(record.dailyTotal - dailyDue).toFixed(2)}`]);
        totalSales += record.dailyTotal; totalDue += dailyDue; totalRaw += rawQty; totalFurniture += furQty;
    });
    rows.push([], ['TOTALS', dataToExport.reduce((s, r) => s + r.items.length, 0),
        `${totalRaw} KG`, `${totalFurniture} Pieces`, `$${totalSales.toFixed(2)}`, `$${totalDue.toFixed(2)}`, `$${(totalSales - totalDue).toFixed(2)}`]);

    // Customer analysis
    rows.push([], ['CUSTOMER ANALYSIS'], ['Customer Name', 'Total Purchases', 'Total Due']);
    const customerData = {};
    dataToExport.forEach(record => {
        record.items.forEach(item => {
            const c = item.customerName || 'Unknown';
            if (!customerData[c]) customerData[c] = { total: 0, due: 0 };
            customerData[c].total += item.total;
            customerData[c].due += (item.duePayment || 0);
        });
    });
    Object.entries(customerData).sort(([,a],[,b]) => b.total - a.total)
        .forEach(([c, d]) => rows.push([c, `$${d.total.toFixed(2)}`, `$${d.due.toFixed(2)}`]));

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [15,15,18,18,15,15,15].map(w => ({ width: w }));
    XLSX.utils.book_append_sheet(wb, ws, 'Summary & Analysis');
}

// Stock Management
function addStock(event, category) {
    event.preventDefault();
    const prefix = category === 'raw' ? 'raw' : 'furniture';
    const productName = document.getElementById(`${prefix}-product-name`).value.trim();
    const buyingPrice = parseFloat(document.getElementById(`${prefix}-buying-price`).value);
    const sellingPrice = parseFloat(document.getElementById(`${prefix}-selling-price`).value);
    const quantity = parseFloat(document.getElementById(`${prefix}-stock-quantity`).value);

    if (!productName || buyingPrice <= 0 || sellingPrice <= 0 || quantity <= 0) {
        alert('Please fill in all required fields with valid values.');
        return;
    }
    if (sellingPrice <= buyingPrice) {
        if (!confirm('Selling price is not higher than buying price. Continue anyway?')) return;
    }

    const storageKey = `tarekStockData_${category}`;
    let stockData = JSON.parse(localStorage.getItem(storageKey)) || [];
    const existingIndex = stockData.findIndex(item => item.name.toLowerCase() === productName.toLowerCase());

    if (existingIndex !== -1) {
        if (confirm(`"${productName}" already exists. Add to existing stock?`)) {
            stockData[existingIndex].quantity += quantity;
            stockData[existingIndex].buyingPrice = buyingPrice;
            stockData[existingIndex].sellingPrice = sellingPrice;
            stockData[existingIndex].updatedAt = new Date().toISOString();
        } else return;
    } else {
        stockData.push({
            id: Date.now().toString(), name: productName, buyingPrice, sellingPrice, quantity,
            category, unit: category === 'raw' ? 'KG' : 'Pieces',
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        });
    }

    localStorage.setItem(storageKey, JSON.stringify(stockData));
    alert('Stock added successfully!');
    document.getElementById(`${prefix}-stock-form`).reset();
    loadStockList(category);
    populateProductDropdowns();
}

function loadStockList(category) {
    const stockData = JSON.parse(localStorage.getItem(`tarekStockData_${category}`)) || [];
    displayStockItems(stockData, category);
}

function displayStockItems(items, category) {
    const prefix = category === 'raw' ? 'raw' : 'furniture';
    const stockList = document.getElementById(`${prefix}-stock-list`);
    const totalProducts = document.getElementById(`${prefix}-total-products`);
    const totalStockValue = document.getElementById(`${prefix}-total-stock-value`);
    const lowStockCount = document.getElementById(`${prefix}-low-stock-count`);

    if (items.length === 0) {
        stockList.innerHTML = '<div class="no-stock">No stock items found.</div>';
        totalProducts.textContent = '0';
        totalStockValue.textContent = '0.00';
        lowStockCount.textContent = '0';
        return;
    }

    totalProducts.textContent = items.length;
    totalStockValue.textContent = items.reduce((s, i) => s + (i.buyingPrice * i.quantity), 0).toFixed(2);
    lowStockCount.textContent = items.filter(i => i.quantity <= 5).length;

    stockList.innerHTML = items.map(item => {
        const stockClass = item.quantity === 0 ? 'out-of-stock' : item.quantity <= 5 ? 'low-stock' : '';
        const unit = item.unit || (item.category === 'raw' ? 'KG' : 'Pieces');
        return `
            <div class="stock-item ${stockClass}">
                <div class="stock-header">
                    <span class="stock-name">${item.name}</span>
                    <span class="stock-quantity ${stockClass}">Stock: ${item.quantity} ${unit}</span>
                </div>
                <div class="stock-details">
                    <div class="stock-detail-item"><span>Buying Price:</span><span>$${item.buyingPrice.toFixed(2)}</span></div>
                    <div class="stock-detail-item"><span>Selling Price:</span><span>$${item.sellingPrice.toFixed(2)}</span></div>
                    <div class="stock-detail-item"><span>Profit per unit:</span><span>$${(item.sellingPrice - item.buyingPrice).toFixed(2)}</span></div>
                    <div class="stock-detail-item"><span>Total Value:</span><span>$${(item.buyingPrice * item.quantity).toFixed(2)}</span></div>
                </div>
                <div class="stock-actions">
                    <button class="edit-stock" onclick="editStock('${item.id}', '${category}')">Edit</button>
                    <button class="delete-stock" onclick="deleteStock('${item.id}', '${category}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function searchStock(category) {
    const prefix = category === 'raw' ? 'raw' : 'furniture';
    const term = document.getElementById(`${prefix}-stock-search`).value.toLowerCase();
    const stockData = JSON.parse(localStorage.getItem(`tarekStockData_${category}`)) || [];
    displayStockItems(stockData.filter(i => i.name.toLowerCase().includes(term)), category);
}

function showAllStock(category) {
    const prefix = category === 'raw' ? 'raw' : 'furniture';
    document.getElementById(`${prefix}-stock-search`).value = '';
    loadStockList(category);
}

function editStock(itemId, category) {
    const storageKey = `tarekStockData_${category}`;
    const stockData = JSON.parse(localStorage.getItem(storageKey)) || [];
    const item = stockData.find(s => s.id === itemId);
    if (!item) return;

    const unit = item.unit || (category === 'raw' ? 'KG' : 'Pieces');
    const newQuantity = prompt(`Edit quantity for "${item.name}" (${unit}):`, item.quantity);
    const newBuyingPrice = prompt(`Edit buying price for "${item.name}":`, item.buyingPrice);
    const newSellingPrice = prompt(`Edit selling price for "${item.name}":`, item.sellingPrice);

    if (newQuantity !== null && newBuyingPrice !== null && newSellingPrice !== null) {
        const quantity = parseFloat(newQuantity);
        const buyingPrice = parseFloat(newBuyingPrice);
        const sellingPrice = parseFloat(newSellingPrice);
        if (quantity >= 0 && buyingPrice > 0 && sellingPrice > 0) {
            item.quantity = quantity;
            item.buyingPrice = buyingPrice;
            item.sellingPrice = sellingPrice;
            item.updatedAt = new Date().toISOString();
            localStorage.setItem(storageKey, JSON.stringify(stockData));
            loadStockList(category);
            populateProductDropdowns();
        } else {
            alert('Invalid values entered.');
        }
    }
}

function deleteStock(itemId, category) {
    if (!confirm('Are you sure you want to delete this stock item?')) return;
    const storageKey = `tarekStockData_${category}`;
    let stockData = JSON.parse(localStorage.getItem(storageKey)) || [];
    stockData = stockData.filter(i => i.id !== itemId);
    localStorage.setItem(storageKey, JSON.stringify(stockData));
    loadStockList(category);
    populateProductDropdowns();
}

// Expenses
function addExpense(event) {
    event.preventDefault();
    const date = document.getElementById('expense-date').value;
    const name = document.getElementById('expense-name').value.trim();
    const description = document.getElementById('expense-description').value.trim();
    const amount = parseFloat(document.getElementById('expense-amount').value);

    if (!date || !name || amount <= 0) { alert('Please fill in all required fields.'); return; }

    let expenses = JSON.parse(localStorage.getItem('tarekExpenseData')) || [];
    expenses.push({ id: Date.now().toString(), date, name, description, amount, createdAt: new Date().toISOString() });
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
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
    const expenses = JSON.parse(localStorage.getItem('tarekExpenseData')) || [];
    displayExpenses(expenses);
}

function displayExpenses(expenses) {
    const list = document.getElementById('expense-list');
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);

    const todayTotal = expenses.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0);
    const monthTotal = expenses.filter(e => e.date.startsWith(thisMonth)).reduce((s, e) => s + e.amount, 0);

    document.getElementById('today-expenses').textContent = `$${todayTotal.toFixed(2)}`;
    document.getElementById('month-expenses').textContent = `$${monthTotal.toFixed(2)}`;
    document.getElementById('total-expense-records').textContent = expenses.length;

    if (expenses.length === 0) { list.innerHTML = '<div class="no-expenses">No expense records found.</div>'; return; }

    list.innerHTML = expenses.map(e => `
        <div class="expense-record">
            <div class="expense-header">
                <span class="expense-name">${e.name}</span>
                <span class="expense-amount">$${e.amount.toFixed(2)}</span>
            </div>
            ${e.description ? `<div class="expense-details">${e.description}</div>` : ''}
            <div class="expense-date">${formatDate(e.date)}</div>
            <div class="expense-actions">
                <button class="edit-expense" onclick="editExpense('${e.id}')">Edit</button>
                <button class="delete-expense" onclick="deleteExpense('${e.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

function searchExpenses() {
    const date = document.getElementById('expense-search-date').value;
    const month = document.getElementById('expense-search-month').value;
    const name = document.getElementById('expense-search-name').value.toLowerCase();
    let expenses = JSON.parse(localStorage.getItem('tarekExpenseData')) || [];
    if (date) expenses = expenses.filter(e => e.date === date);
    else if (month) expenses = expenses.filter(e => e.date.startsWith(month));
    if (name) expenses = expenses.filter(e => e.name.toLowerCase().includes(name));
    displayExpenses(expenses);
}

function showAllExpenses() {
    document.getElementById('expense-search-date').value = '';
    document.getElementById('expense-search-month').value = '';
    document.getElementById('expense-search-name').value = '';
    loadExpenseHistory();
}

function editExpense(id) {
    let expenses = JSON.parse(localStorage.getItem('tarekExpenseData')) || [];
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;
    const newName = prompt('Edit expense name:', expense.name);
    const newAmount = prompt('Edit amount:', expense.amount);
    const newDesc = prompt('Edit description:', expense.description);
    if (newName !== null && newAmount !== null) {
        const amount = parseFloat(newAmount);
        if (newName.trim() && amount > 0) {
            expense.name = newName.trim();
            expense.amount = amount;
            expense.description = newDesc || '';
            localStorage.setItem('tarekExpenseData', JSON.stringify(expenses));
            loadExpenseHistory();
        } else {
            alert('Invalid values entered.');
        }
    }
}

function deleteExpense(id) {
    if (!confirm('Delete this expense record?')) return;
    let expenses = JSON.parse(localStorage.getItem('tarekExpenseData')) || [];
    expenses = expenses.filter(e => e.id !== id);
    localStorage.setItem('tarekExpenseData', JSON.stringify(expenses));
    loadExpenseHistory();
}

function exportExpensesToExcel() {
    const date = document.getElementById('expense-search-date').value;
    const month = document.getElementById('expense-search-month').value;
    const name = document.getElementById('expense-search-name').value.toLowerCase();
    let expenses = JSON.parse(localStorage.getItem('tarekExpenseData')) || [];
    if (date) expenses = expenses.filter(e => e.date === date);
    else if (month) expenses = expenses.filter(e => e.date.startsWith(month));
    if (name) expenses = expenses.filter(e => e.name.toLowerCase().includes(name));
    if (expenses.length === 0) { alert('No data to export.'); return; }

    expenses.sort((a, b) => new Date(a.date) - new Date(b.date));
    const rows = [
        ['TAREK ENTERPRISE - EXPENSE REPORT'],
        ['Generated on: ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })],
        [],
        ['Date', 'Expense Name', 'Description', 'Amount'],
        ...expenses.map(e => [formatDate(e.date), e.name, e.description || '', `$${e.amount.toFixed(2)}`]),
        [],
        ['TOTAL', '', '', `$${expenses.reduce((s, e) => s + e.amount, 0).toFixed(2)}`]
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [15, 25, 30, 15].map(w => ({ width: w }));
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    let filename = 'Tarek_Enterprise_Expenses';
    if (date) filename += `_${date}`;
    else if (month) filename += `_${month.replace('-', '_')}`;
    filename += `_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
}

