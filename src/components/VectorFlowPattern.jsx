/**
 * VectorFlowPattern
 * 
 * Recreates the subtle abstract flowing ticks/vector pattern in the lower-right
 * of the reference screenshot. It represents mathematical intelligence, financial
 * signals, and vector flow fields using fine dark strokes with gentle rotation gradients.
 */
export default function VectorFlowPattern({ className = "", width = 360, height = 480 }) {
  const cols = 10;
  const rows = 16;
  const colSpacing = 32;
  const rowSpacing = 28;
  const tickLength = 12;

  const ticks = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Calculate normalized positions (0 to 1)
      const u = c / (cols - 1);
      const v = r / (rows - 1);

      // Flow formula recreating the orientation gradient from the reference:
      // Top starts horizontal (~0 deg), rotates smoothly to ~90 deg (vertical) towards bottom,
      // with a slight lateral curvature across columns.
      const baseAngle = v * 85 + (u - 0.5) * 22;
      const angleRad = (baseAngle * Math.PI) / 180;

      const cx = 35 + c * colSpacing;
      const cy = 25 + r * rowSpacing;

      // Start and end points for the oriented line segment
      const dx = (Math.cos(angleRad) * tickLength) / 2;
      const dy = (Math.sin(angleRad) * tickLength) / 2;

      // Subtle opacity falloff at borders
      const opacity = 0.22 + (1 - u * 0.3) * (0.35 + v * 0.25);

      ticks.push({
        id: `${r}-${c}`,
        x1: cx - dx,
        y1: cy - dy,
        x2: cx + dx,
        y2: cy + dy,
        opacity: Math.min(opacity, 0.65),
      });
    }
  }

  return (
    <div
      className={`relative select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox={`0 0 ${cols * colSpacing + 60} ${rows * rowSpacing + 50}`}
        width={width}
        height={height}
        className="w-full h-auto overflow-visible"
        fill="none"
      >
        <g className="animate-tickSway origin-bottom-right">
          {ticks.map((t) => (
            <line
              key={t.id}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke="#171717"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeOpacity={t.opacity}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
