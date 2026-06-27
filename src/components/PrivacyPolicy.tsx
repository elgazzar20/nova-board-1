import React from "react";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";

interface PrivacyPolicyProps {
  language: "ar" | "en";
  onBack: () => void;
}

export function PrivacyPolicy({ language, onBack }: PrivacyPolicyProps) {
  const isAr = language === "ar";
  
  return (
    <div
      className="w-full min-h-screen bg-slate-50/70 text-slate-900 font-sans flex flex-col relative overflow-x-hidden antialiased"
      dir={isAr ? "rtl" : "ltr"}
    >
      <header className="w-full py-4 px-6 md:px-12 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-lg font-black shadow-lg shadow-indigo-600/30">
            N
          </div>
          <span className="font-extrabold text-xl text-slate-900 tracking-tight">
            Nova<span className="text-indigo-600">Board</span>
          </span>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {isAr ? "العودة للرئيسية" : "Back to Home"}
        </button>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
          <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-8">
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
              {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
            </h1>
          </div>

          <div className="prose prose-slate max-w-none">
            {isAr ? (
              <div className="flex flex-col gap-6 text-slate-700 leading-relaxed">
                <p>
                  نحن في <strong>نوفا بورد (NovaBoard)</strong> نولي أهمية قصوى لخصوصية زوارنا ومستخدمينا. توضح سياسة الخصوصية هذه أنواع المعلومات الشخصية التي نجمعها وكيفية استخدامها وحمايتها، بما يتوافق مع متطلبات برنامج جوجل أدسنس (Google AdSense) والجهات التنظيمية الأخرى.
                </p>

                <h3 className="text-xl font-bold text-slate-900 mt-4">1. جمع المعلومات واستخدامها</h3>
                <p>
                  نحن نستخدم تقنيات مثل ملفات تعريف الارتباط (Cookies) لجمع معلومات حول تفضيلات الزوار، ولتسجيل معلومات خاصة بالمستخدم حول الصفحات التي يزورها، وذلك بهدف تخصيص محتوى صفحة الويب استنادًا إلى نوع المتصفح أو أي معلومات أخرى يرسلها الزائر عبر متصفحه.
                </p>

                <h3 className="text-xl font-bold text-slate-900 mt-4">2. إعلانات جوجل أدسنس و ملفات تعريف الارتباط (DART)</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>تستخدم جوجل بصفتها مورداً مالياً جهة خارجية، ملفات تعريف الارتباط لعرض الإعلانات على موقعنا.</li>
                  <li>استخدام جوجل لملف تعريف الارتباط DART يُمكّنها من عرض الإعلانات للمستخدمين استنادًا إلى زياراتهم لموقعنا والمواقع الأخرى على الإنترنت.</li>
                  <li>يجوز للمستخدمين اختيار عدم استخدام ملف تعريف الارتباط DART عن طريق زيارة سياسة الخصوصية الخاصة بإعلانات جوجل وشبكة المحتوى.</li>
                </ul>

                <h3 className="text-xl font-bold text-slate-900 mt-4">3. شركاء الإعلانات (Third-Party Advertisers)</h3>
                <p>
                  قد يستخدم شركاء الإعلانات الآخرين (مثل Google AdSense) ملفات تعريف الارتباط وإشارات الويب (Web Beacons) على موقعنا لقياس فعالية إعلاناتهم وتخصيص محتوى الإعلانات الذي تراه. ليس لدى موقعنا أي تحكم أو صلاحية على ملفات تعريف الارتباط هذه التي يستخدمها معلنون من جهات خارجية.
                </p>

                <h3 className="text-xl font-bold text-slate-900 mt-4">4. أمن البيانات</h3>
                <p>
                  نحن نتخذ كافة الإجراءات الأمنية المناسبة لحماية بياناتك من الوصول غير المصرح به أو التعديل أو الإفصاح أو الإتلاف. ومع ذلك، لا توجد وسيلة نقل عبر الإنترنت آمنة بنسبة 100٪.
                </p>

                <h3 className="text-xl font-bold text-slate-900 mt-4">5. موافقتك</h3>
                <p>
                  باستخدامك لموقعنا، فإنك توافق على سياسة الخصوصية الخاصة بنا وعلى شروطها. إذا كنت بحاجة إلى مزيد من المعلومات أو لديك أية أسئلة عن سياسة الخصوصية، لا تتردد في الاتصال بنا.
                </p>
                
                <p className="mt-8 text-sm text-slate-500">
                  آخر تحديث: {new Date().toLocaleDateString('ar-EG')}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6 text-slate-700 leading-relaxed">
                <p>
                  At <strong>NovaBoard</strong>, the privacy of our visitors is of extreme importance to us. This privacy policy document outlines the types of personal information that is received and collected by our application and how it is used, in compliance with Google AdSense and other regulatory requirements.
                </p>

                <h3 className="text-xl font-bold text-slate-900 mt-4">1. Information Collection and Use</h3>
                <p>
                  We use cookies to store information about visitors' preferences, to record user-specific information on which pages the site visitor accesses or visits, and to personalize or customize our web page content based upon visitors' browser type or other information that the visitor sends via their browser.
                </p>

                <h3 className="text-xl font-bold text-slate-900 mt-4">2. Google AdSense and DoubleClick DART Cookie</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Google, as a third party vendor, uses cookies to serve ads on our site.</li>
                  <li>Google's use of the DART cookie enables it to serve ads to our site's users based upon their visit to our site and other sites on the Internet.</li>
                  <li>Users may opt out of the use of the DART cookie by visiting the Google ad and content network privacy policy.</li>
                </ul>

                <h3 className="text-xl font-bold text-slate-900 mt-4">3. Third-Party Advertisers</h3>
                <p>
                  Other third-party ad servers or ad networks may also use cookies and web beacons on our site to measure the effectiveness of their advertisements and to personalize the advertising content that you see. NovaBoard has no access to or control over these cookies that are used by third-party advertisers.
                </p>

                <h3 className="text-xl font-bold text-slate-900 mt-4">4. Data Security</h3>
                <p>
                  We take appropriate security measures to protect your data against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.
                </p>

                <h3 className="text-xl font-bold text-slate-900 mt-4">5. Consent</h3>
                <p>
                  By using our website, you hereby consent to our privacy policy and agree to its terms. If you require any more information or have any questions about our privacy policy, please feel free to contact us.
                </p>

                <p className="mt-8 text-sm text-slate-500">
                  Last updated: {new Date().toLocaleDateString('en-US')}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
