// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Set today's date as default
    document.getElementById('sale-date').value = new Date().toISOString().split('T')[0];
    
    // Load and display sales history
    loadSalesHistory();
    
    // Add event listeners
    document.getElementById('sales-form').addEventListener('submit', saveSales);
    
    // Add input listeners for automatic calculation
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('item-price') || e.target.classList.contains('item-quantity')) {
            calculateItemTotal(e.target.closest('.item-row'));
            calculateDailyTotal();
        }
    });
});

// Tab switching functionality
function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => tab.classList.remove('active'));
    
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Refresh sales history when switching to that tab
    if (tabName === 'sales-history') {
        loadSalesHistory();
    }
}

// Add new item row
function addItem() {
    const container = document.getElementById('items-container');
    const newRow = document.createElement('div');
    newRow.className = 'item-row';
    newRow.innerHTML = `
        <input type="text" placeholder="Item Name" class="item-name" required>
        <input type="number" placeholder="Price" class="item-price" step="0.01" min="0" required>
        <input type="number" placeholder="Quantity" class="item-quantity" min="1" required>
        <span class="item-total">0.00</span>
        <button type="button" class="remove-item" onclick="removeItem(this)">×</button>
    `;
    container.appendChild(newRow);
}

// Remove item row
function removeItem(button) {
    const itemRow = button.closest('.item-row');
    itemRow.remove();
    calculateDailyTotal();
}

// Calculate total for individual item
function calculateItemTotal(itemRow) {
    const price = parseFloat(itemRow.querySelector('.item-price').value) || 0;
    const quantity = parseInt(itemRow.querySelector('.item-quantity').value) || 0;
    const total = price * quantity;
    
    itemRow.querySelector('.item-total').textContent = total.toFixed(2);
}

// Calculate daily total
function calculateDailyTotal() {
    const itemTotals = document.querySelectorAll('.item-total');
    let dailyTotal = 0;
    
    itemTotals.forEach(total => {
        dailyTotal += parseFloat(total.textContent) || 0;
    });
    
    document.getElementById('daily-total').textContent = dailyTotal.toFixed(2);
}

// Save sales data
function saveSales(event) {
    event.preventDefault();
    
    const date = document.getElementById('sale-date').value;
    const itemRows = document.querySelectorAll('.item-row');
    const items = [];
    
    // Validate and collect items
    let isValid = true;
    itemRows.forEach(row => {
        const name = row.querySelector('.item-name').value.trim();
        const price = parseFloat(row.querySelector('.item-price').value);
        const quantity = parseInt(row.querySelector('.item-quantity').value);
        
        if (name && price > 0 && quantity > 0) {
            items.push({
                name: name,
                price: price,
                quantity: quantity,
                total: price * quantity
            });
        } else if (name || price || quantity) {
            isValid = false;
        }
    });
    
    if (!isValid || items.length === 0) {
        alert('Please fill in all item details correctly or remove empty rows.');
        return;
    }
    
    // Calculate daily total
    const dailyTotal = items.reduce((sum, item) => sum + item.total, 0);
    
    // Create sales record
    const salesRecord = {
        id: Date.now().toString(),
        date: date,
        items: items,
        dailyTotal: dailyTotal,
        createdAt: new Date().toISOString()
    };
    
    // Save to localStorage
    let salesData = JSON.parse(localStorage.getItem('tarekSalesData')) || [];
    
    // Check if there's already a record for this date
    const existingIndex = salesData.findIndex(record => record.date === date);
    if (existingIndex !== -1) {
        if (confirm('A sales record for this date already exists. Do you want to replace it?')) {
            salesData[existingIndex] = salesRecord;
        } else {
            return;
        }
    } else {
        salesData.push(salesRecord);
    }
    
    // Sort by date (newest first)
    salesData.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    localStorage.setItem('tarekSalesData', JSON.stringify(salesData));
    
    alert('Sales record saved successfully!');
    clearForm();
    loadSalesHistory();
}

