# Pallet Planner - Feature Documentation

## Implemented Features

### ✅ Data Management

#### SKU Library
- **Add/Edit/Delete SKUs**: Full CRUD operations for SKU management
- **SKU Properties**:
  - Unique ID (auto-generated)
  - Name and description
  - Dimensions: Length × Width × Height (inches)
  - Weight (lbs)
  - Pack type (Box, Pallet, Crate, etc.)
- **Persistent Storage**: All SKUs saved in browser LocalStorage
- **Visual Table**: Easy-to-read table with all SKU details
- **Search & Select**: Quick selection when creating orders

#### Company Management
- **Multiple Companies**: Support for multiple warehouses/locations
- **Company Details**:
  - Name and unique ID
  - Full address (street, city, state, ZIP)
  - Contact information (phone, email)
- **Card View**: Visual cards showing all company information
- **Edit/Delete**: Easy management of company records

#### Customer Management
- **Customer Database**: Store and manage customer information
- **Auto-Detection**: System can identify existing customers
- **Customer Details**:
  - Name and unique ID
  - Shipping address
  - Contact information
- **Quick Selection**: Dropdown selection in order creation
- **Persistent Storage**: All data saved locally

### ✅ Pallet Optimization Algorithm

#### Core Algorithm Features
- **Height-First Optimization**: Prioritizes height as primary constraint
- **2D Layer-Aware Placement**: Optimizes each layer independently
- **Bottom-Left Heuristic**: Efficient bin packing algorithm
- **Automatic Rotation**: Tests both orientations for best fit
- **Weight Management**: Respects maximum weight per pallet
- **Multi-Layer Stacking**: Automatically groups by height

#### Placement Strategy
1. Sort items by height (descending)
2. Group items by similar heights
3. For each layer:
   - Use 2D bin packing
   - Test both orientations
   - Place items using bottom-left algorithm
   - Track occupied space on grid
4. Respect weight and height constraints
5. Create new pallet when needed

#### Optimization Goals
- ✅ Zero leftover items (all items placed)
- ✅ Minimize number of pallets
- ✅ Maximize space utilization
- ✅ Respect all constraints
- ✅ Efficient layer stacking

### ✅ User Interface

#### Modern Design
- **Color Scheme**: White, yellow (primary), and black
- **Responsive Layout**: Works on desktop and tablets
- **Clean Typography**: Easy to read, professional appearance
- **Intuitive Navigation**: Tab-based interface
- **Form Validation**: Prevents invalid data entry

#### Components
1. **Header**: Branding and application title
2. **Navigation Tabs**:
   - Pallet Planner
   - SKU Library
   - Companies
   - Customers
3. **Forms**: Clean, well-organized input forms
4. **Tables**: Sortable, readable data tables
5. **Modals**: Popup forms for add/edit operations
6. **Visualizations**: Layer-by-layer pallet views

### ✅ Layer-by-Layer Visualization

#### Visual Features
- **SVG-Based Rendering**: Scalable, high-quality graphics
- **Top-Down View**: 2D view of each layer
- **Color Coding**: Different colors for different SKUs
- **Grid Reference**: Grid lines for scale
- **Item Labels**: SKU names on each item
- **Rotation Indicator**: Shows when items are rotated
- **Pallet Base**: Visual representation of pallet

#### Layer Information
- Layer number
- Layer height
- Layer weight
- Items list with quantities
- Color legend

### ✅ Detailed Outputs

#### Summary Statistics
- Total number of pallets
- Total weight (lbs or kg)
- Average pallet height
- Grand totals

#### Pallet Breakdown Table
- Pallet ID
- Number of layers
- Total height (inches)
- Total weight
- Freight classification
- SKU details per pallet

#### Order Information
- PO Number
- Order date (MMDDYYYY format)
- Company details
- Customer details
- Recipient information

### ✅ Export Functionality

#### Supported Formats (Alphabetical)
1. **CSV** - Comma-separated values
   - Compatible with Excel and spreadsheets
   - Simple tabular format
   
2. **JSON** - Structured data
   - Complete order and pallet data
   - API-friendly format
   - Includes layer details and positions
   
3. **PDF** - Professional documents
   - Company letterhead style
   - Tables with pallet breakdown
   - Summary statistics
   - Print-ready format
   
4. **TXT** - Plain text report
   - Human-readable format
   - Detailed breakdown
   - ASCII-art boxes
   
5. **XLSX** - Excel workbook
   - Multiple sheets
   - Summary sheet
   - Detailed pallet sheet
   - Formatted tables

#### Filename Convention
Format: `PO#_Customer_MMDDYYYY_pallet_plan.{ext}`

Example: `PO12345_ACME_10302025_pallet_plan.pdf`

### ✅ Configuration Options

#### Pallet Settings
- **Standard Sizes**: 48"×40" (default), 48"×48", 40"×48"
- **Custom Sizes**: Any dimensions supported
- **Max Height**: Configurable (default: 72")
- **Max Weight**: Configurable (default: 2000 lbs)
- **Weight Units**: lbs or kg

#### Order Settings
- PO number (required)
- Order date (auto-filled, editable)
- Company selection (required)
- Customer selection (required)

#### Item Configuration
- SKU selection
- Quantity (1+)
- Unit type: "each" or "case"

### ✅ Freight Classification

Automatic calculation based on density:
- Density = Weight (lbs) / Volume (cubic feet)
- Classes: 50, 55, 60, 65, 70, 77.5, 85, 92.5, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500

### ✅ Data Persistence

- **LocalStorage**: All data saved in browser
- **Automatic Saving**: No manual save required
- **Session Persistence**: Data survives page refresh
- **Export Options**: Backup data via export

## Technical Implementation

### Technologies Used
- React 19 with TypeScript
- Vite (build tool)
- Tailwind CSS v4
- jsPDF (PDF generation)
- XLSX (Excel files)
- File-saver (downloads)
- Lucide React (icons)

### Architecture
- **Component-Based**: Modular, reusable components
- **Type-Safe**: Full TypeScript implementation
- **Utility Classes**: Separate business logic
- **Local State**: React hooks for state management
- **Browser Storage**: LocalStorage API

### Code Quality
- TypeScript for type safety
- ESLint for code quality
- Modular component structure
- Clean, readable code
- Comprehensive comments

## Browser Support
- Chrome (recommended)
- Firefox
- Safari
- Edge
- Modern browsers with ES6+ support

## Performance
- Fast rendering with React
- Efficient algorithms
- Optimized builds
- Small bundle size (compressed)
- No external API calls

## Security & Privacy
- All data stored locally
- No server communication
- No user tracking
- No external dependencies for data
- Complete privacy

## Future Enhancement Ideas
- 3D visualization
- Cloud storage sync
- Multi-user collaboration
- Barcode scanning
- Template system
- Historical analytics
- Mobile app
- API integration
