import React from "react";

interface NovaBoardLogoProps {
  className?: string;
  size?: number; // Size of the icon in pixels
  showText?: boolean; // Whether to show "NovaBoard" text and brand style
  showTagline?: boolean; // Whether to show tagline underneath
  lightTheme?: boolean; // True for light backgrounds, False for dark backgrounds
  language?: "ar" | "en";
}

export const NovaBoardLogo: React.FC<NovaBoardLogoProps> = ({
  className = "",
  size = 40,
  showText = false,
  showTagline = true,
  lightTheme = true,
  language = "en",
}) => {
  const iconMarkup = (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Gradients */}
        <defs>
          <linearGradient id="logoNGradient" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" /> {/* Blue */}
            <stop offset="50%" stopColor="#3B82F6" /> {/* Cyan / Light Blue */}
            <stop offset="100%" stopColor="#8B5CF6" /> {/* Violet */}
          </linearGradient>
        </defs>

        {/* 1. Rounded rectangle representing the Smart Board Frame */}
        <rect
          x="14"
          y="14"
          width="72"
          height="72"
          rx="12"
          stroke={lightTheme ? "#0c1524" : "#ffffff"}
          strokeWidth="3.5"
          fill="white"
        />

        {/* 2. Tiny Floating pixel/digital squares on the top-left */}
        <rect x="7" y="19" width="4.5" height="4.5" fill="#3B82F6" rx="1" />
        <rect x="2" y="25" width="5" height="5" fill="#00D2FF" rx="1" />
        <rect x="8" y="29" width="6" height="6" fill="#8B5CF6" rx="1.5" />
        <rect x="4" y="11" width="3" height="3" fill="#00D2FF" rx="0.5" />

        {/* 3. Small line icons on the right vertical side of the board */}
        {/* Pencil */}
        <path d="M76 27 L79 24 L80 25 L77 28 Z" stroke="#0F172A" strokeWidth="1" />
        {/* Cursor */}
        <path d="M76 38 L80 41 L78 42 L79 44.5 L78 45 L77 43 L76 45 Z" stroke="#0F172A" strokeWidth="1" strokeLinejoin="round" />
        {/* Square outline */}
        <rect x="75.5" y="49" width="5" height="5" rx="1.2" stroke="#0F172A" strokeWidth="1" />
        {/* Three Purple Dots */}
        <circle cx="78" cy="62" r="1.2" fill="#8B5CF6" />
        <circle cx="78" cy="67" r="1.2" fill="#8B5CF6" />
        <circle cx="78" cy="72" r="1.2" fill="#8B5CF6" />

        {/* 4. The volumetric 'N' letter as a ribbon with gradient */}
        <path
          d="M26,68 L26,34 C26,26 30,22 35,22 C40,22 45,28 48,34 L60,58 C62,62 65,64 68,64 C71,64 73,60 73,54 L73,22 L80,22 L80,54 C80,64 74,70 68,70 C62,70 57,64 54,58 L42,34 C40,30 38,28 36,28 C34,28 33,30 33,32 L33,68 Z"
          fill="url(#logoNGradient)"
        />
      </svg>
    </div>
  );

  if (!showText) {
    return <div className={`inline-flex items-center ${className}`}>{iconMarkup}</div>;
  }

  return (
    <div className={`flex ${showTagline ? "flex-col items-center" : "items-center"} text-center select-none ${className}`} dir="ltr">
      {/* Horizontal Brandmark Row: Text | Icon */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Brand Text "NovaBoard" */}
        <span className="font-sans font-extrabold text-2xl md:text-3xl tracking-tight leading-none">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600">
            Nova
          </span>
          <span className={lightTheme ? "text-slate-900" : "text-white"}>Board</span>
        </span>

        {/* Thin elegant vertical divider line */}
        <div className={`w-[1.5px] h-6 md:h-8 ${lightTheme ? "bg-slate-200/80" : "bg-slate-700/80"}`} />

        {/* Smart Board Icon */}
        {iconMarkup}
      </div>

      {/* Subtitle / Tagline below, with elegant wide tracking */}
      {showTagline && (
        <span className={`text-[8px] md:text-[9.5px] font-black tracking-[0.24em] uppercase leading-none mt-2 md:mt-2.5 ${lightTheme ? "text-slate-500" : "text-slate-400"}`}>
          {language === "ar" ? "السبورة التفاعلية الذكية . مستقبل أذكى." : "SMART BOARD. SMARTER FUTURE."}
        </span>
      )}
    </div>
  );
};


