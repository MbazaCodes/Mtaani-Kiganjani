import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Search, HelpCircle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export function NotFound() {
  const navigate = useNavigate();
  const onNavigate = (view: "dashboard" | "services") =>
    navigate(view === "dashboard" ? "/dashboard" : "/services");
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-linear-to-br from-stone-50 to-stone-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full text-center"
      >
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="relative inline-block">
            <motion.div
              className="text-[150px] font-black text-emerald-100 leading-none"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              404
            </motion.div>
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ rotate: -10 }}
              animate={{ rotate: 0 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <div className="bg-white rounded-full p-6 shadow-xl">
                <Search size={48} className="text-emerald-600" />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-3xl font-bold text-stone-800 mb-3">
          {lang === "sw" ? "Ukurasa Haujapatikana" : "Page Not Found"}
        </h1>
        <p className="text-stone-500 mb-8 max-w-sm mx-auto">
          {lang === "sw"
            ? "Samahani, ukurasa unaoutafuta haupo au umehamishiwa mahali pengine."
            : "Sorry, the page you are looking for does not exist or has been moved."}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate("dashboard")}
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
          >
            <Home size={20} />
            {lang === "sw" ? "Rudi Nyumbani" : "Go Home"}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate("services")}
            className="inline-flex items-center justify-center gap-2 bg-white text-stone-700 px-6 py-3 rounded-xl font-bold hover:bg-stone-50 transition-colors border border-stone-200"
          >
            <ArrowLeft size={20} />
            {lang === "sw" ? "Angalia Huduma" : "Browse Services"}
          </motion.button>
        </div>

        {/* Help Link */}
        <div className="mt-8 pt-6 border-t border-stone-200">
          <p className="text-sm text-stone-400 flex items-center justify-center gap-2">
            <HelpCircle size={16} />
            {lang === "sw"
              ? "Unahitaji msaada? Wasiliana na msaada wa wateja."
              : "Need help? Contact customer support."}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
