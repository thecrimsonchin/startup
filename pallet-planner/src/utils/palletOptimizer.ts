import type { OrderItem, Pallet, PalletSize, Layer, PlacedItem } from '../types';

interface Position {
  x: number;
  y: number;
}

export class PalletOptimizer {
  private palletSize: PalletSize;
  private maxHeight: number;
  private maxWeight: number;

  constructor(palletSize: PalletSize, maxHeight: number, maxWeight: number) {
    this.palletSize = palletSize;
    this.maxHeight = maxHeight;
    this.maxWeight = maxWeight;
  }

  /**
   * Main optimization function - packs items into pallets
   */
  optimize(items: OrderItem[]): Pallet[] {
    const pallets: Pallet[] = [];
    let palletId = 1;
    
    // Expand items into individual units
    const expandedItems = this.expandItems(items);
    
    // Sort by height (descending) for optimal stacking
    expandedItems.sort((a, b) => b.sku.height - a.sku.height);

    while (expandedItems.length > 0) {
      const pallet = this.packPallet(expandedItems, palletId++);
      pallets.push(pallet);
      
      // Remove packed items
      pallet.layers.forEach(layer => {
        layer.items.forEach(placedItem => {
          const index = expandedItems.findIndex(
            item => item.sku.id === placedItem.sku.id
          );
          if (index !== -1) {
            const item = expandedItems[index];
            item.quantity -= placedItem.quantity;
            if (item.quantity <= 0) {
              expandedItems.splice(index, 1);
            }
          }
        });
      });

      // Safety check to prevent infinite loops
      if (expandedItems.length > 0 && pallet.layers.length === 0) {
        console.error('Could not pack items - item too large for pallet');
        break;
      }
    }

    return pallets;
  }

  /**
   * Expand items into individual units for easier packing
   */
  private expandItems(items: OrderItem[]): OrderItem[] {
    return items.map(item => ({ ...item }));
  }

  /**
   * Pack a single pallet with layers
   */
  private packPallet(items: OrderItem[], palletId: number): Pallet {
    const layers: Layer[] = [];
    let currentHeight = 0;
    let currentWeight = 0;

    // Group items by height for layer optimization
    const heightGroups = this.groupByHeight(items);

    for (const group of heightGroups) {
      if (group.items.length === 0) continue;
      
      const layerHeight = group.height;
      
      // Check if we can add another layer
      if (currentHeight + layerHeight > this.maxHeight) {
        break;
      }

      // Try to pack items into this layer
      const layer = this.packLayer(group.items, layerHeight);
      
      if (layer.items.length === 0) continue;

      // Check weight constraint
      if (currentWeight + layer.weight > this.maxWeight) {
        // Try to pack fewer items
        const reducedLayer = this.packLayerWithWeightLimit(
          group.items,
          layerHeight,
          this.maxWeight - currentWeight
        );
        
        if (reducedLayer.items.length === 0) break;
        
        layers.push(reducedLayer);
        currentHeight += layerHeight;
        currentWeight += reducedLayer.weight;
        break; // Pallet is full
      } else {
        layers.push(layer);
        currentHeight += layerHeight;
        currentWeight += layer.weight;
        
        // Remove packed items from the group
        layer.items.forEach(placedItem => {
          const index = group.items.findIndex(
            item => item.sku.id === placedItem.sku.id
          );
          if (index !== -1) {
            const item = group.items[index];
            item.quantity -= placedItem.quantity;
            if (item.quantity <= 0) {
              group.items.splice(index, 1);
            }
          }
        });
      }
    }

    return {
      id: palletId,
      layers,
      totalHeight: currentHeight,
      totalWeight: currentWeight,
      palletSize: this.palletSize,
      freightClass: this.calculateFreightClass(currentWeight, currentHeight)
    };
  }

  /**
   * Group items by similar heights for efficient layering
   */
  private groupByHeight(items: OrderItem[]): Array<{ height: number; items: OrderItem[] }> {
    const groups = new Map<number, OrderItem[]>();

    items.forEach(item => {
      const height = item.sku.height;
      if (!groups.has(height)) {
        groups.set(height, []);
      }
      groups.get(height)!.push({ ...item });
    });

    return Array.from(groups.entries())
      .map(([height, items]) => ({ height, items }))
      .sort((a, b) => b.height - a.height);
  }

  /**
   * Pack items into a single layer using 2D bin packing
   */
  private packLayer(items: OrderItem[], layerHeight: number): Layer {
    const placedItems: PlacedItem[] = [];
    let totalWeight = 0;

    // Create a grid to track occupied spaces
    const grid: boolean[][] = Array(Math.ceil(this.palletSize.length))
      .fill(null)
      .map(() => Array(Math.ceil(this.palletSize.width)).fill(false));

    // Sort items by area (descending) for better packing
    const sortedItems = [...items].sort((a, b) => {
      const areaA = a.sku.length * a.sku.width;
      const areaB = b.sku.length * b.sku.width;
      return areaB - areaA;
    });

    for (const item of sortedItems) {
      for (let i = 0; i < item.quantity; i++) {
        const position = this.findBestPosition(
          grid,
          item.sku.length,
          item.sku.width
        );

        if (position) {
          const placed: PlacedItem = {
            sku: item.sku,
            quantity: 1,
            x: position.x,
            y: position.y,
            width: position.rotated ? item.sku.length : item.sku.width,
            length: position.rotated ? item.sku.width : item.sku.length,
            rotated: position.rotated
          };

          placedItems.push(placed);
          totalWeight += item.sku.weight;

          // Mark grid as occupied
          this.markGridOccupied(
            grid,
            position.x,
            position.y,
            placed.length,
            placed.width
          );
        } else {
          break; // Can't fit more of this item
        }
      }
    }

    return {
      items: placedItems,
      height: layerHeight,
      weight: totalWeight
    };
  }

