import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "info" | "success";
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "info",
}: ConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  type === "danger"
                    ? "bg-red-50 text-red-600"
                    : type === "success"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-blue-50 text-blue-600"
                }`}
              >
                <AlertCircle size={24} />
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400"
              >
                <X size={20} />
              </button>
            </div>

            <h3 className="text-xl font-black text-stone-900 mb-2">{title}</h3>
            <p className="text-stone-500 font-medium leading-relaxed mb-8">{message}</p>

            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 h-14 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 h-14 text-white rounded-2xl font-bold transition-all shadow-lg ${
                  type === "danger"
                    ? "bg-red-600 hover:bg-red-700 shadow-red-200"
                    : type === "success"
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                      : "bg-stone-900 hover:bg-black shadow-stone-200"
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
