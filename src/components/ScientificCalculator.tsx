import React, { useState, useEffect, useRef } from "react";
import { X, RotateCw, ArrowLeftRight } from "lucide-react";

interface ScientificCalculatorProps {
  id: string;
  onClose: () => void;
  language: "ar" | "en";
}

export default function ScientificCalculator({ id, onClose, language }: ScientificCalculatorProps) {
  const [expression, setExpression] = useState<string>("");
  const [result, setResult] = useState<string>("0");
  const [angleMode, setAngleMode] = useState<"deg" | "rad">("deg");
  const [rawResult, setRawResult] = useState<number | null>(null);
  const [displayMode, setDisplayMode] = useState<"decimal" | "fraction">("decimal");
  const displayRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the digital screen when expression grows long
  useEffect(() => {
    if (displayRef.current) {
      displayRef.current.scrollLeft = displayRef.current.scrollWidth;
    }
  }, [expression]);

  const handleKeyPress = (val: string) => {
    // Scientific functions that require an open parenthesis
    const funcWithBrackets = ["sin", "cos", "tan", "asin", "acos", "atan", "ln", "log", "sqrt"];
    
    // If the expression currently shows "0" and we are typing a digit or function, replace it
    if (expression === "0" && !isNaN(Number(val))) {
      setExpression(val);
      return;
    }

    if (funcWithBrackets.includes(val)) {
      setExpression((prev) => prev + val + "(");
    } else if (val === "pi") {
      setExpression((prev) => prev + "π");
    } else if (val === "e") {
      setExpression((prev) => prev + "e");
    } else {
      setExpression((prev) => prev + val);
    }
  };

  const handleDelete = () => {
    if (expression.length === 0) return;
    
    // Check if we are deleting a function name (e.g., "sin(", "asin(")
    const endOfExpr = expression;
    const functions = ["asin(", "acos(", "atan(", "sin(", "cos(", "tan(", "sqrt(", "log(", "ln("];
    
    for (const f of functions) {
      if (endOfExpr.endsWith(f)) {
        setExpression((prev) => prev.slice(0, -f.length));
        return;
      }
    }
    
    setExpression((prev) => prev.slice(0, -1));
  };

  const handleAllClear = () => {
    setExpression("");
    setResult("0");
    setRawResult(null);
    setDisplayMode("decimal");
  };

  // Fraction helper
  const decimalToFraction = (val: number): string => {
    if (isNaN(val) || !isFinite(val)) return "";
    if (val === 0) return "0";
    
    const sign = val < 0 ? "-" : "";
    let num = Math.abs(val);
    
    if (Number.isInteger(num)) return val.toString();
    
    // Limit precision
    const precision = 1000000;
    const gcd = (a: number, b: number): number => {
      return b ? gcd(b, a % b) : a;
    };
    
    let numerator = Math.round(num * precision);
    let denominator = precision;
    
    const commonDivisor = gcd(numerator, denominator);
    numerator /= commonDivisor;
    denominator /= commonDivisor;
    
    if (denominator < 10000) {
      return `${sign}${numerator}/${denominator}`;
    }
    return val.toString();
  };

  const formatNumber = (num: number): string => {
    if (Number.isInteger(num)) {
      return num.toString();
    } else {
      // Precision representation
      return parseFloat(num.toFixed(10)).toString();
    }
  };

  const evaluateSafe = (expr: string, mode: "deg" | "rad"): { resultStr: string; numericVal: number | null } => {
    try {
      if (!expr.trim()) return { resultStr: "0", numericVal: null };

      // Map mathematical glyphs to JS equivalents
      let jsExpr = expr
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/π/g, "Math.PI")
        .replace(/e/g, "Math.E")
        .replace(/\^/g, "**");

      // Custom Trig with Degree/Radian handling
      const customSin = (val: number) => mode === "deg" ? Math.sin(val * Math.PI / 180) : Math.sin(val);
      const customCos = (val: number) => mode === "deg" ? Math.cos(val * Math.PI / 180) : Math.cos(val);
      const customTan = (val: number) => mode === "deg" ? Math.tan(val * Math.PI / 180) : Math.tan(val);
      const customAsin = (val: number) => mode === "deg" ? Math.asin(val) * 180 / Math.PI : Math.asin(val);
      const customAcos = (val: number) => mode === "deg" ? Math.acos(val) * 180 / Math.PI : Math.acos(val);
      const customAtan = (val: number) => mode === "deg" ? Math.atan(val) * 180 / Math.PI : Math.atan(val);
      const ln = Math.log;
      const log = Math.log10;
      const sqrt = Math.sqrt;

      jsExpr = jsExpr
        .replace(/sin\(/g, "customSin(")
        .replace(/cos\(/g, "customCos(")
        .replace(/tan\(/g, "customTan(")
        .replace(/asin\(/g, "customAsin(")
        .replace(/acos\(/g, "customAcos(")
        .replace(/atan\(/g, "customAtan(")
        .replace(/ln\(/g, "ln(")
        .replace(/log\(/g, "log(")
        .replace(/sqrt\(/g, "sqrt(");

      // Sanitization
      const sanitized = jsExpr
        .replace(/customSin/g, "")
        .replace(/customCos/g, "")
        .replace(/customTan/g, "")
        .replace(/customAsin/g, "")
        .replace(/customAcos/g, "")
        .replace(/customAtan/g, "")
        .replace(/Math\.PI/g, "")
        .replace(/Math\.E/g, "")
        .replace(/ln/g, "")
        .replace(/log/g, "")
        .replace(/sqrt/g, "")
        .replace(/\*\*/g, "");

      if (!/^[0-9.+\-*/() ]*$/.test(sanitized)) {
        return { resultStr: language === "ar" ? "خطأ في الصيغة" : "Syntax Error", numericVal: null };
      }

      // Auto-close brackets
      const openCount = (jsExpr.match(/\(/g) || []).length;
      const closeCount = (jsExpr.match(/\)/g) || []).length;
      if (openCount > closeCount) {
        jsExpr += ")".repeat(openCount - closeCount);
      }

      const evalFn = new Function(
        "customSin", "customCos", "customTan", "customAsin", "customAcos", "customAtan",
        "ln", "log", "sqrt",
        `return (${jsExpr});`
      );

      const res = evalFn(customSin, customCos, customTan, customAsin, customAcos, customAtan, ln, log, sqrt);
      
      if (res === undefined || res === null || isNaN(res)) {
        return { resultStr: language === "ar" ? "خطأ رياضي" : "Math Error", numericVal: null };
      }
      if (res === Infinity || res === -Infinity) {
        return { resultStr: language === "ar" ? "القسمة على صفر" : "Math Error", numericVal: null };
      }

      return { resultStr: formatNumber(res), numericVal: res };
    } catch (err) {
      return { resultStr: language === "ar" ? "خطأ رياضي" : "Math Error", numericVal: null };
    }
  };

  const handleCalculate = () => {
    if (!expression.trim()) return;
    const { resultStr, numericVal } = evaluateSafe(expression, angleMode);
    setResult(resultStr);
    setRawResult(numericVal);
    setDisplayMode("decimal");
  };

  const handleToggleSD = () => {
    if (rawResult !== null) {
      if (displayMode === "decimal") {
        const frac = decimalToFraction(rawResult);
        if (frac && frac.includes("/")) {
          setResult(frac);
          setDisplayMode("fraction");
        }
      } else {
        setResult(formatNumber(rawResult));
        setDisplayMode("decimal");
      }
    }
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.hasAttribute("contenteditable"))) {
        return;
      }

      const key = e.key;
      if (key >= "0" && key <= "9") {
        handleKeyPress(key);
      } else if (key === ".") {
        handleKeyPress(".");
      } else if (key === "+") {
        handleKeyPress("+");
      } else if (key === "-") {
        handleKeyPress("-");
      } else if (key === "*") {
        handleKeyPress("×");
      } else if (key === "/") {
        handleKeyPress("÷");
      } else if (key === "(" || key === ")") {
        handleKeyPress(key);
      } else if (key === "^") {
        handleKeyPress("^");
      } else if (key === "Enter" || key === "=") {
        e.preventDefault();
        handleCalculate();
      } else if (key === "Backspace") {
        handleDelete();
      } else if (key === "Escape") {
        handleAllClear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expression, angleMode, rawResult, displayMode]);

  return (
    <div className="flex flex-col w-[320px] bg-gradient-to-b from-[#e5edf5] via-[#d6dfeb] to-[#b6c4d7] border-x-4 border-b-8 border-t-2 border-[#8192a6] rounded-[40px] px-4.5 py-5 shadow-[0_25px_60px_rgba(15,23,42,0.45)] text-slate-800 select-none font-sans relative overflow-hidden ring-4 ring-[#4e5c6d]/50">
      
      {/* Dark charcoal side bezels / bumpers simulating 3D shape */}
      <div className="absolute top-0 left-0 w-2.5 h-full bg-gradient-to-r from-[#2c3746] to-transparent opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-2.5 h-full bg-gradient-to-l from-[#2c3746] to-transparent opacity-40 pointer-events-none" />

      {/* Glossy highlight line */}
      <div className="absolute top-1.5 left-6 right-6 h-[2px] bg-white/60 pointer-events-none rounded-full" />

      {/* CASIO logo & NATURAL-V.P.A.M. branding line */}
      <div className="flex justify-between items-end px-2 mb-3 z-10 relative">
        <div className="flex flex-col items-start leading-none">
          <span className="text-[12px] font-black text-slate-900 tracking-wider font-mono">CASIO</span>
          <span className="text-[7px] font-black text-slate-600/90 tracking-wider mt-0.5">fx-991ES PLUS</span>
        </div>

        {/* Solar panel box (Authentic golden/brown striped cells) */}
        <div className="w-[70px] h-[18px] bg-gradient-to-r from-[#421d0f] via-[#5c2d1c] to-[#421d0f] rounded border border-[#2b170c] shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] flex gap-1 p-0.5 justify-center items-center">
          <div className="w-[4px] h-full bg-[#1b0c06]/80 border-r border-[#693320]/30" />
          <div className="w-[4px] h-full bg-[#1b0c06]/80 border-r border-[#693320]/30" />
          <div className="w-[4px] h-full bg-[#1b0c06]/80 border-r border-[#693320]/30" />
          <div className="w-[4px] h-full bg-[#1b0c06]/80 border-r border-[#693320]/30" />
          <div className="w-[4px] h-full bg-[#1b0c06]/80 border-r border-[#693320]/30" />
        </div>

        <div className="text-[8px] font-black text-[#0f5b5c] italic tracking-tight leading-none">
          NATURAL-V.P.A.M.
        </div>
      </div>

      {/* Recessed Screen Frame (Dark Steel-Grey Bezel) */}
      <div className="bg-gradient-to-b from-[#2e3743] to-[#404c5c] p-2.5 rounded-2xl shadow-[inset_0_4px_8px_rgba(0,0,0,0.4),0_2px_4px_rgba(255,255,255,0.4)] mb-4 border border-[#5d6d81]">
        
        {/* LCD Greenish-Grey Screen */}
        <div className="bg-[#b3c7b8] border-2 border-[#1c2c22] rounded-lg p-2.5 text-[#1b2b20] font-mono relative overflow-hidden flex flex-col justify-between h-[85px] shadow-[inset_0_3px_5px_rgba(0,0,0,0.25)]">
          {/* Subtle horizontal screen scanlines and grid */}
          <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.04)_1.2px,transparent_1.2px)] [background-size:2.5px_2.5px] pointer-events-none opacity-50 animate-pulse duration-[10000ms]" />

          {/* Top Status Flags indicators row */}
          <div className="flex justify-between text-[7px] font-extrabold uppercase tracking-widest opacity-85 select-none leading-none mb-0.5">
            <span className="flex items-center gap-1.5">
              <span className={angleMode === "deg" ? "bg-[#1c2c22] text-[#b3c7b8] px-0.5 rounded-[1px] font-black font-mono text-[6.5px]" : "opacity-30"}>D</span>
              <span className={angleMode === "rad" ? "bg-[#1c2c22] text-[#b3c7b8] px-0.5 rounded-[1px] font-black font-mono text-[6.5px]" : "opacity-30"}>R</span>
            </span>
            <span className="text-[6.5px] font-extrabold bg-[#1c2c22] text-[#b3c7b8] px-0.5 rounded-[1px]">Math</span>
          </div>

          {/* Expression Input Row */}
          <div 
            ref={displayRef}
            className="text-left text-[14px] font-bold tracking-tight overflow-x-auto whitespace-nowrap scrollbar-none h-[22px] select-text selection:bg-[#1b2b20]/30 leading-none flex items-center pr-1.5"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {expression || "0"}
            <span className="animate-pulse font-light text-[#1b2b20] text-lg select-none ml-0.5">|</span>
          </div>

          {/* Large Result Row */}
          <div className="text-right text-[21px] font-black tracking-tight h-[32px] border-t border-[#1b2b20]/15 pt-1.5 leading-none flex items-center justify-end">
            {result}
          </div>
        </div>
      </div>

      {/* Circular Directional REPLAY Pad & Small Ellipse Keys Container */}
      <div className="relative h-[92px] mb-4.5 z-10">
        
        {/* REPLAY Circular 4-Way Pad */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[86px] h-[86px] rounded-full bg-gradient-to-br from-[#7d8b9b] via-[#485361] to-[#303843] border border-[#232931] shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_4px_rgba(255,255,255,0.4)] flex items-center justify-center active:scale-95 transition-transform duration-100">
          
          {/* Inner ring */}
          <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#4c5866] to-[#2c333c] border border-[#20262e] shadow-inner flex items-center justify-center relative">
            <span className="text-[7.5px] font-black text-slate-200 tracking-wider opacity-80 uppercase select-none">REPLAY</span>
          </div>

          {/* Triangles for Up, Down, Left, Right directional buttons */}
          <button 
            onClick={() => handleKeyPress("+")}
            className="absolute top-1 w-8 h-5 flex items-center justify-center text-[#cfd7e0] hover:text-white cursor-pointer active:scale-90"
            title="Up"
          >
            <span className="text-[10px]">▲</span>
          </button>
          <button 
            onClick={() => handleKeyPress("-")}
            className="absolute bottom-1 w-8 h-5 flex items-center justify-center text-[#cfd7e0] hover:text-white cursor-pointer active:scale-90"
            title="Down"
          >
            <span className="text-[10px]">▼</span>
          </button>
          <button 
            onClick={handleDelete}
            className="absolute left-1 w-5 h-8 flex items-center justify-center text-[#cfd7e0] hover:text-white cursor-pointer active:scale-90"
            title="Left"
          >
            <span className="text-[10px]">◀</span>
          </button>
          <button 
            onClick={handleCalculate}
            className="absolute right-1 w-5 h-8 flex items-center justify-center text-[#cfd7e0] hover:text-white cursor-pointer active:scale-90"
            title="Right"
          >
            <span className="text-[10px]">▶</span>
          </button>
        </div>

        {/* SHIFT & ALPHA (Left) */}
        <div className="absolute left-0.5 top-2.5 flex flex-col items-center">
          <span className="text-[7px] font-black text-amber-500 uppercase tracking-wide mb-0.5">SHIFT</span>
          <button 
            onClick={() => setAngleMode(angleMode === "deg" ? "rad" : "deg")}
            className="w-[34px] h-[20px] rounded-full bg-gradient-to-b from-[#6b7987] to-[#404c59] border border-[#2b343f] shadow-[0_2px_4px_rgba(0,0,0,0.25)] hover:from-[#7e8c9b] text-slate-100 flex items-center justify-center transition-all active:translate-y-0.5 cursor-pointer"
          >
            <div className="w-[18px] h-2 bg-[#ffc107]/20 rounded-full" />
          </button>
          <span className="text-[6.5px] font-bold text-amber-500 uppercase mt-0.5">DEG/RAD</span>
        </div>

        <div className="absolute left-[38px] top-10 flex flex-col items-center">
          <span className="text-[7px] font-black text-[#dc3545] uppercase tracking-wide mb-0.5">ALPHA</span>
          <button 
            onClick={() => handleKeyPress("pi")}
            className="w-[34px] h-[20px] rounded-full bg-gradient-to-b from-[#6b7987] to-[#404c59] border border-[#2b343f] shadow-[0_2px_4px_rgba(0,0,0,0.25)] hover:from-[#7e8c9b] text-slate-100 flex items-center justify-center transition-all active:translate-y-0.5 cursor-pointer"
          >
            <div className="w-[18px] h-2 bg-red-400/20 rounded-full" />
          </button>
        </div>

        {/* MODE SET UP & ON (Right) */}
        <div className="absolute right-0.5 top-2.5 flex flex-col items-center">
          <span className="text-[7px] font-black text-slate-600 uppercase tracking-wide mb-0.5">MODE</span>
          <button 
            onClick={() => handleKeyPress("(")}
            className="w-[34px] h-[20px] rounded-full bg-gradient-to-b from-[#6b7987] to-[#404c59] border border-[#2b343f] shadow-[0_2px_4px_rgba(0,0,0,0.25)] hover:from-[#7e8c9b] text-slate-100 flex items-center justify-center transition-all active:translate-y-0.5 cursor-pointer"
          >
            <div className="w-[18px] h-2 bg-slate-400/20 rounded-full" />
          </button>
          <span className="text-[6.5px] font-bold text-[#b96f12] uppercase mt-0.5">SET UP</span>
        </div>

        <div className="absolute right-[38px] top-10 flex flex-col items-center">
          <span className="text-[7px] font-black text-emerald-700 uppercase tracking-wide mb-0.5">ON</span>
          <button 
            onClick={handleAllClear}
            className="w-[34px] h-[20px] rounded-full bg-gradient-to-b from-[#6b7987] to-[#404c59] border border-[#2b343f] shadow-[0_2px_4px_rgba(0,0,0,0.25)] hover:from-[#7e8c9b] text-slate-100 flex items-center justify-center transition-all active:translate-y-0.5 cursor-pointer"
          >
            <div className="w-[18px] h-2 bg-emerald-500/20 rounded-full" />
          </button>
        </div>
      </div>

      {/* Button panel container */}
      <div className="flex flex-col gap-1.5 z-10 relative">

        {/* Row 1 Scientific Keys */}
        <div className="grid grid-cols-6 gap-1">
          {[
            { key: "/", label: "a b/c", title: "Fraction", icon: "⬚/⬚" },
            { key: "sqrt", label: "√▫", title: "Square Root", icon: "√" },
            { key: "^2", label: "x²", title: "Square", icon: "x²" },
            { key: "^", label: "x▫", title: "Power", icon: "xʸ" },
            { key: "log", label: "log", title: "Log", icon: "log" },
            { key: "ln", label: "ln", title: "Ln", icon: "ln" },
          ].map((sc) => (
            <button
              key={sc.key}
              onClick={() => handleKeyPress(sc.key)}
              className="py-1 rounded-[6px] text-[9px] font-black bg-gradient-to-b from-[#404954] to-[#2c323a] border border-[#1b1f24] hover:from-[#4f5966] hover:to-[#38404a] text-white shadow-sm flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all"
              title={sc.title}
            >
              <span className="text-[6px] text-[#cca131] scale-90 mb-0.5">{sc.label}</span>
              <span className="font-bold">{sc.icon}</span>
            </button>
          ))}
        </div>

        {/* Row 2 Scientific Keys */}
        <div className="grid grid-cols-6 gap-1">
          {[
            { key: "-", label: "(-)", title: "Negative", icon: "(-)" },
            { key: "asin", label: "sin⁻¹", title: "Inverse Sin", icon: "sin⁻¹" },
            { key: "acos", label: "cos⁻¹", title: "Inverse Cos", icon: "cos⁻¹" },
            { key: "atan", label: "tan⁻¹", title: "Inverse Tan", icon: "tan⁻¹" },
            { key: "pi", label: "π", title: "Pi", icon: "π" },
            { key: "e", label: "e", title: "Euler's Constant", icon: "e" },
          ].map((sc) => (
            <button
              key={sc.key}
              onClick={() => handleKeyPress(sc.key)}
              className="py-1 rounded-[6px] text-[9px] font-black bg-gradient-to-b from-[#404954] to-[#2c323a] border border-[#1b1f24] hover:from-[#4f5966] hover:to-[#38404a] text-white shadow-sm flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all"
              title={sc.title}
            >
              <span className="text-[6px] text-[#cca131] scale-90 mb-0.5">{sc.label}</span>
              <span className="font-bold">{sc.icon}</span>
            </button>
          ))}
        </div>

        {/* Row 3 Scientific Keys */}
        <div className="grid grid-cols-6 gap-1">
          {[
            { key: "sin", label: "sin", title: "Sin", icon: "sin" },
            { key: "cos", label: "cos", title: "Cos", icon: "cos" },
            { key: "tan", label: "tan", title: "Tan", icon: "tan" },
            { key: "(", label: "(", title: "Open Parenthesis", icon: "(" },
            { key: ")", label: ")", title: "Close Parenthesis", icon: ")" },
            { key: "^-1", label: "x⁻¹", title: "Reciprocal", icon: "x⁻¹" },
          ].map((sc) => (
            <button
              key={sc.key}
              onClick={() => handleKeyPress(sc.key)}
              className="py-1 rounded-[6px] text-[9px] font-black bg-gradient-to-b from-[#404954] to-[#2c323a] border border-[#1b1f24] hover:from-[#4f5966] hover:to-[#38404a] text-white shadow-sm flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all"
              title={sc.title}
            >
              <span className="text-[6px] text-[#cca131] scale-90 mb-0.5">{sc.label}</span>
              <span className="font-bold">{sc.icon}</span>
            </button>
          ))}
        </div>

        {/* Row 4 Scientific Keys (with S<=>D & M+) */}
        <div className="grid grid-cols-6 gap-1">
          {[
            { key: "RCL", label: "STO", title: "Recall", icon: "RCL" },
            { key: "ENG", label: "←", title: "Engineering", icon: "ENG" },
            { key: "/100", label: "%", title: "Percent", icon: "%" },
            { key: "sd", label: "S⇔D", title: "Toggle Decimal/Fraction", icon: "S⇔D", action: handleToggleSD },
            { key: "M+", label: "M-", title: "Memory Plus", icon: "M+" },
            { key: "Ans", label: "DRG", title: "Last Answer", icon: "Ans" },
          ].map((sc) => (
            <button
              key={sc.key}
              onClick={sc.action || (() => handleKeyPress(sc.key))}
              className={`py-1 rounded-[6px] text-[9px] font-black border border-[#1b1f24] text-white shadow-sm flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all ${
                sc.key === "sd" 
                  ? "bg-gradient-to-b from-[#4b596e] to-[#2d394a] hover:from-[#5b6a80] hover:to-[#39475a]" 
                  : "bg-gradient-to-b from-[#404954] to-[#2c323a] hover:from-[#4f5966] hover:to-[#38404a]"
              }`}
              title={sc.title}
            >
              <span className="text-[6px] text-[#cca131] scale-90 mb-0.5">{sc.label}</span>
              <span className="font-black">{sc.icon}</span>
            </button>
          ))}
        </div>

        {/* Row 5: Numeric Keys (7, 8, 9) + DEL & AC (Bright Amber/Red) */}
        <div className="grid grid-cols-5 gap-1.5 mt-2">
          {["7", "8", "9"].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="py-3.5 rounded-xl text-base font-extrabold bg-gradient-to-b from-[#fbfcfd] to-[#e4e9f0] border-b-4 border-r-2 border-[#b0b9c5] hover:from-white text-slate-900 shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-70"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleDelete}
            className="py-3.5 rounded-xl text-[11px] font-black bg-gradient-to-b from-[#e05638] to-[#b32b12] border-b-4 border-r-2 border-[#801907] hover:from-[#eb6345] text-white shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-70"
            title="Delete"
          >
            DEL
          </button>
          <button
            onClick={handleAllClear}
            className="py-3.5 rounded-xl text-[11px] font-black bg-gradient-to-b from-[#e05638] to-[#b32b12] border-b-4 border-r-2 border-[#801907] hover:from-[#eb6345] text-white shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-70"
            title="All Clear"
          >
            AC
          </button>
        </div>

        {/* Row 6: Numeric Keys (4, 5, 6) + operators */}
        <div className="grid grid-cols-5 gap-1.5">
          {["4", "5", "6"].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="py-3.5 rounded-xl text-base font-extrabold bg-gradient-to-b from-[#fbfcfd] to-[#e4e9f0] border-b-4 border-r-2 border-[#b0b9c5] hover:from-white text-slate-900 shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-70"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => handleKeyPress("×")}
            className="py-3.5 rounded-xl text-base font-bold bg-gradient-to-b from-[#e8edf3] to-[#cbd4df] border-b-4 border-r-2 border-[#a4adb8] hover:from-[#f3f7fa] text-slate-800 shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-70"
          >
            ×
          </button>
          <button
            onClick={() => handleKeyPress("÷")}
            className="py-3.5 rounded-xl text-base font-bold bg-gradient-to-b from-[#e8edf3] to-[#cbd4df] border-b-4 border-r-2 border-[#a4adb8] hover:from-[#f3f7fa] text-slate-800 shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-70"
          >
            ÷
          </button>
        </div>

        {/* Row 7: Numeric Keys (1, 2, 3) + operators */}
        <div className="grid grid-cols-5 gap-1.5">
          {["1", "2", "3"].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="py-3.5 rounded-xl text-base font-extrabold bg-gradient-to-b from-[#fbfcfd] to-[#e4e9f0] border-b-4 border-r-2 border-[#b0b9c5] hover:from-white text-slate-900 shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-70"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => handleKeyPress("+")}
            className="py-3.5 rounded-xl text-base font-bold bg-gradient-to-b from-[#e8edf3] to-[#cbd4df] border-b-4 border-r-2 border-[#a4adb8] hover:from-[#f3f7fa] text-slate-800 shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-70"
          >
            +
          </button>
          <button
            onClick={() => handleKeyPress("-")}
            className="py-3.5 rounded-xl text-base font-bold bg-gradient-to-b from-[#e8edf3] to-[#cbd4df] border-b-4 border-r-2 border-[#a4adb8] hover:from-[#f3f7fa] text-slate-800 shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-70"
          >
            -
          </button>
        </div>

        {/* Row 8: Zero, Dot, x10^x, Ans, Equals */}
        <div className="grid grid-cols-5 gap-1.5">
          <button
            onClick={() => handleKeyPress("0")}
            className="py-3.5 rounded-xl text-base font-extrabold bg-gradient-to-b from-[#fbfcfd] to-[#e4e9f0] border-b-4 border-r-2 border-[#b0b9c5] hover:from-white text-slate-900 shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-70"
          >
            0
          </button>
          <button
            onClick={() => handleKeyPress(".")}
            className="py-3.5 rounded-xl text-base font-extrabold bg-gradient-to-b from-[#fbfcfd] to-[#e4e9f0] border-b-4 border-r-2 border-[#b0b9c5] hover:from-white text-slate-900 shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-70"
          >
            .
          </button>
          <button
            onClick={() => handleKeyPress("*10^")}
            className="py-3.5 rounded-xl text-[9px] font-black bg-gradient-to-b from-[#e8edf3] to-[#cbd4df] border-b-4 border-r-2 border-[#a4adb8] hover:from-[#f3f7fa] text-slate-800 shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-70"
            title="Scientific notation"
          >
            ×10ˣ
          </button>
          <button
            onClick={() => {
              if (rawResult !== null) {
                handleKeyPress(rawResult.toString());
              }
            }}
            className="py-3.5 rounded-xl text-xs font-black bg-gradient-to-b from-[#e8edf3] to-[#cbd4df] border-b-4 border-r-2 border-[#a4adb8] hover:from-[#f3f7fa] text-slate-800 shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-70"
            title="Last calculated value"
          >
            Ans
          </button>
          <button
            onClick={handleCalculate}
            className="py-3.5 rounded-xl text-base font-black bg-gradient-to-b from-[#4d5c70] to-[#252f3c] border-b-4 border-r-2 border-[#191f27] hover:from-[#59697e] text-white shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-all duration-70"
          >
            =
          </button>
        </div>

      </div>

      {/* Tapered bottom shadow & decorative grips */}
      <div className="text-center mt-3 text-[8px] font-bold text-slate-500/80 tracking-wider">
        {language === "ar" ? "● آلة حاسبة علمية متطورة ●" : "● NATURAL DISPLAY SCIENTIFIC ●"}
      </div>
    </div>
  );
}
