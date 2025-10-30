import React from 'react';
import type { Pallet } from '../types';

interface PalletVisualizationProps {
  pallet: Pallet;
}

export const PalletVisualization: React.FC<PalletVisualizationProps> = ({ pallet }) => {
  const scale = 4; // pixels per inch
  const palletWidth = pallet.palletSize.width * scale;
  const palletLength = pallet.palletSize.length * scale;

  // Generate random colors for different SKUs
  const skuColors = new Map<string, string>();
  const generateColor = (skuId: string): string => {
    if (!skuColors.has(skuId)) {
      const hue = (skuColors.size * 137.5) % 360;
      skuColors.set(skuId, `hsl(${hue}, 70%, 70%)`);
    }
    return skuColors.get(skuId)!;
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900">Pallet {pallet.id} - Layer View</h3>
      
      <div className="space-y-4">
        {pallet.layers.map((layer, layerIndex) => (
          <div key={layerIndex} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-gray-800">
                Layer {layerIndex + 1}
              </h4>
              <div className="text-sm text-gray-600">
                Height: {layer.height}" | Weight: {layer.weight.toFixed(1)} lbs
              </div>
            </div>

            <div className="bg-gray-100 p-4 rounded overflow-x-auto">
              <svg
                width={palletLength}
                height={palletWidth}
                className="border-2 border-gray-800"
                style={{ maxWidth: '100%', height: 'auto' }}
              >
                {/* Pallet base */}
                <rect
                  x={0}
                  y={0}
                  width={palletLength}
                  height={palletWidth}
                  fill="#f5f5dc"
                  stroke="#8b7355"
                  strokeWidth={2}
                />

                {/* Grid lines */}
                {Array.from({ length: Math.ceil(pallet.palletSize.length / 12) }).map((_, i) => (
                  <line
                    key={`v-${i}`}
                    x1={i * 12 * scale}
                    y1={0}
                    x2={i * 12 * scale}
                    y2={palletWidth}
                    stroke="#ccc"
                    strokeWidth={0.5}
                    strokeDasharray="2,2"
                  />
                ))}
                {Array.from({ length: Math.ceil(pallet.palletSize.width / 12) }).map((_, i) => (
                  <line
                    key={`h-${i}`}
                    x1={0}
                    y1={i * 12 * scale}
                    x2={palletLength}
                    y2={i * 12 * scale}
                    stroke="#ccc"
                    strokeWidth={0.5}
                    strokeDasharray="2,2"
                  />
                ))}

                {/* Placed items */}
                {layer.items.map((item, itemIndex) => {
                  const x = item.x * scale;
                  const y = item.y * scale;
                  const width = item.length * scale;
                  const height = item.width * scale;
                  const color = generateColor(item.sku.id);

                  return (
                    <g key={itemIndex}>
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={color}
                        stroke="#000"
                        strokeWidth={1}
                        opacity={0.8}
                      />
                      <text
                        x={x + width / 2}
                        y={y + height / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={10}
                        fill="#000"
                        fontWeight="bold"
                      >
                        {item.sku.name.substring(0, 10)}
                      </text>
                      {item.rotated && (
                        <text
                          x={x + width / 2}
                          y={y + height / 2 + 12}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={8}
                          fill="#000"
                        >
                          (R)
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Layer items list */}
            <div className="mt-3">
              <h5 className="text-sm font-semibold text-gray-700 mb-2">Items in this layer:</h5>
              <div className="space-y-1">
                {Array.from(
                  layer.items.reduce((acc, item) => {
                    const existing = acc.get(item.sku.id);
                    if (existing) {
                      existing.quantity += item.quantity;
                    } else {
                      acc.set(item.sku.id, { sku: item.sku, quantity: item.quantity });
                    }
                    return acc;
                  }, new Map<string, { sku: typeof layer.items[0]['sku']; quantity: number }>())
                ).map(([skuId, { sku, quantity }]) => (
                  <div key={skuId} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-4 h-4 rounded border border-gray-400"
                      style={{ backgroundColor: generateColor(skuId) }}
                    />
                    <span className="text-gray-700">
                      {sku.name} × {quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pallet Summary */}
      <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-2">Pallet Summary</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-600">Total Layers:</span>
            <span className="ml-2 font-semibold">{pallet.layers.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Total Height:</span>
            <span className="ml-2 font-semibold">{pallet.totalHeight.toFixed(1)}"</span>
          </div>
          <div>
            <span className="text-gray-600">Total Weight:</span>
            <span className="ml-2 font-semibold">{pallet.totalWeight.toFixed(1)} lbs</span>
          </div>
          <div>
            <span className="text-gray-600">Freight Class:</span>
            <span className="ml-2 font-semibold">{pallet.freightClass || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
