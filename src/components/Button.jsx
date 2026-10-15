const variants = {
  // Primary: solid deep emerald green with crisp white text
  primary:
    "bg-[#047857] text-white hover:bg-[#065F46] shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 font-semibold",
  // Secondary: clean white pill with soft border
  secondary:
    "bg-white text-[#181A2A] border border-[#DDD3D9] hover:border-[#047857] hover:text-[#047857] hover:bg-[#F0FDF4] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 font-semibold",
  // Accent: rich emerald gradient
  accent:
    "bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] text-white shadow-sm hover:brightness-105 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 font-semibold",
  // Ghost: minimal text button
  ghost:
    "text-[#52586B] hover:text-[#047857] hover:bg-[#ECFDF5] transition-colors duration-200 font-medium",
  // Danger: refined rose crimson
  danger:
    "bg-rose-50 text-[#E11D48] border border-rose-200/80 hover:bg-rose-100 transition-colors duration-200 font-medium",
  // Compatibility aliases
  mint:
    "bg-[#047857] text-white hover:bg-[#065F46] shadow-sm hover:-translate-y-0.5 active:translate-y-0",
  cyan:
    "bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] text-white shadow-sm hover:brightness-105 hover:-translate-y-0.5 active:translate-y-0",
};

const sizes = {
  sm: "text-xs px-4 py-1.5 rounded-full gap-1.5",
  md: "text-sm px-5 py-2.5 rounded-full gap-2",
  lg: "text-[0.95rem] px-7 py-3 rounded-full gap-2.5",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  icon: Icon,
  iconPosition = "left",
  as: Component = "button",
  ...props
}) {
  return (
    <Component
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 ease-premium disabled:opacity-50 disabled:pointer-events-none select-none ${
        variants[variant] ?? variants.primary
      } ${sizes[size]} ${className}`}
      {...props}
    >
      {Icon && iconPosition === "left" && <Icon size={size === "lg" ? 18 : 15} strokeWidth={2} />}
      {children}
      {Icon && iconPosition === "right" && <Icon size={size === "lg" ? 18 : 15} strokeWidth={2} />}
    </Component>
  );
}
