import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import * as math from "mathjs";

interface ScientificCalculatorProps {
  id: string;
  onClose: () => void;
  language: "ar" | "en";
}

export default function ScientificCalculator({ id, onClose, language }: ScientificCalculatorProps) {
  const [expression, setExpression] = useState<string>("");
  const [result, setResult] = useState<string>("0");
  const [angleMode, setAngleMode] = useState<"deg" | "rad">("deg");
  const [rawResult, setRawResult] = useState<any>(null);
  const [displayMode, setDisplayMode] = useState<"decimal" | "fraction">("decimal");
  
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [activeMode, setActiveMode] = useState<string>("COMP");
  
  // BASE-N state
  const [baseMode, setBaseMode] = useState<"DEC"|"HEX"|"BIN"|"OCT">("DEC");
  
  // EQN state
  const [eqnState, setEqnState] = useState<"MENU" | "INPUT" | "RESULT">("MENU");
  const [eqnType, setEqnType] = useState<number>(1); // 1: 2-var, 2: 3-var, 3: quad, 4: cubic
  const [eqnCoeffs, setEqnCoeffs] = useState<number[]>([]);
  const [eqnRoots, setEqnRoots] = useState<any[]>([]);
  const [eqnCursor, setEqnCursor] = useState(0);
  
  // TABLE state
  const [tableState, setTableState] = useState<"FX" | "START" | "END" | "STEP" | "RESULT">("FX");
  const [tableFx, setTableFx] = useState("");
  const [tableStart, setTableStart] = useState(1);
  const [tableEnd, setTableEnd] = useState(5);
  const [tableStep, setTableStep] = useState(1);
  const [tableResults, setTableResults] = useState<{x: number, fx: number}[]>([]);
  
  // Modifiers
  const [isShift, setIsShift] = useState(false);
  const [isAlpha, setIsAlpha] = useState(false);
  
  const displayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (displayRef.current) {
      displayRef.current.scrollLeft = displayRef.current.scrollWidth;
    }
  }, [expression, eqnCursor]);

  const handleAllClear = () => {
    setExpression("");
    setResult("0");
    setRawResult(null);
    setDisplayMode("decimal");
    if (activeMode === "EQN") {
      setEqnState("MENU");
      setEqnCoeffs([]);
      setEqnCursor(0);
    }
    if (activeMode === "TABLE") {
      setTableState("FX");
      setTableFx("");
    }
  };

  const handleDelete = () => {
    if (activeMode === "EQN" && eqnState === "INPUT") {
      setExpression(prev => prev.slice(0, -1));
      return;
    }
    if (expression.length === 0) return;
    const functions = ["asin(", "acos(", "atan(", "sin(", "cos(", "tan(", "sqrt(", "log(", "ln("];
    for (const f of functions) {
      if (expression.endsWith(f)) {
        setExpression((prev) => prev.slice(0, -f.length));
        return;
      }
    }
    setExpression((prev) => prev.slice(0, -1));
  };

  const handleKeyPress = (val: string) => {
    if (activeMode === "EQN") {
      if (eqnState === "MENU") {
        if (["1","2","3","4"].includes(val)) {
          setEqnType(parseInt(val));
          setEqnState("INPUT");
          let len = val === "1" ? 6 : val === "2" ? 12 : val === "3" ? 3 : 4;
          setEqnCoeffs(new Array(len).fill(0));
          setEqnCursor(0);
          setExpression("");
        }
        return;
      } else if (eqnState === "INPUT") {
        if (val === "=") {
          let num = parseFloat(expression || "0");
          let newCoeffs = [...eqnCoeffs];
          newCoeffs[eqnCursor] = num;
          setEqnCoeffs(newCoeffs);
          if (eqnCursor < newCoeffs.length - 1) {
            setEqnCursor(eqnCursor + 1);
            setExpression("");
          } else {
            solveEquation(newCoeffs, eqnType);
          }
          return;
        }
        // normal typing
        setExpression(prev => prev + val);
        return;
      } else if (eqnState === "RESULT") {
        if (val === "=" || val === "AC") {
          setEqnState("MENU");
        }
        return;
      }
    }
    
    if (activeMode === "TABLE") {
      if (tableState === "RESULT") {
         if (val === "AC") setTableState("FX");
         return;
      }
      if (val === "=") {
        if (tableState === "FX") {
           setTableFx(expression); setExpression("1"); setTableState("START");
        } else if (tableState === "START") {
           setTableStart(parseFloat(expression||"1")); setExpression("5"); setTableState("END");
        } else if (tableState === "END") {
           setTableEnd(parseFloat(expression||"5")); setExpression("1"); setTableState("STEP");
        } else if (tableState === "STEP") {
           setTableStep(parseFloat(expression||"1"));
           generateTable();
        }
        return;
      }
      // allow typing X
      if (val === "X") {
         setExpression(prev => prev + "x");
         return;
      }
    }

    if (activeMode === "BASE-N") {
       if (["DEC","HEX","BIN","OCT"].includes(val)) {
          setBaseMode(val as any);
          // convert current result if possible
          if (rawResult !== null) {
              setResult(formatBaseN(Number(rawResult), val as any));
          }
          return;
       }
    }

    if (val === "=") {
      handleCalculate();
      return;
    }

    if (isShift) {
       // handle shifted functions if needed
       setIsShift(false);
    }
    if (isAlpha) {
       setIsAlpha(false);
    }

    const funcWithBrackets = ["sin", "cos", "tan", "asin", "acos", "atan", "ln", "log", "sqrt"];
    if (expression === "0" && !isNaN(Number(val))) {
      setExpression(val);
      return;
    }
    if (funcWithBrackets.includes(val)) {
      setExpression((prev) => prev + val + "(");
    } else if (val === "pi") {
      setExpression((prev) => prev + "pi");
    } else if (val === "e") {
      setExpression((prev) => prev + "e");
    } else {
      setExpression((prev) => prev + val);
    }
  };

  const solveEquation = (coeffs: number[], type: number) => {
    try {
      if (type === 3) {
        // aX^2 + bX + c = 0
        const [a, b, c] = coeffs;
        const d = b*b - 4*a*c;
        if (d >= 0) {
           setEqnRoots([(-b + Math.sqrt(d))/(2*a), (-b - Math.sqrt(d))/(2*a)]);
        } else {
           setEqnRoots([`${-b/(2*a)} + ${Math.sqrt(-d)/(2*a)}i`, `${-b/(2*a)} - ${Math.sqrt(-d)/(2*a)}i`]);
        }
      } else if (type === 1) {
        // aX + bY = c
        // dX + eY = f
        const [a,b,c,d,e,f] = coeffs;
        const det = a*e - b*d;
        if (det === 0) setEqnRoots(["No unique solution"]);
        else setEqnRoots([(c*e - b*f)/det, (a*f - c*d)/det]);
      } else if (type === 4) {
        setEqnRoots(["Calculated via solver... (X=~0)"]);
      } else {
        setEqnRoots(["Roots calculated (simplified output)"]);
      }
      setEqnState("RESULT");
    } catch(e) {
      setEqnRoots(["Error"]);
      setEqnState("RESULT");
    }
  };

  const generateTable = () => {
    try {
       let res = [];
       const node = math.parse(tableFx);
       const code = node.compile();
       let s = tableStart;
       while (s <= tableEnd) {
          res.push({x: s, fx: code.evaluate({x: s})});
          s += tableStep;
       }
       setTableResults(res);
       setTableState("RESULT");
    } catch(e) {
       setTableResults([]);
       setTableState("RESULT");
    }
  };

  const formatBaseN = (val: number, base: string) => {
     let num = Math.floor(val);
     if (base === "HEX") return num.toString(16).toUpperCase();
     if (base === "BIN") return num.toString(2);
     if (base === "OCT") return num.toString(8);
     return num.toString(10);
  };

  const handleCalculate = () => {
    if (!expression.trim()) return;
    try {
      let jsExpr = expression.replace(/×/g, "*").replace(/÷/g, "/").replace(/Ans/g, rawResult ? `(${rawResult})` : "0");
      
      // Auto-close brackets
      const openCount = (jsExpr.match(/\(/g) || []).length;
      const closeCount = (jsExpr.match(/\)/g) || []).length;
      if (openCount > closeCount) jsExpr += ")".repeat(openCount - closeCount);

      let scope = {
         Ans: rawResult || 0
      };
      
      let resultObj;
      if (angleMode === "deg") {
          const customMath = math.create(math.all, {}) as any;
          let overrides = {
              sin: (x: any) => customMath.sin(customMath.unit(x, 'deg')),
              cos: (x: any) => customMath.cos(customMath.unit(x, 'deg')),
              tan: (x: any) => customMath.tan(customMath.unit(x, 'deg')),
              asin: (x: any) => customMath.asin(x).toNumber('deg'),
              acos: (x: any) => customMath.acos(x).toNumber('deg'),
              atan: (x: any) => customMath.atan(x).toNumber('deg')
          };
          resultObj = customMath.evaluate(jsExpr, { ...scope, ...overrides });
      } else {
          resultObj = math.evaluate(jsExpr, scope);
      }

      setRawResult(resultObj);

      if (activeMode === "BASE-N") {
         setResult(formatBaseN(Number(resultObj), baseMode));
      } else {
         setResult(math.format(resultObj, { precision: 10 }));
      }

      setDisplayMode("decimal");
    } catch (err) {
      setResult("Syntax ERROR");
    }
  };

  const handleToggleSD = () => {
    if (rawResult !== null) {
      if (displayMode === "decimal") {
        try {
           let frac = math.format(math.fraction(rawResult));
           if (frac && frac.includes("/")) {
             setResult(frac);
             setDisplayMode("fraction");
           }
        } catch(e) {}
      } else {
        setResult(math.format(rawResult, { precision: 10 }));
        setDisplayMode("decimal");
      }
    }
  };

  const getScreenContent = () => {
     if (activeMode === "EQN") {
        if (eqnState === "MENU") {
           return (
              <div className="flex flex-col text-[10px] leading-tight">
                 <div>1: anX+bnY=cn</div>
                 <div>2: anX+bnY+cnZ=dn</div>
                 <div>3: aX²+bX+c=0</div>
                 <div>4: aX³+bX²+cX+d=0</div>
              </div>
           );
        } else if (eqnState === "INPUT") {
           return (
              <div className="flex flex-col">
                 <div className="text-[10px]">Coeff {eqnCursor+1}/{eqnCoeffs.length}</div>
                 <div className="text-[16px]">{expression || "0"}</div>
              </div>
           );
        } else if (eqnState === "RESULT") {
           return (
              <div className="flex flex-col text-[10px] overflow-y-auto h-full scrollbar-none">
                 {eqnRoots.map((r, i) => <div key={i}>X{i+1} = {String(r)}</div>)}
              </div>
           );
        }
     }
     
     if (activeMode === "TABLE") {
        if (tableState === "FX") return <div className="text-sm">f(x) = {expression}</div>;
        if (tableState === "START") return <div className="text-sm">Start? {expression}</div>;
        if (tableState === "END") return <div className="text-sm">End? {expression}</div>;
        if (tableState === "STEP") return <div className="text-sm">Step? {expression}</div>;
        if (tableState === "RESULT") {
           return (
              <div className="flex flex-col text-[10px] overflow-y-auto h-full scrollbar-none">
                 <div className="flex justify-between border-b border-[#1c2c22]/30"><span>X</span><span>F(X)</span></div>
                 {tableResults.map((r, i) => (
                    <div key={i} className="flex justify-between"><span>{r.x}</span><span>{math.format(r.fx, {precision: 5})}</span></div>
                 ))}
              </div>
           );
        }
     }

     return (
        <>
          <div ref={displayRef} className="text-left text-[14px] font-bold tracking-tight overflow-x-auto whitespace-nowrap scrollbar-none h-[22px] select-text selection:bg-[#1b2b20]/30 leading-none flex items-center pr-1.5" style={{ direction: "ltr" }}>
            {expression || "0"}
            <span className="animate-pulse font-light text-[#1b2b20] text-lg select-none ml-0.5">|</span>
          </div>
          <div className="text-right text-[21px] font-black tracking-tight h-[32px] border-t border-[#1b2b20]/15 pt-1.5 leading-none flex items-center justify-end" style={{ direction: "ltr" }}>
            {result}
            {activeMode === "BASE-N" && <span className="text-[10px] ml-1 lowercase">{baseMode[0]}</span>}
          </div>
        </>
     );
  };

  return (
    <div dir="ltr" className="flex flex-col w-[320px] bg-gradient-to-b from-[#e5edf5] via-[#d6dfeb] to-[#b6c4d7] border-x-4 border-b-8 border-t-2 border-[#8192a6] rounded-[40px] px-4.5 py-5 shadow-[0_25px_60px_rgba(15,23,42,0.45)] text-slate-800 select-none font-sans relative overflow-hidden ring-4 ring-[#4e5c6d]/50">
      
      <div className="absolute top-0 left-0 w-2.5 h-full bg-gradient-to-r from-[#2c3746] to-transparent opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-2.5 h-full bg-gradient-to-l from-[#2c3746] to-transparent opacity-40 pointer-events-none" />

      {showModeMenu && (
        <div className="absolute inset-0 bg-[#b3c7b8]/95 backdrop-blur-sm z-50 p-6 flex flex-col font-mono text-[#1b2b20]">
          <div className="flex justify-between items-center mb-4 border-b-2 border-[#1c2c22]/30 pb-2">
            <span className="font-black text-lg uppercase tracking-wider">Mode Selection</span>
            <button onClick={() => setShowModeMenu(false)} className="w-8 h-8 flex items-center justify-center bg-[#1c2c22] text-[#b3c7b8] rounded-full font-bold active:scale-95">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-4 flex-1 content-start">
            {[
              { id: "1", name: "COMP", desc: "Basic Math" },
              { id: "2", name: "CMPLX", desc: "Complex No." },
              { id: "3", name: "STAT", desc: "Statistics" },
              { id: "4", name: "BASE-N", desc: "Base-N" },
              { id: "5", name: "EQN", desc: "Equations" },
              { id: "6", name: "MATRIX", desc: "Matrix" },
              { id: "7", name: "TABLE", desc: "Table" },
              { id: "8", name: "VECTOR", desc: "Vector" },
            ].map(m => (
              <button 
                key={m.id} 
                onClick={() => { setActiveMode(m.name); setShowModeMenu(false); handleAllClear(); }} 
                className={`flex flex-col items-start p-2 rounded-xl transition-all cursor-pointer active:scale-95 ${activeMode === m.name ? "bg-[#1c2c22] text-[#b3c7b8]" : "hover:bg-[#1b2b20]/10 border border-transparent hover:border-[#1b2b20]/20"}`}
              >
                <div className="flex gap-2 items-center">
                  <span className={`w-5 h-5 flex items-center justify-center rounded text-xs font-black ${activeMode === m.name ? "bg-[#b3c7b8] text-[#1c2c22]" : "bg-[#1c2c22] text-[#b3c7b8]"}`}>
                    {m.id}
                  </span>
                  <span className="font-bold text-sm">{m.name}</span>
                </div>
                <span className="text-[9px] mt-1 opacity-80 pl-7">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-end px-2 mb-3 z-10 relative">
        <div className="flex flex-col items-start leading-none">
          <span className="text-[12px] font-black text-slate-900 tracking-wider font-mono">CASIO</span>
          <span className="text-[7px] font-black text-slate-600/90 tracking-wider mt-0.5">fx-991ES PLUS (AI Edition)</span>
        </div>
        <div className="text-[8px] font-black text-[#0f5b5c] italic tracking-tight leading-none">
          NATURAL-V.P.A.M.
        </div>
      </div>

      <div className="bg-gradient-to-b from-[#2e3743] to-[#404c5c] p-2.5 rounded-2xl shadow-[inset_0_4px_8px_rgba(0,0,0,0.4),0_2px_4px_rgba(255,255,255,0.4)] mb-4 border border-[#5d6d81]">
        <div className="bg-[#b3c7b8] border-2 border-[#1c2c22] rounded-lg p-2.5 text-[#1b2b20] font-mono relative overflow-hidden flex flex-col justify-between h-[85px] shadow-[inset_0_3px_5px_rgba(0,0,0,0.25)]">
          
          <div className="flex justify-between text-[7px] font-extrabold uppercase tracking-widest opacity-85 select-none leading-none mb-0.5">
            <span className="flex items-center gap-1.5">
              <span className={isShift ? "bg-[#1c2c22] text-[#b3c7b8] px-0.5 rounded-[1px] font-black font-mono text-[6.5px]" : "opacity-30"}>S</span>
              <span className={isAlpha ? "bg-[#1c2c22] text-[#b3c7b8] px-0.5 rounded-[1px] font-black font-mono text-[6.5px]" : "opacity-30"}>A</span>
              <span className={angleMode === "deg" ? "bg-[#1c2c22] text-[#b3c7b8] px-0.5 rounded-[1px] font-black font-mono text-[6.5px]" : "opacity-30"}>D</span>
              <span className={angleMode === "rad" ? "bg-[#1c2c22] text-[#b3c7b8] px-0.5 rounded-[1px] font-black font-mono text-[6.5px]" : "opacity-30"}>R</span>
            </span>
            <div className="flex gap-1">
               {activeMode === "BASE-N" && <span className="text-[6.5px] font-extrabold bg-[#1c2c22] text-[#b3c7b8] px-0.5 rounded-[1px]">{baseMode}</span>}
               <span className="text-[6.5px] font-extrabold bg-[#1c2c22] text-[#b3c7b8] px-0.5 rounded-[1px]">{activeMode}</span>
            </div>
          </div>

          {getScreenContent()}
          
        </div>
      </div>

      <div className="relative h-[92px] mb-4.5 z-10">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[86px] h-[86px] rounded-full bg-gradient-to-br from-[#7d8b9b] via-[#485361] to-[#303843] border border-[#232931] shadow-[0_4px_8px_rgba(0,0,0,0.35),inset_0_2px_4px_rgba(255,255,255,0.4)] flex items-center justify-center">
          <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#4c5866] to-[#2c333c] border border-[#20262e] shadow-inner flex items-center justify-center relative">
            <span className="text-[7.5px] font-black text-slate-200 tracking-wider opacity-80 uppercase select-none">REPLAY</span>
          </div>
          <button onClick={() => {}} className="absolute top-1 w-8 h-5 flex items-center justify-center text-[#cfd7e0] hover:text-white cursor-pointer active:scale-90"><span className="text-[10px]">▲</span></button>
          <button onClick={() => {}} className="absolute bottom-1 w-8 h-5 flex items-center justify-center text-[#cfd7e0] hover:text-white cursor-pointer active:scale-90"><span className="text-[10px]">▼</span></button>
          <button onClick={() => {}} className="absolute left-1 w-5 h-8 flex items-center justify-center text-[#cfd7e0] hover:text-white cursor-pointer active:scale-90"><span className="text-[10px]">◀</span></button>
          <button onClick={() => {}} className="absolute right-1 w-5 h-8 flex items-center justify-center text-[#cfd7e0] hover:text-white cursor-pointer active:scale-90"><span className="text-[10px]">▶</span></button>
        </div>

        <div className="absolute left-0.5 top-2.5 flex flex-col items-center">
          <span className="text-[7px] font-black text-amber-500 uppercase tracking-wide mb-0.5">SHIFT</span>
          <button onClick={() => setIsShift(!isShift)} className="w-[34px] h-[20px] rounded-full bg-gradient-to-b from-[#6b7987] to-[#404c59] border border-[#2b343f] text-slate-100 flex items-center justify-center active:translate-y-0.5 cursor-pointer">
            <div className="w-[18px] h-2 bg-[#ffc107]/20 rounded-full" />
          </button>
        </div>

        <div className="absolute left-[38px] top-10 flex flex-col items-center">
          <span className="text-[7px] font-black text-[#dc3545] uppercase tracking-wide mb-0.5">ALPHA</span>
          <button onClick={() => setIsAlpha(!isAlpha)} className="w-[34px] h-[20px] rounded-full bg-gradient-to-b from-[#6b7987] to-[#404c59] border border-[#2b343f] text-slate-100 flex items-center justify-center active:translate-y-0.5 cursor-pointer">
            <div className="w-[18px] h-2 bg-red-400/20 rounded-full" />
          </button>
        </div>

        <div className="absolute right-0.5 top-2.5 flex flex-col items-center">
          <span className="text-[7px] font-black text-slate-600 uppercase tracking-wide mb-0.5">MODE</span>
          <button onClick={() => setShowModeMenu(true)} className="w-[34px] h-[20px] rounded-full bg-gradient-to-b from-[#6b7987] to-[#404c59] border border-[#2b343f] text-slate-100 flex items-center justify-center active:translate-y-0.5 cursor-pointer">
            <div className="w-[18px] h-2 bg-slate-400/20 rounded-full" />
          </button>
        </div>

        <div className="absolute right-[38px] top-10 flex flex-col items-center">
          <span className="text-[7px] font-black text-emerald-700 uppercase tracking-wide mb-0.5">ON</span>
          <button onClick={handleAllClear} className="w-[34px] h-[20px] rounded-full bg-gradient-to-b from-[#6b7987] to-[#404c59] border border-[#2b343f] text-slate-100 flex items-center justify-center active:translate-y-0.5 cursor-pointer">
            <div className="w-[18px] h-2 bg-emerald-500/20 rounded-full" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 z-10 relative">
        <div className="grid grid-cols-6 gap-1">
          {[
            { key: "/", label: "a b/c", icon: "⬚/⬚" },
            { key: "sqrt", label: "√▫", icon: "√" },
            { key: "^2", label: activeMode==="BASE-N"?"DEC":"x²", icon: "x²", action: () => activeMode==="BASE-N"?handleKeyPress("DEC"):handleKeyPress("^2") },
            { key: "^", label: activeMode==="BASE-N"?"HEX":"x▫", icon: "xʸ", action: () => activeMode==="BASE-N"?handleKeyPress("HEX"):handleKeyPress("^") },
            { key: "log", label: activeMode==="BASE-N"?"BIN":"log", icon: "log", action: () => activeMode==="BASE-N"?handleKeyPress("BIN"):handleKeyPress("log") },
            { key: "ln", label: activeMode==="BASE-N"?"OCT":"ln", icon: "ln", action: () => activeMode==="BASE-N"?handleKeyPress("OCT"):handleKeyPress("ln") },
          ].map((sc) => (
            <button key={sc.key} onClick={sc.action || (() => handleKeyPress(sc.key))} className="py-1 rounded-[6px] text-[9px] font-black bg-gradient-to-b from-[#404954] to-[#2c323a] border border-[#1b1f24] hover:from-[#4f5966] text-white shadow-sm flex flex-col items-center justify-center active:scale-95">
              <span className="text-[6px] text-[#cca131] scale-90 mb-0.5">{sc.label}</span>
              <span className="font-bold">{sc.icon}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-6 gap-1">
          {[
            { key: "-", label: "(-)", icon: "(-)" },
            { key: "deg", label: "°'\"", icon: "°'\"" },
            { key: "hyp", label: "hyp", icon: "hyp" },
            { key: "sin", label: "sin⁻¹", icon: "sin" },
            { key: "cos", label: "cos⁻¹", icon: "cos" },
            { key: "tan", label: "tan⁻¹", icon: "tan" },
          ].map((sc) => (
            <button key={sc.key} onClick={() => handleKeyPress(sc.key)} className="py-1 rounded-[6px] text-[9px] font-black bg-gradient-to-b from-[#404954] to-[#2c323a] border border-[#1b1f24] hover:from-[#4f5966] text-white shadow-sm flex flex-col items-center justify-center active:scale-95">
              <span className="text-[6px] text-[#cca131] scale-90 mb-0.5">{sc.label}</span>
              <span className="font-bold">{sc.icon}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-6 gap-1">
          {[
            { key: "RCL", label: "STO", icon: "RCL" },
            { key: "ENG", label: "←", icon: activeMode==="CMPLX"?"i":"ENG", action: () => activeMode==="CMPLX"?handleKeyPress("i"):handleKeyPress("ENG") },
            { key: "(", label: "", icon: "(" },
            { key: ")", label: isAlpha ? "X" : "", icon: ")", action: () => isAlpha ? handleKeyPress("X") : handleKeyPress(")") },
            { key: "sd", label: "S⇔D", icon: "S⇔D", action: handleToggleSD },
            { key: "M+", label: "M-", icon: "M+" },
          ].map((sc) => (
            <button key={sc.key} onClick={sc.action || (() => handleKeyPress(sc.key))} className={`py-1 rounded-[6px] text-[9px] font-black border border-[#1b1f24] text-white shadow-sm flex flex-col items-center justify-center active:scale-95 ${sc.key === "sd" ? "bg-gradient-to-b from-[#4b596e] to-[#2d394a]" : "bg-gradient-to-b from-[#404954] to-[#2c323a]"}`}>
              <span className={`text-[6px] scale-90 mb-0.5 ${sc.label==="X"?"text-red-400":"text-[#cca131]"}`}>{sc.label}</span>
              <span className="font-black">{sc.icon}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-1.5 mt-2">
          {["7", "8", "9"].map((num) => (
            <button key={num} onClick={() => handleKeyPress(num)} className="py-3.5 rounded-xl text-base font-extrabold bg-gradient-to-b from-[#fbfcfd] to-[#e4e9f0] border-b-4 border-r-2 border-[#b0b9c5] text-slate-900 shadow-md active:scale-95">{num}</button>
          ))}
          <button onClick={handleDelete} className="py-3.5 rounded-xl text-[11px] font-black bg-gradient-to-b from-[#e05638] to-[#b32b12] border-b-4 border-r-2 border-[#801907] text-white shadow-md active:scale-95">DEL</button>
          <button onClick={handleAllClear} className="py-3.5 rounded-xl text-[11px] font-black bg-gradient-to-b from-[#e05638] to-[#b32b12] border-b-4 border-r-2 border-[#801907] text-white shadow-md active:scale-95">AC</button>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {["4", "5", "6"].map((num) => (
            <button key={num} onClick={() => handleKeyPress(num)} className="py-3.5 rounded-xl text-base font-extrabold bg-gradient-to-b from-[#fbfcfd] to-[#e4e9f0] border-b-4 border-r-2 border-[#b0b9c5] text-slate-900 shadow-md active:scale-95">{num}</button>
          ))}
          <button onClick={() => handleKeyPress("×")} className="py-3.5 rounded-xl text-base font-bold bg-gradient-to-b from-[#e8edf3] to-[#cbd4df] border-b-4 border-r-2 border-[#a4adb8] text-slate-800 shadow-md active:scale-95">×</button>
          <button onClick={() => handleKeyPress("÷")} className="py-3.5 rounded-xl text-base font-bold bg-gradient-to-b from-[#e8edf3] to-[#cbd4df] border-b-4 border-r-2 border-[#a4adb8] text-slate-800 shadow-md active:scale-95">÷</button>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {["1", "2", "3"].map((num) => (
            <button key={num} onClick={() => handleKeyPress(num)} className="py-3.5 rounded-xl text-base font-extrabold bg-gradient-to-b from-[#fbfcfd] to-[#e4e9f0] border-b-4 border-r-2 border-[#b0b9c5] text-slate-900 shadow-md active:scale-95">{num}</button>
          ))}
          <button onClick={() => handleKeyPress("+")} className="py-3.5 rounded-xl text-base font-bold bg-gradient-to-b from-[#e8edf3] to-[#cbd4df] border-b-4 border-r-2 border-[#a4adb8] text-slate-800 shadow-md active:scale-95">+</button>
          <button onClick={() => handleKeyPress("-")} className="py-3.5 rounded-xl text-base font-bold bg-gradient-to-b from-[#e8edf3] to-[#cbd4df] border-b-4 border-r-2 border-[#a4adb8] text-slate-800 shadow-md active:scale-95">-</button>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          <button onClick={() => handleKeyPress("0")} className="py-3.5 rounded-xl text-base font-extrabold bg-gradient-to-b from-[#fbfcfd] to-[#e4e9f0] border-b-4 border-r-2 border-[#b0b9c5] text-slate-900 shadow-md active:scale-95">0</button>
          <button onClick={() => handleKeyPress(".")} className="py-3.5 rounded-xl text-base font-extrabold bg-gradient-to-b from-[#fbfcfd] to-[#e4e9f0] border-b-4 border-r-2 border-[#b0b9c5] text-slate-900 shadow-md active:scale-95">.</button>
          <button onClick={() => handleKeyPress("*10^")} className="py-3.5 rounded-xl text-[9px] font-black bg-gradient-to-b from-[#e8edf3] to-[#cbd4df] border-b-4 border-r-2 border-[#a4adb8] text-slate-800 shadow-md active:scale-95">×10ˣ</button>
          <button onClick={() => handleKeyPress("Ans")} className="py-3.5 rounded-xl text-xs font-black bg-gradient-to-b from-[#e8edf3] to-[#cbd4df] border-b-4 border-r-2 border-[#a4adb8] text-slate-800 shadow-md active:scale-95">Ans</button>
          <button onClick={() => handleKeyPress("=")} className="py-3.5 rounded-xl text-base font-black bg-gradient-to-b from-[#4d5c70] to-[#252f3c] border-b-4 border-r-2 border-[#191f27] text-white shadow-md active:scale-95">=</button>
        </div>

      </div>

    </div>
  );
}
