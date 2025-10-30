# Pallet Planner Web Application

A comprehensive web application for optimizing pallet loading and planning. This application helps logistics professionals efficiently plan pallet configurations, visualize layer-by-layer placement, and generate professional documentation.

## Features

### Core Pallet Planning System

#### Data Management
- **SKU Library**: Save and reuse SKU information including dimensions, weight, and pack type
- **Unit Selection**: Support for both "each" and "case" unit types
- **Company Management**: Store multiple company/warehouse locations
- **Customer Management**: Auto-detect existing customers or create new entries
- **Order Tracking**: Assign PO numbers, recipient information, and dates (MMDDYYYY format)

#### Intelligent Packing Logic
- **Height-First Optimization**: Primary constraint-based packing
- **2D Layer-Aware Placement**: Optimizes width × length per layer
- **Automatic Orientation**: Rotates SKUs to find best fit
- **Complete Placement**: Ensures no leftover units
- **Layer-by-Layer Visualization**: Visual representation of each pallet layer
- **Mixed-SKU Support**: Multiple SKU types per pallet
- **Weight Limits**: Configurable maximum weight (lbs or kg)
- **Custom Pallet Sizes**: Standard or custom dimensions
- **Height Constraints**: Configurable maximum pallet height

#### Professional Outputs

**Detailed Tables**:
- Pallet breakdown with contained SKUs
- Quantities and dimensions (inches)
- Weight tracking (lbs)
- Automatic freight classification
- Grand total summaries

**Export Formats** (alphabetically ordered):
- CSV - Comma-separated values
- JSON - Structured data format
- PDF - Professional print-ready documents
- TXT - Plain text reports
- XLSX - Excel spreadsheets

**Filename Convention**: `PO#_Customer_MMDDYYYY_pallet_plan.{ext}`

**Pack Sheet Contents**:
- Company information
- Customer information
- Comprehensive pallet breakdown
- Layer-by-layer visualization

### Color Theme
Modern UI with white, yellow (primary accent), and black color scheme

## Technology Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for modern, responsive styling
- **Lucide React** for beautiful icons
- **jsPDF** with autoTable for PDF generation
- **XLSX** for Excel file creation
- **date-fns** for date handling
- **LocalStorage** for data persistence

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pallet-planner
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to the URL shown (typically `http://localhost:5173`)

## Usage Guide

### 1. Set Up Your Data

#### Add Companies
1. Navigate to the "Companies" tab
2. Click "Add Company"
3. Enter company details (name, address, contact info)
4. Save

#### Add Customers
1. Navigate to the "Customers" tab
2. Click "Add Customer"
3. Enter customer details
4. Save

#### Build SKU Library
1. Navigate to the "SKU Library" tab
2. Click "Add SKU"
3. Enter SKU details:
   - Name and ID
   - Dimensions (Length × Width × Height in inches)
   - Weight (lbs)
   - Pack type (Box, Pallet, Crate, etc.)
   - Optional description
4. Save

### 2. Create a Pallet Plan

1. Navigate to the "Pallet Planner" tab
2. Fill in order information:
   - Select company
   - Select customer
   - Enter PO number
   - Set order date
3. Configure pallet settings:
   - Pallet dimensions (default: 48" × 40")
   - Maximum height (default: 72")
   - Maximum weight (default: 2000 lbs)
   - Weight unit (lbs or kg)
4. Add items to the order:
   - Select SKU from dropdown
   - Enter quantity
   - Choose unit type (each or case)
   - Click "Add"
5. Click "Calculate Pallet Plan"

### 3. Review Results

The application will display:
- Summary statistics (total pallets, weight, average height)
- Detailed pallet breakdown table
- Layer-by-layer visualizations for each pallet
- Freight classification for each pallet

### 4. Export Documentation

Click any export button to download:
- **CSV**: Spreadsheet data
- **JSON**: Structured data for API integration
- **PDF**: Professional print-ready document
- **TXT**: Plain text report
- **XLSX**: Excel workbook with multiple sheets

## Algorithm Details

### Pallet Optimization Algorithm

The application uses a sophisticated bin packing algorithm:

1. **Item Sorting**: Items sorted by height (descending) for optimal stacking
2. **Layer Grouping**: Items grouped by similar heights
3. **2D Bin Packing**: Bottom-left heuristic for item placement
4. **Orientation Testing**: Tests both normal and rotated orientations
5. **Weight Management**: Ensures weight limits are respected
6. **Height Constraints**: Validates total height doesn't exceed maximum

### Freight Classification

Automatically calculates freight class based on density:
- Density = Weight (lbs) / Volume (cubic feet)
- Classes range from 50 (densest) to 500 (least dense)

## Data Persistence

All data (SKUs, companies, customers) is stored in browser LocalStorage:
- Data persists between sessions
- No server required
- Data stays on your device
- Export important data regularly for backup

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

Modern browsers with ES6+ support required.

## Building for Production

```bash
npm run build
```

Output will be in the `dist` folder, ready for deployment to any static hosting service.

## Project Structure

```
pallet-planner/
├── src/
│   ├── components/
│   │   ├── CompanyManagement.tsx
│   │   ├── CustomerManagement.tsx
│   │   ├── PalletPlanner.tsx
│   │   ├── PalletVisualization.tsx
│   │   └── SKULibrary.tsx
│   ├── utils/
│   │   ├── exportUtils.ts
│   │   ├── palletOptimizer.ts
│   │   └── storage.ts
│   ├── types.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## Future Enhancements

Potential features for future versions:
- Cloud storage and sync
- Multi-user support
- Print preview
- 3D visualization
- Load optimization suggestions
- Historical order tracking
- Template management
- Barcode scanning integration

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or contributions, please open an issue on the GitHub repository.

---

**Built with ❤️ for logistics professionals**
