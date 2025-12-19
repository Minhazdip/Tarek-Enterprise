// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Set today's date as default
    document.getElementById('sale-date').value = new Date().toISOString().split('T')[0];
    
    // Load and display sales history
    loadSalesHistory();
    loadStockList();
    populateProductDropdowns();
    
    // Add event listeners
    document.getElementById('sales-form').addEventListener('submit', saveSales);
    document.getElementById('stock-form').addEventListener('submit', addStock);
    
    // Add input listeners for automatic calculation
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('item-price') || e.target.classList.contains('item-quantity')) {
            calculateItemTotal(e.target.closest('.item-row'));
            calculateDailyTotal();
        }
    });
    
    // Add change listener for product selection
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('item-name')) {
            updateProductDetails(e.target);
        }
    });
});

// Tab switching functionality
function showTab(tabName, clickedButton) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => tab.classList.remove('active'));
    
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked button
    if (clickedButton) {
        clickedButton.classList.add('active');
    } else {
        // Fallback: find the button by tab name
        const targetButton = Array.from(tabButtons).find(btn => 
            btn.getAttribute('onclick').includes(tabName)
        );
        if (targetButton) {
            targetButton.classList.add('active');
        }
    }
    
    // Refresh data when switching tabs
    if (tabName === 'sales-history') {
        loadSalesHistory();
    } else if (tabName === 'add-stock') {
        loadStockList();
    } else if (tabName === 'sales-entry') {
        populateProductDropdowns();
    }
}

// Add new item row
function addItem() {
    const container = document.getElementById('items-container');
    const newRow = document.createElement('div');
    newRow.className = 'item-row';
    newRow.innerHTML = `
        <select class="item-name" required>
            <option value="">Select Item</option>
        </select>
        <input type="number" placeholder="Price" class="item-price" step="0.01" min="0" required readonly>
        <input type="number" placeholder="Weight (KG)" class="item-quantity" step="0.1" min="0.1" required>
        <span class="stock-available">Stock: 0 KG</span>
        <span class="item-total">0.00</span>
        <button type="button" class="remove-item" onclick="removeItem(this)">×</button>
    `;
    container.appendChild(newRow);
    populateProductDropdown(newRow.querySelector('.item-name'));
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
    const weight = parseFloat(itemRow.querySelector('.item-quantity').value) || 0;
    const total = price * weight;
    
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
    
    // Validate and collect items, check stock availability
    let isValid = true;
    let stockError = false;
    
    itemRows.forEach(row => {
        const name = row.querySelector('.item-name').value.trim();
        const price = parseFloat(row.querySelector('.item-price').value);
        const weight = parseFloat(row.querySelector('.item-quantity').value);
        
        if (name && price > 0 && weight > 0) {
            // Check stock availability
            const stockData = JSON.parse(localStorage.getItem('tarekStockData')) || [];
            const stockItem = stockData.find(item => item.name === name);
            
            if (!stockItem) {
                alert(`Product "${name}" not found in stock!`);
                stockError = true;
                return;
            }
            
            if (stockItem.quantity < weight) {
                alert(`Insufficient stock for "${name}". Available: ${stockItem.quantity} KG, Requested: ${weight} KG`);
                stockError = true;
                return;
            }
            
            items.push({
                name: name,
                price: price,
                quantity: weight,
                total: price * weight
            });
        } else if (name || price || weight) {
            isValid = false;
        }
    });
    
    if (!isValid || items.length === 0 || stockError) {
        if (!stockError) {
            alert('Please fill in all item details correctly or remove empty rows.');
        }
        return;
    }
    
    // Update stock quantities
    updateStockAfterSale(items);
    
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
    loadStockList();
    populateProductDropdowns();
}

