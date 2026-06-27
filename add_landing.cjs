const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const returnStatement = "  return (\n    <>";
const landingCode = `
      {view === 'landing' ? (
        <div className="w-full min-h-screen bg-[#fafbfc] text-[#0f172a] font-sans flex flex-col relative overflow-x-hidden antialiased scroll-smooth selection:bg-indigo-100 selection:text-indigo-900 animate-in fade-in-50 duration-500" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />
          
          <div className="absolute w-[500px] h-[500px] rounded-full bg-indigo-100/40 blur-[120px] -top-80 left-1/2 -translate-x-1/2 pointer-events-none" />
          <div className="absolute w-[300px] h-[300px] rounded-full bg-violet-100/40 blur-[100px] top-60 left-1/4 pointer-events-none" />

          <nav className="w-full py-4 px-6 md:px-12 border-b border-slate-200/50 bg-white/70 backdrop-blur-xl sticky top-0 z-50 flex items-center justify-between transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 hover:rotate-6 transition-all duration-300">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 21 1.9-1.9a1 1 0 0 0 0-1.4l-1.4-1.4a1 1 0 0 0-1.4 0L.3 18.2"/>
                  <path d="m5 19 14-14"/>
                  <path d="m15 5 1.4-1.4a1 1 0 0 1 1.4 0l1.4 1.4a1 1 0 0 1 0 1.4L17.8 7.8"/>
                  <path d="m19 13 2 2"/>
                  <path d="m13 19 2 2"/>
                </svg>
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-800">
                Nova<span className="text-indigo-600">Board</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
                className="px-3 py-1.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {language === 'ar' ? 'English' : 'عربي'}
              </button>
              <button 
                onClick={() => setView('whiteboard')}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-md hover:bg-slate-800 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                {language === 'ar' ? 'الذهاب للسبورة' : 'Go to Whiteboard'}
              </button>
            </div>
          </nav>

          <main className="flex-1 flex flex-col items-center justify-center p-6 text-center relative z-10 max-w-4xl mx-auto pt-20 pb-32">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold mb-8 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              {language === 'ar' ? 'النسخة 2.0 أصبحت متاحة' : 'Version 2.0 is now available'}
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">
              {language === 'ar' ? (
                <>
                  السبورة التفاعلية الأمثل <br/> 
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">للمعلمين المبدعين</span>
                </>
              ) : (
                <>
                  The elegant whiteboard crafted for <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">visionary educators</span>
                </>
              )}
            </h1>
            
            <p className="text-slate-500 text-lg md:text-xl font-medium max-w-2xl mb-10 leading-relaxed">
              {language === 'ar' 
                ? 'ارتقِ بأسلوب تدريسك. واجهة ذكية، أدوات هندسية، حفظ تلقائي، وتجربة سلسة تركز على الإبداع.'
                : 'Elevate your teaching. Smart interface, geometric tools, auto-save, and a seamless experience focused on creativity.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button 
                onClick={() => setView('whiteboard')}
                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-lg font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 w-full sm:w-auto justify-center group cursor-pointer"
              >
                {language === 'ar' ? 'ابدأ الشرح الآن' : 'Start Teaching Now'}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={\`transition-transform group-hover:\${language === 'ar' ? '-translate-x-1' : 'translate-x-1'}\`}>
                  {language === 'ar' ? <path d="m15 18-6-6 6-6"/> : <path d="m9 18 6-6-6-6"/>}
                </svg>
              </button>
            </div>
            
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-start">
               <div className="p-6 bg-white/60 backdrop-blur border border-slate-200/50 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                 <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-inner">
                   <PenTool size={20} />
                 </div>
                 <h3 className="text-slate-800 font-bold mb-2">{language === 'ar' ? 'أدوات رسم متطورة' : 'Advanced Drawing Tools'}</h3>
                 <p className="text-slate-500 text-sm font-medium leading-relaxed">{language === 'ar' ? 'أقلام متنوعة، ألوان زاهية، وأدوات هندسية متكاملة' : 'Various pens, vivid colors, and integrated geometric tools'}</p>
               </div>
               <div className="p-6 bg-white/60 backdrop-blur border border-slate-200/50 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                 <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4 shadow-inner">
                   <Layers size={20} />
                 </div>
                 <h3 className="text-slate-800 font-bold mb-2">{language === 'ar' ? 'إدارة الصفحات' : 'Page Management'}</h3>
                 <p className="text-slate-500 text-sm font-medium leading-relaxed">{language === 'ar' ? 'إضافة وتصفح الصفحات بسهولة مع إمكانية التصدير كملف PDF' : 'Easily add and browse pages with the ability to export as PDF'}</p>
               </div>
               <div className="p-6 bg-white/60 backdrop-blur border border-slate-200/50 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                 <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-4 shadow-inner">
                   <Globe size={20} />
                 </div>
                 <h3 className="text-slate-800 font-bold mb-2">{language === 'ar' ? 'حفظ سحابي' : 'Cloud Save'}</h3>
                 <p className="text-slate-500 text-sm font-medium leading-relaxed">{language === 'ar' ? 'السبورة تحفظ بياناتك تلقائياً للرجوع إليها في أي وقت' : 'The whiteboard saves your data automatically to return to it anytime'}</p>
               </div>
            </div>
          </main>
        </div>
      ) : (
`;

const closingCode = `
        </div>
      )}
    </>
  );
}
`;

const newCode = code.replace(returnStatement, returnStatement + "\n" + landingCode);
const finalCode = newCode.replace(/\s*<\/div>\n\s*<\/>\n\s*\);\n}\n?$/, closingCode);

fs.writeFileSync('src/App.tsx', finalCode, 'utf8');
console.log('Successfully added landing page back');
