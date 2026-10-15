// Shared chart/asset palette: emerald green -> mint -> obsidian navy -> dark forest -> teal slate
export const ASSET_COLORS = ["#047857", "#10B981", "#181A2A", "#065F46", "#0D9488"];

export function assetColor(index) {
  return ASSET_COLORS[index % ASSET_COLORS.length];
}
