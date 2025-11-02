import type {
  OrderItem,
  Pallet,
  PalletSize,
  Layer,
  PlacedItem,
  WeightUnit,
  SKU
} from '../types';

interface Position {
  x: number;
  y: number;
}

interface OrientationOption {
  length: number;
  width: number;
  height: number;
  footprintArea: number;
}

interface PackingItem {
  sku: SKU;
  unitType: OrderItem['unitType'];
  remaining: number;
  orientations: OrientationOption[];
  weight: number;
}

interface LayerCandidate {
  layer: Layer;
  usage: Map<string, number>;
  areaUsed: number;
  efficiency: number;
  wasteVolume: number;
  weightBase: number;
  perfectFit: boolean;
  perfectlyDivisible: boolean;
}

interface LayerQueueItem {
  sku: SKU;
  unitType: OrderItem['unitType'];
  weight: number;
  remaining: number;
  orientationOptions: OrientationOption[];
  maxArea: number;
}

const EPSILON = 1e-6;
const HEIGHT_TOLERANCE = 1e-3;

export class PalletOptimizer {
  private palletSize: PalletSize;
  private maxHeight: number;
  private maxWeightBase: number;
  private weightUnit: WeightUnit;
  private palletArea: number;

  constructor(
    palletSize: PalletSize,
    maxHeight: number,
    maxWeight: number,
    weightUnit: WeightUnit = 'lbs'
  ) {
    this.palletSize = palletSize;
    this.maxHeight = maxHeight;
    this.weightUnit = weightUnit;
    this.maxWeightBase = this.toBaseWeight(maxWeight);
    this.palletArea = this.palletSize.length * this.palletSize.width;

    if (this.maxHeight <= 0) {
      throw new Error('Max pallet height must be greater than zero.');
    }

    if (this.maxWeightBase <= 0) {
      throw new Error('Max pallet weight must be greater than zero.');
    }
  }

  /**
   * Main optimization function - packs items into pallets with zero leftovers.
   */
  optimize(items: OrderItem[]): Pallet[] {
    const inventory = this.initializeInventory(items);
    const pallets: Pallet[] = [];
    let palletId = 1;

    while (this.hasRemaining(inventory)) {
      const pallet = this.buildPallet(inventory, palletId++);

      if (pallet.layers.length === 0) {
        const blockingItem = this.getFirstRemainingItem(inventory);
        const sku = blockingItem?.sku;
        const message = sku
          ? `Unable to pack SKU "${sku.name}" (${sku.id}) on the pallet. Check pallet dimensions or weight limits.`
          : 'Unable to pack remaining items on the pallet. Check pallet configuration.';
        console.warn(message);
        throw new Error(message);
      }

      pallets.push(pallet);
    }

    return pallets;
  }

  /**
   * Prepare working inventory and validate that each SKU can fit on the pallet footprint.
   */
  private initializeInventory(items: OrderItem[]): PackingItem[] {
    const inventory: PackingItem[] = [];

    items.forEach(item => {
      if (item.quantity <= 0) {
        return;
      }

      const orientations = this.generateOrientationOptions(item.sku);

      if (orientations.length === 0) {
        const message = `SKU "${item.sku.name}" (${item.sku.id}) exceeds pallet dimensions.`;
        console.warn(message);
        throw new Error(message);
      }

      inventory.push({
        sku: item.sku,
        unitType: item.unitType,
        remaining: item.quantity,
        orientations,
        weight: item.sku.weight
      });
    });

    return inventory;
  }

  /**
   * Build a single pallet layer by layer until height or weight limits are reached.
   */
  private buildPallet(inventory: PackingItem[], palletId: number): Pallet {
    const layers: Layer[] = [];
    let currentHeight = 0;
    let currentWeightInput = 0;
    let currentWeightBase = 0;

    while (this.hasRemaining(inventory)) {
      const remainingHeight = this.maxHeight - currentHeight;
      const remainingWeightBase = this.maxWeightBase - currentWeightBase;

      if (remainingHeight <= HEIGHT_TOLERANCE || remainingWeightBase <= EPSILON) {
        break;
      }

      const nextLayer = this.selectNextLayer(
        inventory,
        remainingHeight,
        remainingWeightBase
      );

      if (!nextLayer) {
        break;
      }

      layers.push(nextLayer.layer);
      currentHeight += nextLayer.layer.height;
      currentWeightInput += nextLayer.layer.weight;
      currentWeightBase += nextLayer.weightBase;

      nextLayer.usage.forEach((count, skuId) => {
        const inventoryItem = inventory.find(item => item.sku.id === skuId);
        if (inventoryItem) {
          inventoryItem.remaining = Math.max(0, inventoryItem.remaining - count);
        }
      });
    }

    return {
      id: palletId,
      layers,
      totalHeight: currentHeight,
      totalWeight: currentWeightInput,
      palletSize: this.palletSize,
      freightClass: this.calculateFreightClass(currentWeightInput, currentHeight)
    };
  }

