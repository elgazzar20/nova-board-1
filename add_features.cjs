const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldFeaturesStart = '            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-start">';
const oldFeaturesEnd = '            </div>\n          </main>\n        </div>';

const startIndex = code.indexOf(oldFeaturesStart);
const endIndex = code.indexOf(oldFeaturesEnd, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-start">
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

            <div className="mt-24 w-full flex flex-col items-center">
               <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-12">
                 {language === 'ar' ? 'مميزات تجعلها خيارك الأول' : 'Features that make it your first choice'}
               </h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full text-start max-w-5xl mx-auto px-4 md:px-0">
                 
                 <div className="flex flex-col md:flex-row items-start gap-4 p-6 bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 shrink-0 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center shadow-inner">
                      <Zap size={24} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-800 mb-1">{language === 'ar' ? 'سرعة فائقة' : 'Lightning Fast'}</h4>
                      <p className="text-slate-500 text-sm leading-relaxed">{language === 'ar' ? 'تصميم خفيف الوزن يعمل بسلاسة على جميع الأجهزة دون تقطيع أو تأخير.' : 'Lightweight design that runs smoothly on all devices without lag.'}</p>
                    </div>
                 </div>

                 <div className="flex flex-col md:flex-row items-start gap-4 p-6 bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 shrink-0 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shadow-inner">
                      <Share2 size={24} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-800 mb-1">{language === 'ar' ? 'مشاركة سهلة' : 'Easy Sharing'}</h4>
                      <p className="text-slate-500 text-sm leading-relaxed">{language === 'ar' ? 'شارك سبورتك مع طلابك بضغطة زر واحدة كصورة عالية الدقة أو كملف PDF شامل.' : 'Share your board with students with a single click as an image or comprehensive PDF.'}</p>
                    </div>
                 </div>

                 <div className="flex flex-col md:flex-row items-start gap-4 p-6 bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 shrink-0 bg-cyan-100 text-cyan-600 rounded-2xl flex items-center justify-center shadow-inner">
                      <Grid size={24} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-800 mb-1">{language === 'ar' ? 'شبكات إحداثية متنوعة' : 'Versatile Grids'}</h4>
                      <p className="text-slate-500 text-sm leading-relaxed">{language === 'ar' ? 'دعم لشبكات المربعات، النقاط، والأسطر لتسهيل شرح الرياضيات واللغات بشكل دقيق.' : 'Square grids, dots, and lines to facilitate teaching math and languages precisely.'}</p>
                    </div>
                 </div>

                 <div className="flex flex-col md:flex-row items-start gap-4 p-6 bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 shrink-0 bg-fuchsia-100 text-fuchsia-600 rounded-2xl flex items-center justify-center shadow-inner">
                      <Settings size={24} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-800 mb-1">{language === 'ar' ? 'تخصيص كامل' : 'Full Customization'}</h4>
                      <p className="text-slate-500 text-sm leading-relaxed">{language === 'ar' ? 'تحكم كامل في ألوان الأقلام، أحجام الخطوط، وإضافة أشكال هندسية متعددة.' : 'Full control over pen colors, font sizes, and multiple geometric shapes.'}</p>
                    </div>
                 </div>

               </div>
            </div>
          </main>

          {/* Footer Designer Contact */}
          <footer className="w-full mt-10 pb-10 pt-16 border-t border-slate-200/50 flex flex-col items-center justify-center text-slate-500 relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 w-full max-w-2xl px-6">
              <div className="flex items-center gap-2 font-bold text-slate-700 text-lg">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                  <Sparkles size={20} className="text-indigo-500" />
                </div>
                <span>{language === 'ar' ? 'تصميم وتطوير: محمود' : 'Designed & Developed by: Mahmoud'}</span>
              </div>
              <a href="https://wa.me/201000000000" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-md hover:text-emerald-700 transition-colors bg-emerald-50 text-emerald-600 px-5 py-2.5 rounded-full font-bold shadow-sm border border-emerald-100 hover:scale-105 active:scale-95">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                <span dir="ltr">+20 100 000 0000</span>
              </a>
            </div>
            <p className="text-sm mt-8 text-slate-400 font-medium">© 2026 NovaBoard - All rights reserved.</p>
          </footer>
        </div>`;

  const newCode = code.substring(0, startIndex) + replacement + code.substring(endIndex + oldFeaturesEnd.length);
  fs.writeFileSync('src/App.tsx', newCode, 'utf8');
  console.log('Successfully updated landing page features and footer');
} else {
  console.log('Could not find boundaries for landing page replacement');
}
