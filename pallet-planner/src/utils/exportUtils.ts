import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { Order, PackingResult, Pallet } from '../types';

export class ExportUtils {
  private order: Order;
  private result: PackingResult;

  constructor(order: Order, result: PackingResult) {
    this.order = order;
    this.result = result;
  }

  private getFilename(extension: string): string {
    const poNumber = this.order.poNumber.replace(/[^a-zA-Z0-9]/g, '_');
    const customer = this.order.customer.name.replace(/[^a-zA-Z0-9]/g, '_');
    const date = this.order.date;
    return `${poNumber}_${customer}_${date}_pallet_plan.${extension}`;
  }

  exportPDF(): void {
    const doc = new jsPDF() as any;
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.text('Pallet Planning Sheet', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Company Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Company Information', 20, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`${this.order.company.name}`, 20, yPos);
    yPos += 5;
    doc.text(`${this.order.company.address}`, 20, yPos);
    yPos += 5;
    doc.text(`${this.order.company.city}, ${this.order.company.state} ${this.order.company.zip}`, 20, yPos);
    yPos += 10;

    // Customer Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Customer Information', 20, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`${this.order.customer.name}`, 20, yPos);
    yPos += 5;
    doc.text(`${this.order.customer.address}`, 20, yPos);
    yPos += 5;
    doc.text(`${this.order.customer.city}, ${this.order.customer.state} ${this.order.customer.zip}`, 20, yPos);
    yPos += 10;

    // Order Details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Order Details', 20, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`PO Number: ${this.order.poNumber}`, 20, yPos);
    yPos += 5;
    doc.text(`Date: ${this.formatDate(this.order.date)}`, 20, yPos);
    yPos += 10;

    // Pallet Summary
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Pallet Summary', 20, yPos);
    yPos += 7;

    // Table data
    const tableData = this.result.pallets.map((pallet) => {
      const skus = this.getPalletSKUs(pallet);
      return [
        `Pallet ${pallet.id}`,
        skus,
        `${pallet.totalHeight.toFixed(1)}"`,
        `${pallet.totalWeight.toFixed(1)} ${this.order.weightUnit}`,
        pallet.freightClass || 'N/A'
      ];
    });

    autoTable(doc, {
      head: [['Pallet', 'SKUs', 'Height', 'Weight', 'Freight Class']],
      body: tableData,
      startY: yPos,
      theme: 'grid',
      headStyles: { fillColor: [234, 179, 8], textColor: [0, 0, 0] },
      styles: { fontSize: 9 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Grand Total
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Grand Total', 20, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total Pallets: ${this.result.totalPallets}`, 20, yPos);
    yPos += 5;
    doc.text(`Total Weight: ${this.result.totalWeight.toFixed(1)} ${this.order.weightUnit}`, 20, yPos);

    doc.save(this.getFilename('pdf'));
  }

  exportTXT(): void {
    let content = '═══════════════════════════════════════════════════════════\n';
    content += '                   PALLET PLANNING SHEET                    \n';
    content += '═══════════════════════════════════════════════════════════\n\n';

    content += 'COMPANY INFORMATION\n';
    content += '───────────────────────────────────────────────────────────\n';
    content += `${this.order.company.name}\n`;
    content += `${this.order.company.address}\n`;
    content += `${this.order.company.city}, ${this.order.company.state} ${this.order.company.zip}\n\n`;

    content += 'CUSTOMER INFORMATION\n';
    content += '───────────────────────────────────────────────────────────\n';
    content += `${this.order.customer.name}\n`;
    content += `${this.order.customer.address}\n`;
    content += `${this.order.customer.city}, ${this.order.customer.state} ${this.order.customer.zip}\n\n`;

    content += 'ORDER DETAILS\n';
    content += '───────────────────────────────────────────────────────────\n';
    content += `PO Number: ${this.order.poNumber}\n`;
    content += `Date: ${this.formatDate(this.order.date)}\n\n`;

    content += 'PALLET BREAKDOWN\n';
    content += '═══════════════════════════════════════════════════════════\n\n';

    this.result.pallets.forEach(pallet => {
      content += `PALLET ${pallet.id}\n`;
      content += '-----------------------------------------------------------\n';
      
      const skuMap = new Map<string, number>();
      pallet.layers.forEach(layer => {
        layer.items.forEach(item => {
          const current = skuMap.get(item.sku.id) || 0;
          skuMap.set(item.sku.id, current + item.quantity);
        });
      });

      skuMap.forEach((qty, skuId) => {
        const sku = this.findSKU(skuId);
        if (sku) {
          content += `  ${sku.name} (${sku.id}): ${qty} units\n`;
          content += `    Dimensions: ${sku.length}" × ${sku.width}" × ${sku.height}"\n`;
          content += `    Weight: ${sku.weight} ${this.order.weightUnit} each\n`;
        }
      });

      content += `\n  Total Height: ${pallet.totalHeight.toFixed(1)}"\n`;
      content += `  Total Weight: ${pallet.totalWeight.toFixed(1)} ${this.order.weightUnit}\n`;
      content += `  Freight Class: ${pallet.freightClass || 'N/A'}\n\n`;
    });

    content += '═══════════════════════════════════════════════════════════\n';
    content += 'GRAND TOTAL\n';
    content += '═══════════════════════════════════════════════════════════\n';
    content += `Total Pallets: ${this.result.totalPallets}\n`;
    content += `Total Weight: ${this.result.totalWeight.toFixed(1)} ${this.order.weightUnit}\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, this.getFilename('txt'));
  }

  exportJSON(): void {
    const data = {
      order: {
        poNumber: this.order.poNumber,
        date: this.formatDate(this.order.date),
        company: this.order.company,
        customer: this.order.customer,
        recipient: this.order.recipient
      },
      pallets: this.result.pallets.map(pallet => ({
        id: pallet.id,
        layers: pallet.layers.map(layer => ({
          height: layer.height,
          weight: layer.weight,
          items: layer.items.map(item => ({
            sku: item.sku,
            quantity: item.quantity,
            position: { x: item.x, y: item.y },
            dimensions: { width: item.width, length: item.length },
            rotated: item.rotated
          }))
        })),
        totalHeight: pallet.totalHeight,
        totalWeight: pallet.totalWeight,
        freightClass: pallet.freightClass
      })),
      summary: {
        totalPallets: this.result.totalPallets,
        totalWeight: this.result.totalWeight,
        weightUnit: this.order.weightUnit
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json;charset=utf-8' 
    });
    saveAs(blob, this.getFilename('json'));
  }

  exportXLSX(): void {
    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['Pallet Planning Sheet'],
      [],
      ['Company Information'],
      ['Name', this.order.company.name],
      ['Address', this.order.company.address],
      ['City', this.order.company.city],
      ['State', this.order.company.state],
      ['ZIP', this.order.company.zip],
      [],
      ['Customer Information'],
      ['Name', this.order.customer.name],
      ['Address', this.order.customer.address],
      ['City', this.order.customer.city],
      ['State', this.order.customer.state],
      ['ZIP', this.order.customer.zip],
      [],
      ['Order Details'],
      ['PO Number', this.order.poNumber],
      ['Date', this.formatDate(this.order.date)],
      [],
      ['Summary'],
      ['Total Pallets', this.result.totalPallets],
      ['Total Weight', `${this.result.totalWeight.toFixed(1)} ${this.order.weightUnit}`]
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Pallets Sheet
    const palletsData = [
      ['Pallet ID', 'SKU', 'Quantity', 'Height (in)', 'Weight', 'Freight Class']
    ];

    this.result.pallets.forEach(pallet => {
      const skuMap = new Map<string, number>();
      pallet.layers.forEach(layer => {
        layer.items.forEach(item => {
          const current = skuMap.get(item.sku.id) || 0;
          skuMap.set(item.sku.id, current + item.quantity);
        });
      });

      let firstRow = true;
      skuMap.forEach((qty, skuId) => {
        const sku = this.findSKU(skuId);
        if (sku) {
          palletsData.push([
            firstRow ? `Pallet ${pallet.id}` : '',
            `${sku.name} (${sku.id})`,
            String(qty),
            firstRow ? pallet.totalHeight.toFixed(1) : '',
            firstRow ? `${pallet.totalWeight.toFixed(1)} ${this.order.weightUnit}` : '',
            firstRow ? pallet.freightClass || 'N/A' : ''
          ]);
          firstRow = false;
        }
      });
    });

    const palletsSheet = XLSX.utils.aoa_to_sheet(palletsData);
    XLSX.utils.book_append_sheet(workbook, palletsSheet, 'Pallets');

    XLSX.writeFile(workbook, this.getFilename('xlsx'));
  }

  exportCSV(): void {
    const headers = ['Pallet ID', 'SKU', 'Quantity', 'Height (in)', 'Weight', 'Freight Class'];
    const rows = [headers];

    this.result.pallets.forEach(pallet => {
      const skuMap = new Map<string, number>();
      pallet.layers.forEach(layer => {
        layer.items.forEach(item => {
          const current = skuMap.get(item.sku.id) || 0;
          skuMap.set(item.sku.id, current + item.quantity);
        });
      });

      let firstRow = true;
      skuMap.forEach((qty, skuId) => {
        const sku = this.findSKU(skuId);
        if (sku) {
          rows.push([
            firstRow ? `Pallet ${pallet.id}` : '',
            `${sku.name} (${sku.id})`,
            String(qty),
            firstRow ? pallet.totalHeight.toFixed(1) : '',
            firstRow ? `${pallet.totalWeight.toFixed(1)} ${this.order.weightUnit}` : '',
            firstRow ? pallet.freightClass || 'N/A' : ''
          ]);
          firstRow = false;
        }
      });
    });

    const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, this.getFilename('csv'));
  }

  private formatDate(mmddyyyy: string): string {
    if (mmddyyyy.length !== 8) return mmddyyyy;
    const month = mmddyyyy.substring(0, 2);
    const day = mmddyyyy.substring(2, 4);
    const year = mmddyyyy.substring(4, 8);
    return `${month}/${day}/${year}`;
  }

  private getPalletSKUs(pallet: Pallet): string {
    const skuMap = new Map<string, number>();
    pallet.layers.forEach(layer => {
      layer.items.forEach(item => {
        const current = skuMap.get(item.sku.id) || 0;
        skuMap.set(item.sku.id, current + item.quantity);
      });
    });

    const skuList: string[] = [];
    skuMap.forEach((qty, skuId) => {
      const sku = this.findSKU(skuId);
      if (sku) {
        skuList.push(`${sku.name} (${qty})`);
      }
    });

    return skuList.join(', ');
  }

  private findSKU(skuId: string) {
    for (const item of this.order.items) {
      if (item.sku.id === skuId) {
        return item.sku;
      }
    }
    return null;
  }
}
