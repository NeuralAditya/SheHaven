interface SheHavenLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon";
  className?: string;
}

const sizes = {
  sm: { icon: 24, text: "text-base" },
  md: { icon: 32, text: "text-xl" },
  lg: { icon: 48, text: "text-3xl" },
  xl: { icon: 72, text: "text-5xl" },
};

export function SheHavenLogo({ size = "md", variant = "full", className = "" }: SheHavenLogoProps) {
  const s = sizes[size];

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      {/* Shield + Female symbol SVG logo */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shield body */}
        <path
          d="M24 4L6 11V24C6 34.5 14 43 24 46C34 43 42 34.5 42 24V11L24 4Z"
          fill="url(#shieldGrad)"
        />
        {/* Inner shield highlight */}
        <path
          d="M24 8L10 14V24C10 32.5 16.5 40 24 43C31.5 40 38 32.5 38 24V14L24 8Z"
          fill="url(#innerGrad)"
          opacity="0.3"
        />
        {/* Female symbol circle */}
        <circle cx="24" cy="22" r="7" stroke="white" strokeWidth="2.5" fill="none" />
        {/* Female symbol cross */}
        <line x1="24" y1="29" x2="24" y2="36" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="20.5" y1="32.5" x2="27.5" y2="32.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" />

        <defs>
          <linearGradient id="shieldGrad" x1="6" y1="4" x2="42" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e11d48" />
            <stop offset="1" stopColor="#9f1239" />
          </linearGradient>
          <linearGradient id="innerGrad" x1="10" y1="8" x2="38" y2="43" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {variant === "full" && (
        <div className="flex flex-col leading-none">
          <span
            className={`font-bold ${s.text} text-white`}
            style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.02em" }}
          >
            She<span style={{ color: "#fb7185" }}>Haven</span>
          </span>
          {size === "lg" || size === "xl" ? (
            <span className="text-xs text-rose-200 font-medium tracking-widest uppercase mt-0.5">
              Your Safety. Always.
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
