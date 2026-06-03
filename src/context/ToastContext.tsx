import React, { createContext, useContext, useCallback } from "react";
import { ToastContainer, toast, ToastOptions, Bounce } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface ToastContextType {
  showToast: (message: string, type?: "success" | "error" | "warning" | "info") => void;
  showPromise: (
    promise: Promise<any>,
    messages: { pending: string; success: string; error: string },
  ) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const showToast = useCallback(
    (message: string, type: "success" | "error" | "warning" | "info" = "info") => {
      const options: ToastOptions = {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
        transition: Bounce,
      };

      switch (type) {
        case "success":
          toast.success(message, options);
          break;
        case "error":
          toast.error(message, options);
          break;
        case "warning":
          toast.warning(message, options);
          break;
        default:
          toast.info(message, options);
      }
    },
    [],
  );

  const showPromise = useCallback(
    (promise: Promise<any>, messages: { pending: string; success: string; error: string }) => {
      return toast.promise(promise, messages, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ showToast, showPromise }}>
      {children}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        transition={Bounce}
      />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};
