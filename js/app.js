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
    document.getElementById('raw-stock-form').addEventListener('submit', function(e) { addStock(e, 'raw'); });
    document.getElementById('furniture-stock-form').addEventListener('submit', function(e) { addStock(e, 'furniture'); });
    
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
        loadStockList('raw');
        loadStockList('furniture');
    } else if (tabName === 'sales-entry') {
        populateProductDropdowns();
    }
}

// Category switching functionality
function showCategory(categoryName, clickedButton) {
    // Hide all category sections
    const categorySections = document.querySelectorAll('.category-section');
    categorySections.forEach(section => section.classList.remove('active'));
    
    // Remove active class from all category buttons
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(btn => btn.classList.remove('active'));
    
    // Show selected category
    document.getElementById(categoryName).classList.add('active');
    
    // Add active class to clicked button
    if (clickedButton) {
        clickedButton.classList.add('active');
    } else {
        // Fallback: find the button by category name
        const targetButton = Array.from(categoryButtons).find(btn => 
            btn.getAttribute('onclick').includes(categoryName)
        );
        if (targetButton) {
            targetButton.classList.add('active');
        }
    }
    
    // Load stock for the selected category
    const category = categoryName === 'raw-materials' ? 'raw' : 'furniture';
    loadStockList(category);
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
            
            if (!stockItem) {
                alert(`Product "${productName}" not found in stock!`);
                stockError = true;
                return;
            }
            
            if (stockItem.quantity < weight) {
                const unit = stockItem.unit || (stockItem.category === 'raw' ? 'KG' : 'Pieces');
                alert(`Insufficient stock for "${productName}". Available: ${stockItem.quantity} ${unit}, Requested: ${weight} ${unit}`);
                stockError = true;
                return;
            }
            
            items.push({
                name: productName,
                category: category,
                price: price,
                quantity: weight,
                customerName: customerName,
                duePayment: duePayment,
                total: price * weight
            });
        } else if (selectedValue || price || weight || customerName) {
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
                        <span>${item.name} - Customer: ${item.customerName}</span>
                        <span>${item.quantity} ${item.unit || (item.category === 'raw' ? 'KG' : 'Pieces')} × $${item.price.toFixed(2)} = $${item.total.toFixed(2)} ${item.duePayment > 0 ? `(Due: $${item.duePayment.toFixed(2)})` : ''}</span>
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
    
    // Sort by date (oldest first for better readability)
    dataToExport.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Create main sales sheet
    createSalesSheet(wb, dataToExport);
    
    // Create summary sheet
    createSummarySheet(wb, dataToExport);
    
    // Generate filename
    let filename = 'Tarek_Enterprise_Sales_Report';
    if (searchDate) {
        filename += `_${searchDate}`;
    } else if (searchMonth) {
        filename += `_${searchMonth.replace('-', '_')}`;
    } else {
        filename += `_All_Records`;
    }
    filename += `_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, filename);
}

// Create detailed sales sheet
function createSalesSheet(wb, dataToExport) {
    const salesData = [];
    
    // Add main header
    salesData.push(['TAREK ENTERPRISE - SALES REPORT']);
    salesData.push(['Generated on: ' + new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })]);
    salesData.push([]); // Empty row
    
    // Add column headers
    salesData.push([
        'Date',
        'Item Name',
        'Category',
        'Customer Name',
        'Price per Unit',
        'Quantity',
        'Unit',
        'Item Total',
        'Due Payment',
        'Daily Total'
    ]);
    
    let grandTotal = 0;
    let totalDue = 0;
    
    // Process each date
    dataToExport.forEach((record, recordIndex) => {
        const formattedDate = formatDate(record.date);
        
        // Add date separator
        if (recordIndex > 0) {
            salesData.push([]); // Empty row between dates
        }
        
        // Add items for this date
        record.items.forEach((item, itemIndex) => {
            const unit = item.unit || (item.category === 'raw' ? 'KG' : 'Pieces');
            const categoryName = item.category === 'raw' ? 'Raw Materials' : 'Furniture Materials';
            
            salesData.push([
                itemIndex === 0 ? formattedDate : '', // Show date only on first item
                item.name,
                categoryName,
                item.customerName || 'N/A',
                `$${item.price.toFixed(2)}`,
                item.quantity,
                unit,
                `$${item.total.toFixed(2)}`,
                item.duePayment > 0 ? `$${item.duePayment.toFixed(2)}` : '$0.00',
                itemIndex === 0 ? `$${record.dailyTotal.toFixed(2)}` : '' // Show daily total only on first item
            ]);
            
            if (itemIndex === 0) {
                grandTotal += record.dailyTotal;
            }
            totalDue += (item.duePayment || 0);
        });
    });
    
    // Add summary totals
    salesData.push([]); // Empty row
    salesData.push(['SUMMARY']);
    salesData.push(['Total Records:', dataToExport.length]);
    salesData.push(['Total Sales Amount:', `$${grandTotal.toFixed(2)}`]);
    salesData.push(['Total Due Payments:', `$${totalDue.toFixed(2)}`]);
    salesData.push(['Net Amount Received:', `$${(grandTotal - totalDue).toFixed(2)}`]);
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(salesData);
    
    // Set column widths
    ws['!cols'] = [
        { width: 15 }, // Date
        { width: 20 }, // Item Name
        { width: 18 }, // Category
        { width: 20 }, // Customer Name
        { width: 15 }, // Price per Unit
        { width: 12 }, // Quantity
        { width: 10 }, // Unit
        { width: 15 }, // Item Total
        { width: 15 }, // Due Payment
        { width: 15 }  // Daily Total
    ];
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Details');
}

// Create summary sheet
function createSummarySheet(wb, dataToExport) {
    const summaryData = [];
    
    // Add header
    summaryData.push(['TAREK ENTERPRISE - DAILY SUMMARY']);
    summaryData.push(['Generated on: ' + new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })]);
    summaryData.push([]); // Empty row
    
    // Add column headers
    summaryData.push([
        'Date',
        'Total Items Sold',
        'Raw Materials (KG)',
        'Furniture (Pieces)',
        'Daily Sales',
        'Due Payments',
        'Net Received'
    ]);
    
    let totalSales = 0;
    let totalDue = 0;
    let totalRawMaterials = 0;
    let totalFurniture = 0;
    
    // Process each date
    dataToExport.forEach(record => {
        const formattedDate = formatDate(record.date);
        const itemCount = record.items.length;
        
        // Calculate category totals
        let rawMaterialsQty = 0;
        let furnitureQty = 0;
        let dailyDue = 0;
        
        record.items.forEach(item => {
            if (item.category === 'raw') {
                rawMaterialsQty += item.quantity;
            } else {
                furnitureQty += item.quantity;
            }
            dailyDue += (item.duePayment || 0);
        });
        
        summaryData.push([
            formattedDate,
            itemCount,
            rawMaterialsQty > 0 ? `${rawMaterialsQty} KG` : '0 KG',
            furnitureQty > 0 ? `${furnitureQty} Pieces` : '0 Pieces',
            `$${record.dailyTotal.toFixed(2)}`,
            `$${dailyDue.toFixed(2)}`,
            `$${(record.dailyTotal - dailyDue).toFixed(2)}`
        ]);
        
        totalSales += record.dailyTotal;
        totalDue += dailyDue;
        totalRawMaterials += rawMaterialsQty;
        totalFurniture += furnitureQty;
    });
    
    // Add totals
    summaryData.push([]); // Empty row
    summaryData.push([
        'TOTALS',
        dataToExport.reduce((sum, record) => sum + record.items.length, 0),
        `${totalRawMaterials} KG`,
        `${totalFurniture} Pieces`,
        `$${totalSales.toFixed(2)}`,
        `$${totalDue.toFixed(2)}`,
        `$${(totalSales - totalDue).toFixed(2)}`
    ]);
    
    // Customer analysis
    summaryData.push([]); // Empty row
    summaryData.push(['CUSTOMER ANALYSIS']);
    summaryData.push(['Customer Name', 'Total Purchases', 'Total Due']);
    
    // Group by customer
    const customerData = {};
    dataToExport.forEach(record => {
        record.items.forEach(item => {
            const customer = item.customerName || 'Unknown';
            if (!customerData[customer]) {
                customerData[customer] = { total: 0, due: 0 };
            }
            customerData[customer].total += item.total;
            customerData[customer].due += (item.duePayment || 0);
        });
    });
    
    // Add customer data
    Object.entries(customerData)
        .sort(([,a], [,b]) => b.total - a.total) // Sort by total purchases
        .forEach(([customer, data]) => {
            summaryData.push([
                customer,
                `$${data.total.toFixed(2)}`,
                `$${data.due.toFixed(2)}`
            ]);
        });
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Set column widths
    ws['!cols'] = [
        { width: 15 }, // Date/Customer
        { width: 15 }, // Total Items/Purchases
        { width: 18 }, // Raw Materials
        { width: 18 }, // Furniture
        { width: 15 }, // Daily Sales
        { width: 15 }, // Due Payments
        { width: 15 }  // Net Received
    ];
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Summary & Analysis');
}

// Stock Management Functions

// Add new stock
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
        if (!confirm('Selling price is not higher than buying price. Continue anyway?')) {
            return;
        }
    }
    
    // Get existing stock data for this category
    const storageKey = `tarekStockData_${category}`;
    let stockData = JSON.parse(localStorage.getItem(storageKey)) || [];
    
    // Check if product already exists
    const existingIndex = stockData.findIndex(item => item.name.toLowerCase() === productName.toLowerCase());
    
    if (existingIndex !== -1) {
        if (confirm(`Product "${productName}" already exists. Do you want to add to existing stock?`)) {
            stockData[existingIndex].quantity += quantity;
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
            quantity: quantity,
            category: category,
            unit: category === 'raw' ? 'KG' : 'Pieces',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        stockData.push(newStock);
    }
    
    // Save to localStorage
    localStorage.setItem(storageKey, JSON.stringify(stockData));
    
    alert('Stock added successfully!');
    document.getElementById(`${prefix}-stock-form`).reset();
    loadStockList(category);
    populateProductDropdowns();
}

// Load and display stock list
function loadStockList(category) {
    const storageKey = `tarekStockData_${category}`;
    const stockData = JSON.parse(localStorage.getItem(storageKey)) || [];
    displayStockItems(stockData, category);
}

// Display stock items
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
                    <span class="stock-quantity ${quantityClass}">Stock: ${item.quantity} ${item.unit || (item.category === 'raw' ? 'KG' : 'Pieces')}</span>
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
                    <button class="edit-stock" onclick="editStock('${item.id}', '${category}')">Edit</button>
                    <button class="delete-stock" onclick="deleteStock('${item.id}', '${category}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// Search stock
function searchStock(category) {
    const prefix = category === 'raw' ? 'raw' : 'furniture';
    const searchTerm = document.getElementById(`${prefix}-stock-search`).value.toLowerCase();
    const storageKey = `tarekStockData_${category}`;
    const stockData = JSON.parse(localStorage.getItem(storageKey)) || [];
    
    const filteredData = stockData.filter(item => 
        item.name.toLowerCase().includes(searchTerm)
    );
    
    displayStockItems(filteredData, category);
}

// Show all stock
function showAllStock(category) {
    const prefix = category === 'raw' ? 'raw' : 'furniture';
    document.getElementById(`${prefix}-stock-search`).value = '';
    loadStockList(category);
}

// Edit stock item
function editStock(itemId, category) {
    const storageKey = `tarekStockData_${category}`;
    const stockData = JSON.parse(localStorage.getItem(storageKey)) || [];
    const item = stockData.find(stock => stock.id === itemId);
    
    if (!item) return;
    
    const unit = item.unit || (item.category === 'raw' ? 'KG' : 'Pieces');
    const quantityLabel = category === 'raw' ? 'weight' : 'quantity';
    
    const newQuantity = prompt(`Edit ${quantityLabel} for "${item.name}" (${unit}):`, item.quantity);
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
            alert('Please enter valid values.');
        }
    }
}

// Delete stock item
function deleteStock(itemId, category) {
    if (confirm('Are you sure you want to delete this stock item?')) {
        const storageKey = `tarekStockData_${category}`;
        let stockData = JSON.parse(localStorage.getItem(storageKey)) || [];
        stockData = stockData.filter(item => item.id !== itemId);
        
        localStorage.setItem(storageKey, JSON.stringify(stockData));
        loadStockList(category);
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
    // Get stock from both categories
    const rawStockData = JSON.parse(localStorage.getItem('tarekStockData_raw')) || [];
    const furnitureStockData = JSON.parse(localStorage.getItem('tarekStockData_furniture')) || [];
    const allStock = [...rawStockData, ...furnitureStockData];
    const availableStock = allStock.filter(item => item.quantity > 0);
    
    dropdown.innerHTML = '<option value="">Select Item</option>';
    
    availableStock.forEach(item => {
        const option = document.createElement('option');
        option.value = `${item.name}|${item.category}`;
        option.textContent = `${item.name} (${item.category === 'raw' ? 'Raw' : 'Furniture'}) - Stock: ${item.quantity} ${item.unit || (item.category === 'raw' ? 'KG' : 'Pieces')}`;
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
        const [productName, category] = dropdown.value.split('|');
        const storageKey = `tarekStockData_${category}`;
        const stockData = JSON.parse(localStorage.getItem(storageKey)) || [];
        const selectedItem = stockData.find(item => item.name === productName);
        
        if (selectedItem) {
            priceInput.value = selectedItem.sellingPrice.toFixed(2);
            const unit = selectedItem.unit || (selectedItem.category === 'raw' ? 'KG' : 'Pieces');
            stockSpan.textContent = `Stock: ${selectedItem.quantity} ${unit}`;
            quantityInput.max = selectedItem.quantity;
            
            // Update placeholder and step based on category
            if (selectedItem.category === 'raw') {
                quantityInput.placeholder = 'Weight (KG)';
                quantityInput.step = '0.1';
                quantityInput.min = '0.1';
            } else {
                quantityInput.placeholder = 'Quantity (Pieces)';
                quantityInput.step = '1';
                quantityInput.min = '1';
            }
            
            if (selectedItem.quantity <= 5) {
                stockSpan.classList.add('low-stock');
            } else {
                stockSpan.classList.remove('low-stock');
            }
        }
    } else {
        priceInput.value = '';
        stockSpan.textContent = 'Stock: 0';
        quantityInput.max = '';
        quantityInput.placeholder = 'Quantity';
        quantityInput.step = '0.1';
        quantityInput.min = '0.1';
        stockSpan.classList.remove('low-stock');
    }
    
    calculateItemTotal(itemRow);
    calculateDailyTotal();
}

// Update stock after sale
function updateStockAfterSale(soldItems) {
    soldItems.forEach(soldItem => {
        const storageKey = `tarekStockData_${soldItem.category}`;
        let stockData = JSON.parse(localStorage.getItem(storageKey)) || [];
        
        const stockItem = stockData.find(item => item.name === soldItem.name);
        if (stockItem) {
            stockItem.quantity -= soldItem.quantity;
            stockItem.updatedAt = new Date().toISOString();
        }
        
        localStorage.setItem(storageKey, JSON.stringify(stockData));
    });
}
