# TAREK ENTERPRISE - Daily Sales Management System

A simple web-based application for tracking daily sales and managing sales records for Tarek Enterprise.

## Features

- **Daily Sales Entry**: Input selling items with price and quantity
- **Automatic Calculations**: Real-time total calculation for each entry and daily totals
- **Sales History**: Complete record of all previous sales with dates
- **Search by Date/Month**: Find sales records by specific dates or months
- **Excel Export**: Export sales data to Excel spreadsheets
- **Simple Interface**: Easy-to-use design that works on any device

## Technology Stack

- **HTML5**: Structure and layout
- **CSS3**: Styling and responsive design
- **JavaScript**: Interactive functionality and calculations
- **Local Storage**: Browser-based data storage
- **SheetJS**: Excel file export

## Project Structure

```
tarek-enterprise/
├── index.html              # Main application page
├── css/
│   └── styles.css          # Custom styles
├── js/
│   ├── app.js              # Main application logic
│   └── export.js           # Excel export functionality
└── assets/
    └── images/             # Logo and icons (optional)
```

## Installation & Setup

1. Download or clone the project files
2. Open `index.html` in any modern web browser
3. Start adding your daily sales data
4. All data is saved automatically in your browser

## Usage Guide

### Adding Daily Sales
1. Navigate to the "Add Sales" section
2. Enter the date (defaults to today)
3. Add items one by one:
   - Item name/description
   - Unit price
   - Quantity sold
4. Total amount calculates automatically
5. Save the daily sales record

### Viewing Sales History
1. Go to "Sales History" section
2. View all previous sales records
3. Use filters to search by:
   - Specific date
   - Date range
   - Month/Year
4. Sort by date, amount, or item count

### Exporting Data
1. Apply desired filters in Sales History
2. Click "Export to Excel" button
3. Choose export format:
   - Daily summary
   - Detailed item list
   - Monthly report
4. Download the generated Excel file

## Data Structure

### Sales Record Format
```json
{
  "id": "unique-id",
  "date": "2024-01-15",
  "items": [
    {
      "name": "Product Name",
      "price": 100.00,
      "quantity": 5,
      "total": 500.00
    }
  ],
  "dailyTotal": 500.00,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

## Browser Compatibility
Works on all modern web browsers (Chrome, Firefox, Safari, Edge)

## Data Storage
All sales data is stored locally in your browser. Make sure to backup your data regularly by exporting to Excel.

---

**TAREK ENTERPRISE** - Simplifying daily sales management since 2024