  /**
   * Pack layer with weight limit
   */
  private packLayerWithWeightLimit(
    items: OrderItem[],
    layerHeight: number,
    maxWeight: number
  ): Layer {
    const placedItems: PlacedItem[] = [];
    let totalWeight = 0;

    const grid: boolean[][] = Array(Math.ceil(this.palletSize.length))
      .fill(null)
      .map(() => Array(Math.ceil(this.palletSize.width)).fill(false));

    const sortedItems = [...items].sort((a, b) => {
      const areaA = a.sku.length * a.sku.width;
      const areaB = b.sku.length * b.sku.width;
      return areaB - areaA;
    });

    for (const item of sortedItems) {
      for (let i = 0; i < item.quantity; i++) {
        if (totalWeight + item.sku.weight > maxWeight) {
          break;
        }

        const position = this.findBestPosition(
          grid,
          item.sku.length,
          item.sku.width
        );

        if (position) {
          const placed: PlacedItem = {
            sku: item.sku,
            quantity: 1,
            x: position.x,
            y: position.y,
            width: position.rotated ? item.sku.length : item.sku.width,
            length: position.rotated ? item.sku.width : item.sku.length,
            rotated: position.rotated
          };

          placedItems.push(placed);
          totalWeight += item.sku.weight;

          this.markGridOccupied(
            grid,
            position.x,
            position.y,
            placed.length,
            placed.width
          );
        } else {
          break;
        }
      }
    }

    return {
      items: placedItems,
      height: layerHeight,
      weight: totalWeight
    };
  }

  /**
   * Find best position for item using bottom-left heuristic
   */
  private findBestPosition(
    grid: boolean[][],
    length: number,
    width: number
  ): (Position & { rotated: boolean }) | null {
    // Try normal orientation first
    let position = this.findPosition(grid, length, width);
    if (position) {
      return { ...position, rotated: false };
    }

    // Try rotated orientation
    position = this.findPosition(grid, width, length);
    if (position) {
      return { ...position, rotated: true };
    }

    return null;
  }

  /**
   * Find position for item with given dimensions
   */
  private findPosition(
    grid: boolean[][],
    length: number,
    width: number
  ): Position | null {
    // Check if item fits on pallet
    if (length > this.palletSize.length || width > this.palletSize.width) {
      return null;
    }

    // Try to find a spot using bottom-left heuristic
    for (let x = 0; x <= this.palletSize.length - length; x++) {
      for (let y = 0; y <= this.palletSize.width - width; y++) {
        if (this.canPlaceAt(grid, x, y, length, width)) {
          return { x, y };
        }
      }
    }

    return null;
  }

  /**
   * Check if item can be placed at position
   */
  private canPlaceAt(
    grid: boolean[][],
    x: number,
    y: number,
    length: number,
    width: number
  ): boolean {
    const endX = Math.min(Math.ceil(x + length), grid.length);
    const endY = Math.min(Math.ceil(y + width), grid[0].length);

    for (let i = Math.floor(x); i < endX; i++) {
      for (let j = Math.floor(y); j < endY; j++) {
        if (grid[i][j]) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Mark grid cells as occupied
   */
  private markGridOccupied(
    grid: boolean[][],
    x: number,
    y: number,
    length: number,
    width: number
  ): void {
    const endX = Math.min(Math.ceil(x + length), grid.length);
    const endY = Math.min(Math.ceil(y + width), grid[0].length);

    for (let i = Math.floor(x); i < endX; i++) {
      for (let j = Math.floor(y); j < endY; j++) {
        grid[i][j] = true;
      }
    }
  }

  /**
   * Calculate freight class based on density
   */
  private calculateFreightClass(weight: number, height: number): string {
    // Calculate density (lbs per cubic foot)
    const volume = (this.palletSize.length * this.palletSize.width * height) / 1728; // cubic feet
    const density = weight / volume;

    if (density > 50) return 'Class 50';
    if (density > 35) return 'Class 55';
    if (density > 30) return 'Class 60';
    if (density > 22.5) return 'Class 65';
    if (density > 15) return 'Class 70';
    if (density > 13.5) return 'Class 77.5';
    if (density > 12) return 'Class 85';
    if (density > 10.5) return 'Class 92.5';
    if (density > 9) return 'Class 100';
    if (density > 8) return 'Class 110';
    if (density > 7) return 'Class 125';
    if (density > 6) return 'Class 150';
    if (density > 5) return 'Class 175';
    if (density > 4) return 'Class 200';
    if (density > 3) return 'Class 250';
    if (density > 2) return 'Class 300';
    if (density > 1) return 'Class 400';
    return 'Class 500';
  }
}
