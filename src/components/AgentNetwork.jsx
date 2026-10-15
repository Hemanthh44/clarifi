import { useState } from "react";

const agents = [
  { id: "product-explainer", name: "Product Explainer", tagline: "Decode the fine print.", body: "Upload financial documents and ask questions in plain English.", example: "Ask about fees, exclusions, risks, or terms." },
  { id: "risk-simulator", name: "Risk Simulator", tagline: "Model portfolio stress.", body: "Calculate allocation risk and replay historical stress scenarios.", example: "Test your allocation against historical shocks." },
  { id: "summary-agent", name: "Summary Agent", tagline: "See your financial picture.", body: "Generate a concise analytical snapshot from your saved portfolio.", example: "Summarize my portfolio." },
  { id: "scam-screener", name: "Scam Screener", tagline: "Spot financial red flags.", body: "Analyze suspicious messages against known fraud patterns.", example: "Check this investment message." },
];

// Layout: orchestrator center, 4 agents around it
const positions = [
  { x: 200, y: 55 },   // top - Product Explainer
  { x: 345, y: 200 },  // right - Risk Simulator
  { x: 200, y: 345 },  // bottom - Summary Agent
  { x: 55, y: 200 },   // left - Scam Screener
];

export default function AgentNetwork({ compact = false }) {
  const [active, setActive] = useState(null);
  const size = compact ? 320 : 400;

  return (
    <div className="relative select-none" style={{ width: "100%", maxWidth: size }}>
      <svg viewBox="0 0 400 400" className="w-full h-auto overflow-visible" role="img" aria-label="ClariFi multi-agent network">
        {/* connecting lines */}
        {positions.map((p, i) => (
          <line
            key={i}
            x1="200"
            y1="200"
            x2={p.x}
            y2={p.y}
            stroke={active === i ? "#047857" : "#E5E7EB"}
            strokeWidth={active === i ? 2.2 : 1.4}
            className={active === i ? "animate-pulseLine" : ""}
          />
        ))}

        {/* orchestrator core */}
        <circle cx="200" cy="200" r="46" fill="#047857" stroke="#065F46" strokeWidth="2" />
        <circle cx="200" cy="200" r="46" fill="url(#coreGlow)" opacity="0.4" />
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#047857" stopOpacity="0" />
          </radialGradient>
        </defs>
        <text
          x="200"
          y="196"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="11"
          fontWeight="700"
          fontFamily="Plus Jakarta Sans, -apple-system, sans-serif"
        >
          CLARIFI
        </text>
        <text
          x="200"
          y="210"
          textAnchor="middle"
          fill="#ECFDF5"
          fontSize="8"
          fontWeight="600"
          fontFamily="JetBrains Mono, monospace"
          letterSpacing="0.6"
        >
          ORCHESTRATOR
        </text>

        {/* agent nodes */}
        {agents.map((agent, i) => {
          const p = positions[i];
          const isActive = active === i;
          return (
            <g
              key={agent.id}
              className="cursor-pointer animate-floatNode"
              style={{ animationDelay: `${i * 0.4}s` }}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(isActive ? null : i)}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={isActive ? 34 : 30}
                fill={isActive ? "#047857" : "#FFFFFF"}
                stroke={isActive ? "#10B981" : "#E5E7EB"}
                strokeWidth={isActive ? 2.2 : 1.4}
                className="transition-all duration-200"
                filter="drop-shadow(0 2px 6px rgba(4,120,87,0.12))"
              />
              <text
                x={p.x}
                y={p.y - 3}
                textAnchor="middle"
                fill={isActive ? "#FFFFFF" : "#181A2A"}
                fontSize="7.5"
                fontWeight="700"
                fontFamily="Plus Jakarta Sans, Inter, sans-serif"
              >
                {agent.name.split(" ")[0].toUpperCase()}
              </text>
              <text
                x={p.x}
                y={p.y + 8}
                textAnchor="middle"
                fill={isActive ? "#FFFFFF" : "#7E8597"}
                fontSize="7.5"
                fontWeight="600"
                fontFamily="Plus Jakarta Sans, Inter, sans-serif"
              >
                {agent.name.split(" ")[1]?.toUpperCase() ?? ""}
              </text>
            </g>
          );
        })}
      </svg>

      {active !== null && (
        <div className="mt-2 bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-editorial animate-rise">
          <p className="font-bold text-base text-text-primary mb-1">{agents[active].name}</p>
          <p className="text-xs text-text-secondary mb-2">{agents[active].body}</p>
          <p className="text-xs text-brand-berry font-mono">{agents[active].example}</p>
        </div>
      )}
    </div>
  );
}
