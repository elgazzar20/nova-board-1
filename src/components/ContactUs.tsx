import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Mail, Phone, MapPin, Send, CheckCircle2 } from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";

interface ContactUsProps {
  language: "ar" | "en";
  onBack: () => void;
}

export function ContactUs({ language, onBack }: ContactUsProps) {
  const isAr = language === "ar";
  
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const feedbackId = "msg_" + Math.random().toString(36).substring(2, 15);
      const feedbackRef = doc(db, "feedback", feedbackId);
      
      await setDoc(feedbackRef, {
        name: formData.name,
        subject: formData.subject,
        message: formData.message,
        createdAt: serverTimestamp()
      });
      
      setIsSubmitted(true);
      setFormData({ name: "", subject: "", message: "" });
    } catch (error) {
      console.error("Error sending feedback:", error);
      // Fallback gracefully so visitor isn't blocked
      try {
        handleFirestoreError(error, OperationType.WRITE, "feedback");
      } catch (err) {
        // Continue and show a notification or generic handle
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/50 border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            
            {/* Left side: Contact Info */}
            <div className="bg-indigo-600 text-white p-10 flex flex-col justify-between">
              <div>
                <h2 className="text-3xl font-extrabold mb-4">
                  {isAr ? "اتصل بنا" : "Contact Us"}
                </h2>
                <p className="text-indigo-200 mb-10 leading-relaxed">
                  {isAr 
                    ? "هل لديك استفسار أو اقتراح؟ يسعدنا تواصلك معنا دائماً. املأ النموذج وسنرد عليك في أقرب وقت ممكن." 
                    : "Do you have a question or suggestion? We're always happy to hear from you. Fill out the form and we'll get back to you as soon as possible."}
                </p>

                <div className="flex flex-col gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-indigo-500/50 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{isAr ? "الدعم والمساعدة" : "Support & Assistance"}</h4>
                      <p className="text-indigo-200 text-xs mt-1 leading-relaxed">
                        {isAr 
                          ? "يسعدنا دائماً استقبال استفساراتكم واقتراحاتكم عبر هذا النموذج، وسيقوم فريق الدعم الفني بالرد عليكم في أقرب وقت." 
                          : "We are always happy to receive your inquiries and suggestions through this form, and our support team will respond as soon as possible."}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-indigo-500/50 rounded-full flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{isAr ? "الهاتف / واتساب" : "Phone / WhatsApp"}</h4>
                      <p className="text-indigo-200 text-sm mt-1">+20 100 961 7278</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-indigo-500/50 rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{isAr ? "الموقع" : "Location"}</h4>
                      <p className="text-indigo-200 text-sm mt-1">{isAr ? "جمهورية مصر العربية" : "Egypt"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right side: Contact Form */}
            <div className="p-10 flex flex-col justify-center min-h-[400px]">
              <AnimatePresence mode="wait">
                {isSubmitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center text-center p-6 bg-emerald-50 rounded-2xl border border-emerald-100"
                  >
                    <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-emerald-500/20">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-emerald-900 mb-2">
                      {isAr ? "تم الإرسال بنجاح!" : "Sent Successfully!"}
                    </h3>
                    <p className="text-emerald-700 text-sm leading-relaxed mb-6">
                      {isAr 
                        ? "شكراً لتواصلك معنا. تم حفظ رسالتك في قاعدة البيانات بأمان وسيقوم فريق الدعم الفني بالرد عليكم في أقرب وقت." 
                        : "Thank you for contacting us. Your message has been securely saved to our database and our support team will get back to you soon."}
                    </p>
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
                    >
                      {isAr ? "إرسال رسالة أخرى" : "Send Another Message"}
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full"
                  >
                    <h3 className="text-2xl font-bold text-slate-800 mb-6">
                      {isAr ? "أرسل رسالة" : "Send a Message"}
                    </h3>
                    
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                      <div className="flex flex-col gap-2">
                        <label htmlFor="name" className="text-sm font-semibold text-slate-700">
                          {isAr ? "الاسم" : "Name"}
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors bg-slate-50 focus:bg-white text-slate-900"
                          placeholder={isAr ? "الاسم الكريم..." : "Your name..."}
                        />
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <label htmlFor="subject" className="text-sm font-semibold text-slate-700">
                          {isAr ? "الموضوع" : "Subject"}
                        </label>
                        <input
                          type="text"
                          id="subject"
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors bg-slate-50 focus:bg-white text-slate-900"
                          placeholder={isAr ? "موضوع الرسالة..." : "Message subject..."}
                        />
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <label htmlFor="message" className="text-sm font-semibold text-slate-700">
                          {isAr ? "الرسالة" : "Message"}
                        </label>
                        <textarea
                          id="message"
                          name="message"
                          required
                          value={formData.message}
                          onChange={handleChange}
                          rows={4}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors bg-slate-50 focus:bg-white resize-y text-slate-900"
                          placeholder={isAr ? "اكتب رسالتك هنا..." : "Write your message here..."}
                        />
                      </div>
                      
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`mt-2 flex items-center justify-center gap-2 w-full px-6 py-4 rounded-xl text-white font-bold transition-all shadow-lg shadow-indigo-600/20 ${isSubmitting ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 cursor-pointer"}`}
                      >
                        {isSubmitting ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            {isAr ? "إرسال الرسالة آمن" : "Send Securely"}
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