  /**
   * Select the next optimal layer according to the optimization hierarchy.
   */
  private selectNextLayer(
    inventory: PackingItem[],
    maxHeightRemaining: number,
    maxWeightRemainingBase: number
  ): LayerCandidate | null {
    if (maxWeightRemainingBase <= EPSILON) {
      return null;
    }

    const heightMap = new Map<number, number>();

    inventory.forEach(item => {
      if (item.remaining <= 0) return;

      item.orientations.forEach(option => {
        if (option.height <= maxHeightRemaining + HEIGHT_TOLERANCE) {
          const key = this.normalizeHeight(option.height);
          if (!heightMap.has(key)) {
            heightMap.set(key, option.height);
          }
        }
      });
    });

    if (heightMap.size === 0) {
      return null;
    }

    const candidates: LayerCandidate[] = [];

    heightMap.forEach(heightValue => {
      const candidate = this.packLayerForHeight(
        inventory,
        heightValue,
        maxHeightRemaining,
        maxWeightRemainingBase
      );

      if (candidate) {
        candidates.push(candidate);
      }
    });

    if (candidates.length === 0) {
      return null;
    }

    const perfectlyDivisible = candidates.filter(candidate => candidate.perfectlyDivisible);
    if (perfectlyDivisible.length > 0) {
      return this.pickBestCandidate(perfectlyDivisible);
    }

    const perfectFits = candidates.filter(candidate => candidate.perfectFit);
    if (perfectFits.length > 0) {
      return this.pickBestCandidate(perfectFits);
    }

    return this.pickBestCandidate(candidates);
  }

  /**
   * Attempt to pack a layer using a specific target height.
   */
  private packLayerForHeight(
    inventory: PackingItem[],
    layerHeight: number,
    maxHeightRemaining: number,
    maxWeightRemainingBase: number
  ): LayerCandidate | null {
    const queue: LayerQueueItem[] = inventory
      .filter(item => item.remaining > 0)
      .map(item => {
        const options = item.orientations.filter(option =>
          Math.abs(option.height - layerHeight) <= HEIGHT_TOLERANCE
        );

        if (options.length === 0) {
          return null;
        }

        const maxArea = Math.max(...options.map(option => option.footprintArea));

        return {
          sku: item.sku,
          unitType: item.unitType,
          weight: item.weight,
          remaining: item.remaining,
          orientationOptions: options,
          maxArea
        } satisfies LayerQueueItem;
      })
      .filter((queueItem): queueItem is LayerQueueItem => queueItem !== null);

    if (queue.length === 0) {
      return null;
    }

    queue.sort((a, b) => b.maxArea - a.maxArea);

    const grid = this.createGrid();
    const placedItems: PlacedItem[] = [];
    const usage = new Map<string, number>();
    let areaUsed = 0;
    let layerWeightInput = 0;
    let layerWeightBase = 0;

    const totalArea = this.palletArea;

    for (const candidate of queue) {
      const skuWeightBase = this.toBaseWeight(candidate.weight);

      if (skuWeightBase <= 0) {
        continue;
      }

      const sortedOptions = [...candidate.orientationOptions].sort(
        (a, b) => b.footprintArea - a.footprintArea
      );

      while (candidate.remaining > 0) {
        if (layerWeightBase + skuWeightBase > maxWeightRemainingBase + EPSILON) {
          break;
        }

        const placement = this.findPlacementForOptions(grid, sortedOptions);

        if (!placement) {
          break;
        }

        const { option, position } = placement;
        const placedLength = position.rotated ? option.width : option.length;
        const placedWidth = position.rotated ? option.length : option.width;

        const placed: PlacedItem = {
          sku: candidate.sku,
          quantity: 1,
          x: position.x,
          y: position.y,
          width: placedWidth,
          length: placedLength,
          rotated: position.rotated
        };

        placedItems.push(placed);
        areaUsed += placedLength * placedWidth;
        layerWeightInput += candidate.weight;
        layerWeightBase += skuWeightBase;

        usage.set(
          candidate.sku.id,
          (usage.get(candidate.sku.id) ?? 0) + 1
        );

        this.markGridOccupied(grid, position.x, position.y, placedLength, placedWidth);

        candidate.remaining -= 1;
      }
    }

    if (placedItems.length === 0) {
      return null;
    }

    const efficiency = Math.min(1, areaUsed / totalArea);
    const wasteVolume = Math.max(0, (totalArea - areaUsed) * layerHeight);
    const perfectFit = Math.abs(areaUsed - totalArea) <= EPSILON;
    const perfectlyDivisible =
      perfectFit && this.isDivisible(maxHeightRemaining, layerHeight);

    const layer: Layer = {
      items: placedItems,
      height: layerHeight,
      weight: layerWeightInput
    };

    return {
      layer,
      usage,
      areaUsed,
      efficiency,
      wasteVolume,
      weightBase: layerWeightBase,
      perfectFit,
      perfectlyDivisible
    };
  }

