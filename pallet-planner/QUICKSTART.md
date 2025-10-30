# Quick Start Guide

## Getting Started in 5 Minutes

### 1. Installation & Setup (1 minute)

```bash
cd pallet-planner
npm install
npm run dev
```

Open your browser to `http://localhost:5173`

### 2. Add Your First SKU (1 minute)

1. Click on the **"SKU Library"** tab
2. Click **"Add SKU"** button
3. Fill in the form:
   - Name: "Box A"
   - Length: 12 inches
   - Width: 10 inches
   - Height: 8 inches
   - Weight: 15 lbs
   - Pack Type: "Box"
4. Click **"Add SKU"**

Add a few more SKUs with different sizes.

### 3. Add a Company (30 seconds)

1. Click on the **"Companies"** tab
2. Click **"Add Company"**
3. Fill in your company details
4. Click **"Add Company"**

### 4. Add a Customer (30 seconds)

1. Click on the **"Customers"** tab
2. Click **"Add Customer"**
3. Fill in customer details
4. Click **"Add Customer"**

### 5. Create Your First Pallet Plan (2 minutes)

1. Click on the **"Pallet Planner"** tab
2. Fill in order information:
   - Select your company
   - Select your customer
   - Enter PO Number (e.g., "PO12345")
   - Leave the date as today
3. Add items:
   - Select a SKU from dropdown
   - Enter quantity (e.g., 50)
   - Choose "each" or "case"
   - Click **"Add"**
   - Repeat for other SKUs
4. Click **"Calculate Pallet Plan"**

### 6. View Results

You'll see:
- ✅ Summary with total pallets, weight, and dimensions
- ✅ Detailed breakdown table
- ✅ Layer-by-layer visualizations
- ✅ Freight classification

### 7. Export Your Plan

Click any export button:
- **PDF** - For printing and sharing
- **XLSX** - For Excel
- **CSV** - For data analysis
- **JSON** - For systems integration
- **TXT** - For simple text view

## Tips for Best Results

### SKU Entry
- Be accurate with dimensions (in inches)
- Enter weight in pounds
- Use consistent naming

### Pallet Configuration
- Standard pallet: 48" × 40"
- Euro pallet: 48" × 48"
- Custom sizes: Any dimensions work!
- Max height: Usually 72" (6 feet)
- Max weight: 2000 lbs (typical truck limit)

### Order Planning
- Add items from largest to smallest
- Mix different SKUs for variety
- System automatically optimizes placement
- All items will be placed (no leftovers!)

## Common Use Cases

### Scenario 1: Single SKU Pallet
Perfect for bulk shipments of one product.
1. Add one SKU multiple times
2. System creates layers automatically
3. Export for warehouse team

### Scenario 2: Mixed Pallet
Multiple products going to one customer.
1. Add various SKUs
2. System optimizes placement
3. View layer-by-layer how items are arranged

### Scenario 3: Complex Order
Multiple pallets with different items.
1. Add all items to order
2. System splits across pallets
3. Each pallet optimized separately
4. Export complete pack sheet

## Keyboard Shortcuts

- `Tab` - Navigate between fields
- `Enter` - Submit forms
- `Esc` - Close modals

## Data Management

### Backup Your Data
Export your SKU library periodically:
1. Go to SKU Library
2. Use browser's developer tools
3. Console: `localStorage.getItem('palletPlanner_skus')`
4. Copy and save

### Clear All Data
To start fresh:
```javascript
// In browser console
localStorage.clear()
```

Then refresh the page.

## Troubleshooting

### Items Won't Fit
- Check pallet dimensions
- Verify item dimensions are correct
- Increase max height if needed
- Check max weight limit

### Export Not Working
- Check browser allows downloads
- Try different export format
- Ensure popup blocker is off

### Data Not Saving
- Check browser supports LocalStorage
- Check available storage space
- Try different browser

## Next Steps

1. **Build Your SKU Library**: Add all your products
2. **Set Up Customers**: Import your customer list
3. **Create Templates**: Save common configurations
4. **Train Your Team**: Share this guide with colleagues
5. **Provide Feedback**: Report issues or suggestions

## Support

For help:
1. Check the full README.md
2. Review FEATURES.md for detailed capabilities
3. Open an issue on GitHub
4. Contact support

---

**Happy Pallet Planning! 📦**