// Clear the form
function clearForm() {
    document.getElementById('sales-form').reset();
    document.getElementById('sale-date').value = new Date().toISOString().split('T')[0];
    
    // Keep only one item row
    const container = document.getElementById('items-container');
    container.innerHTML = `
        <div class="item-row">
            <input type="text" placeholder="Item Name" class="item-name" required>
            <input type="number" placeholder="Price" class="item-price" step="0.01" min="0" required>
            <input type="number" placeholder="Quantity" class="item-quantity" min="1" required>
            <span class="item-total">0.00</span>
            <button type="button" class="remove-item" onclick="removeItem(this)">×</button>
        </div>
    `;
    
    document.getElementById('daily-total').textContent = '0.00';
}

// Load and display sales history
function loadSalesHistory() {
    const salesData = JSON.parse(localStorage.getItem('tarekSalesData')) || [];
    displaySalesRecords(salesData);
}

// Display sales records
function displaySalesRecords(records) {
    const salesList = document.getElementById('sales-list');
    const totalRecords = document.getElementById('total-records');
    const totalAmount = document.getElementById('total-amount');
    
    if (records.length === 0) {
        salesList.innerHTML = '<div class="no-records">No sales records found.</div>';
        totalRecords.textContent = '0';
        totalAmount.textContent = '0.00';
        return;
    }
    
    // Calculate totals
    const recordCount = records.length;
    const amountTotal = records.reduce((sum, record) => sum + record.dailyTotal, 0);
    
    totalRecords.textContent = recordCount;
    totalAmount.textContent = amountTotal.toFixed(2);
    
    // Generate HTML for records
    salesList.innerHTML = records.map(record => `
        <div class="sales-record">
            <h4>Date: ${formatDate(record.date)}</h4>
            <div class="record-total">Total: $${record.dailyTotal.toFixed(2)}</div>
            <div class="items-list">
                ${record.items.map(item => `
                    <div class="item-detail">
                        <span>${item.name}</span>
                        <span>${item.quantity} × $${item.price.toFixed(2)} = $${item.total.toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// Search sales by date
function searchSales() {
    const searchDate = document.getElementById('search-date').value;
    const searchMonth = document.getElementById('search-month').value;
    const salesData = JSON.parse(localStorage.getItem('tarekSalesData')) || [];
    
    let filteredData = salesData;
    
    if (searchDate) {
        filteredData = salesData.filter(record => record.date === searchDate);
    } else if (searchMonth) {
        filteredData = salesData.filter(record => record.date.startsWith(searchMonth));
    }
    
    displaySalesRecords(filteredData);
}

// Show all sales
function showAllSales() {
    document.getElementById('search-date').value = '';
    document.getElementById('search-month').value = '';
    loadSalesHistory();
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Export to Excel
function exportToExcel() {
    const searchDate = document.getElementById('search-date').value;
    const searchMonth = document.getElementById('search-month').value;
    const salesData = JSON.parse(localStorage.getItem('tarekSalesData')) || [];
    
    let dataToExport = salesData;
    
    // Apply filters if any
    if (searchDate) {
        dataToExport = salesData.filter(record => record.date === searchDate);
    } else if (searchMonth) {
        dataToExport = salesData.filter(record => record.date.startsWith(searchMonth));
    }
    
    if (dataToExport.length === 0) {
        alert('No data to export.');
        return;
    }
    
    // Prepare data for Excel
    const excelData = [];
    
    // Add header
    excelData.push(['Date', 'Item Name', 'Price', 'Quantity', 'Item Total', 'Daily Total']);
    
    dataToExport.forEach(record => {
        record.items.forEach((item, index) => {
            excelData.push([
                record.date,
                item.name,
                item.price,
                item.quantity,
                item.total,
                index === 0 ? record.dailyTotal : '' // Show daily total only in first row
            ]);
        });
        // Add empty row between dates
        excelData.push(['', '', '', '', '', '']);
    });
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Data');
    
    // Generate filename
    let filename = 'Tarek_Enterprise_Sales';
    if (searchDate) {
        filename += `_${searchDate}`;
    } else if (searchMonth) {
        filename += `_${searchMonth}`;
    } else {
        filename += `_All_Records`;
    }
    filename += '.xlsx';
    
    // Save file
    XLSX.writeFile(wb, filename);
}