  /**
   * Determine the most suitable candidate layer based on efficiency and waste.
   */
  private pickBestCandidate(candidates: LayerCandidate[]): LayerCandidate {
    return [...candidates].sort((a, b) => {
      if (Math.abs(a.efficiency - b.efficiency) > EPSILON) {
        return b.efficiency - a.efficiency;
      }

      if (Math.abs(a.wasteVolume - b.wasteVolume) > EPSILON) {
        return a.wasteVolume - b.wasteVolume;
      }

      if (Math.abs(a.layer.height - b.layer.height) > HEIGHT_TOLERANCE) {
        return b.layer.height - a.layer.height;
      }

      return b.weightBase - a.weightBase;
    })[0];
  }

  /**
   * Attempt to position a SKU using any of its orientation options.
   */
  private findPlacementForOptions(
    grid: boolean[][],
    options: OrientationOption[]
  ): { option: OrientationOption; position: Position & { rotated: boolean } } | null {
    for (const option of options) {
      const position = this.findBestPosition(grid, option.length, option.width);
      if (position) {
        return { option, position };
      }
    }

    return null;
  }

  /**
   * Generate all viable orientation options for a SKU.
   */
  private generateOrientationOptions(sku: SKU): OrientationOption[] {
    const dimensions = [sku.length, sku.width, sku.height];
    const permutations: Array<[number, number, number]> = [
      [dimensions[0], dimensions[1], dimensions[2]],
      [dimensions[0], dimensions[2], dimensions[1]],
      [dimensions[1], dimensions[0], dimensions[2]],
      [dimensions[1], dimensions[2], dimensions[0]],
      [dimensions[2], dimensions[0], dimensions[1]],
      [dimensions[2], dimensions[1], dimensions[0]]
    ];

    const unique = new Map<string, OrientationOption>();

    permutations.forEach(([length, width, height]) => {
      if (height > this.maxHeight + HEIGHT_TOLERANCE) {
        return;
      }

      const fitsFootprint =
        (length <= this.palletSize.length + EPSILON &&
          width <= this.palletSize.width + EPSILON) ||
        (width <= this.palletSize.length + EPSILON &&
          length <= this.palletSize.width + EPSILON);

      if (!fitsFootprint) {
        return;
      }

      const key = `${length.toFixed(3)}:${width.toFixed(3)}:${height.toFixed(3)}`;

      if (!unique.has(key)) {
        unique.set(key, {
          length,
          width,
          height,
          footprintArea: length * width
        });
      }
    });

    return Array.from(unique.values());
  }

  /**
   * Determine if the remaining height can be perfectly divided by the layer height.
   */
  private isDivisible(totalHeight: number, layerHeight: number): boolean {
    if (layerHeight <= HEIGHT_TOLERANCE) {
      return false;
    }

    const quotient = totalHeight / layerHeight;
    return Math.abs(quotient - Math.round(quotient)) <= HEIGHT_TOLERANCE;
  }

  private normalizeHeight(value: number): number {
    return Math.round(value / HEIGHT_TOLERANCE) * HEIGHT_TOLERANCE;
  }

  private hasRemaining(inventory: PackingItem[]): boolean {
    return inventory.some(item => item.remaining > 0);
  }

  private getFirstRemainingItem(inventory: PackingItem[]): PackingItem | undefined {
    return inventory.find(item => item.remaining > 0);
  }

  private createGrid(): boolean[][] {
    return Array.from({ length: Math.ceil(this.palletSize.length) }, () =>
      Array(Math.ceil(this.palletSize.width)).fill(false)
    );
  }

  /**
   * Find best position for item using bottom-left heuristic.
   */
  private findBestPosition(
    grid: boolean[][],
    length: number,
    width: number
  ): (Position & { rotated: boolean }) | null {
    let position = this.findPosition(grid, length, width);
    if (position) {
      return { ...position, rotated: false };
    }

    position = this.findPosition(grid, width, length);
    if (position) {
      return { ...position, rotated: true };
    }

    return null;
  }

  /**
   * Find position for item with given dimensions.
   */
  private findPosition(
    grid: boolean[][],
    length: number,
    width: number
  ): Position | null {
    if (
      length > this.palletSize.length + EPSILON ||
      width > this.palletSize.width + EPSILON
    ) {
      return null;
    }

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
   * Check if item can be placed at position.
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
   * Mark grid cells as occupied.
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
   * Convert input weight to pounds for internal calculations.
   */
  private toBaseWeight(weight: number): number {
    if (this.weightUnit === 'lbs') {
      return weight;
    }

    // kg to lbs
    return weight * 2.20462;
  }

  /**
   * Calculate freight class based on density.
   */
  private calculateFreightClass(weightInputUnits: number, height: number): string {
    const weightLbs = this.weightUnit === 'lbs'
      ? weightInputUnits
      : this.toBaseWeight(weightInputUnits);

    const volume =
      (this.palletSize.length * this.palletSize.width * Math.max(height, EPSILON)) /
      1728; // cubic feet
    const density = weightLbs / volume;

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