// Clear the form
function clearForm() {
    document.getElementById('sales-form').reset();
    document.getElementById('sale-date').value = new Date().toISOString().split('T')[0];
    
    // Keep only one item row
    const container = document.getElementById('items-container');
    container.innerHTML = `
        <div class="item-row">
            <select class="item-name" required>
                <option value="">Select Item</option>
            </select>
            <input type="number" placeholder="Price" class="item-price" step="0.01" min="0" required readonly>
            <input type="number" placeholder="Weight (KG)" class="item-quantity" step="0.1" min="0.1" required>
            <span class="stock-available">Stock: 0 KG</span>
            <span class="item-total">0.00</span>
            <button type="button" class="remove-item" onclick="removeItem(this)">×</button>
        </div>
    `;
    
    populateProductDropdown(container.querySelector('.item-name'));
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
                        <span>${item.quantity} KG × $${item.price.toFixed(2)} = $${item.total.toFixed(2)}</span>
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
    excelData.push(['Date', 'Item Name', 'Price (per KG)', 'Weight (KG)', 'Item Total', 'Daily Total']);
    
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

// Stock Management Functions

// Add new stock
function addStock(event) {
    event.preventDefault();
    
    const productName = document.getElementById('product-name').value.trim();
    const buyingPrice = parseFloat(document.getElementById('buying-price').value);
    const sellingPrice = parseFloat(document.getElementById('selling-price').value);
    const weight = parseFloat(document.getElementById('stock-quantity').value);
    
    if (!productName || buyingPrice <= 0 || sellingPrice <= 0 || weight <= 0) {
        alert('Please fill in all fields with valid values.');
        return;
    }
    
    if (sellingPrice <= buyingPrice) {
        if (!confirm('Selling price is not higher than buying price. Continue anyway?')) {
            return;
        }
    }
    
    // Get existing stock data
    let stockData = JSON.parse(localStorage.getItem('tarekStockData')) || [];
    
    // Check if product already exists
    const existingIndex = stockData.findIndex(item => item.name.toLowerCase() === productName.toLowerCase());
    
    if (existingIndex !== -1) {
        if (confirm(`Product "${productName}" already exists. Do you want to add to existing stock?`)) {
            stockData[existingIndex].quantity += weight;
            stockData[existingIndex].buyingPrice = buyingPrice; // Update prices
            stockData[existingIndex].sellingPrice = sellingPrice;
            stockData[existingIndex].updatedAt = new Date().toISOString();
        } else {
            return;
        }
    } else {
        // Add new product
        const newStock = {
            id: Date.now().toString(),
            name: productName,
            buyingPrice: buyingPrice,
            sellingPrice: sellingPrice,
            quantity: weight,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        stockData.push(newStock);
    }
    
    // Save to localStorage
    localStorage.setItem('tarekStockData', JSON.stringify(stockData));
    
    alert('Stock added successfully!');
    document.getElementById('stock-form').reset();
    loadStockList();
    populateProductDropdowns();
}

// Load and display stock list
function loadStockList() {
    const stockData = JSON.parse(localStorage.getItem('tarekStockData')) || [];
    displayStockItems(stockData);
}

// Display stock items
function displayStockItems(items) {
    const stockList = document.getElementById('stock-list');
    const totalProducts = document.getElementById('total-products');
    const totalStockValue = document.getElementById('total-stock-value');
    const lowStockCount = document.getElementById('low-stock-count');
    
    if (items.length === 0) {
        stockList.innerHTML = '<div class="no-stock">No stock items found.</div>';
        totalProducts.textContent = '0';
        totalStockValue.textContent = '0.00';
        lowStockCount.textContent = '0';
        return;
    }
    
    // Calculate summary
    const productCount = items.length;
    const stockValue = items.reduce((sum, item) => sum + (item.buyingPrice * item.quantity), 0);
    const lowStock = items.filter(item => item.quantity <= 5).length;
    
    totalProducts.textContent = productCount;
    totalStockValue.textContent = stockValue.toFixed(2);
    lowStockCount.textContent = lowStock;
    
    // Generate HTML for stock items
    stockList.innerHTML = items.map(item => {
        const stockClass = item.quantity === 0 ? 'out-of-stock' : item.quantity <= 5 ? 'low-stock' : '';
        const quantityClass = item.quantity === 0 ? 'out-of-stock' : item.quantity <= 5 ? 'low-stock' : '';
        
        return `
            <div class="stock-item ${stockClass}">
                <div class="stock-header">
                    <span class="stock-name">${item.name}</span>
                    <span class="stock-quantity ${quantityClass}">Stock: ${item.quantity} KG</span>
                </div>
                <div class="stock-details">
                    <div class="stock-detail-item">
                        <span>Buying Price:</span>
                        <span>$${item.buyingPrice.toFixed(2)}</span>
                    </div>
                    <div class="stock-detail-item">
                        <span>Selling Price:</span>
                        <span>$${item.sellingPrice.toFixed(2)}</span>
                    </div>
                    <div class="stock-detail-item">
                        <span>Profit per unit:</span>
                        <span>$${(item.sellingPrice - item.buyingPrice).toFixed(2)}</span>
                    </div>
                    <div class="stock-detail-item">
                        <span>Total Value:</span>
                        <span>$${(item.buyingPrice * item.quantity).toFixed(2)}</span>
                    </div>
                </div>
                <div class="stock-actions">
                    <button class="edit-stock" onclick="editStock('${item.id}')">Edit</button>
                    <button class="delete-stock" onclick="deleteStock('${item.id}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// Search stock
function searchStock() {
    const searchTerm = document.getElementById('stock-search').value.toLowerCase();
    const stockData = JSON.parse(localStorage.getItem('tarekStockData')) || [];
    
    const filteredData = stockData.filter(item => 
        item.name.toLowerCase().includes(searchTerm)
    );
    
    displayStockItems(filteredData);
}

// Show all stock
function showAllStock() {
    document.getElementById('stock-search').value = '';
    loadStockList();
}

// Edit stock item
function editStock(itemId) {
    const stockData = JSON.parse(localStorage.getItem('tarekStockData')) || [];
    const item = stockData.find(stock => stock.id === itemId);
    
    if (!item) return;
    
    const newWeight = prompt(`Edit weight for "${item.name}" (KG):`, item.quantity);
    const newBuyingPrice = prompt(`Edit buying price for "${item.name}":`, item.buyingPrice);
    const newSellingPrice = prompt(`Edit selling price for "${item.name}":`, item.sellingPrice);
    
    if (newWeight !== null && newBuyingPrice !== null && newSellingPrice !== null) {
        const weight = parseFloat(newWeight);
        const buyingPrice = parseFloat(newBuyingPrice);
        const sellingPrice = parseFloat(newSellingPrice);
        
        if (weight >= 0 && buyingPrice > 0 && sellingPrice > 0) {
            item.quantity = weight;
            item.buyingPrice = buyingPrice;
            item.sellingPrice = sellingPrice;
            item.updatedAt = new Date().toISOString();
            
            localStorage.setItem('tarekStockData', JSON.stringify(stockData));
            loadStockList();
            populateProductDropdowns();
        } else {
            alert('Please enter valid values.');
        }
    }
}

// Delete stock item
function deleteStock(itemId) {
    if (confirm('Are you sure you want to delete this stock item?')) {
        let stockData = JSON.parse(localStorage.getItem('tarekStockData')) || [];
        stockData = stockData.filter(item => item.id !== itemId);
        
        localStorage.setItem('tarekStockData', JSON.stringify(stockData));
        loadStockList();
        populateProductDropdowns();
    }
}

// Populate product dropdowns in sales form
function populateProductDropdowns() {
    const dropdowns = document.querySelectorAll('.item-name');
    dropdowns.forEach(dropdown => {
        populateProductDropdown(dropdown);
    });
}

function populateProductDropdown(dropdown) {
    const stockData = JSON.parse(localStorage.getItem('tarekStockData')) || [];
    const availableStock = stockData.filter(item => item.quantity > 0);
    
    dropdown.innerHTML = '<option value="">Select Item</option>';
    
    availableStock.forEach(item => {
        const option = document.createElement('option');
        option.value = item.name;
        option.textContent = `${item.name} (Stock: ${item.quantity} KG)`;
        dropdown.appendChild(option);
    });
}

// Update product details when selected
function updateProductDetails(dropdown) {
    const itemRow = dropdown.closest('.item-row');
    const priceInput = itemRow.querySelector('.item-price');
    const stockSpan = itemRow.querySelector('.stock-available');
    const quantityInput = itemRow.querySelector('.item-quantity');
    
    if (dropdown.value) {
        const stockData = JSON.parse(localStorage.getItem('tarekStockData')) || [];
        const selectedItem = stockData.find(item => item.name === dropdown.value);
        
        if (selectedItem) {
            priceInput.value = selectedItem.sellingPrice.toFixed(2);
            stockSpan.textContent = `Stock: ${selectedItem.quantity} KG`;
            quantityInput.max = selectedItem.quantity;
            
            if (selectedItem.quantity <= 5) {
                stockSpan.classList.add('low-stock');
            } else {
                stockSpan.classList.remove('low-stock');
            }
        }
    } else {
        priceInput.value = '';
        stockSpan.textContent = 'Stock: 0 KG';
        quantityInput.max = '';
        stockSpan.classList.remove('low-stock');
    }
    
    calculateItemTotal(itemRow);
    calculateDailyTotal();
}

// Update stock after sale
function updateStockAfterSale(soldItems) {
    let stockData = JSON.parse(localStorage.getItem('tarekStockData')) || [];
    
    soldItems.forEach(soldItem => {
        const stockItem = stockData.find(item => item.name === soldItem.name);
        if (stockItem) {
            stockItem.quantity -= soldItem.quantity;
            stockItem.updatedAt = new Date().toISOString();
        }
    });
    
    localStorage.setItem('tarekStockData', JSON.stringify(stockData));
}
