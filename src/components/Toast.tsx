import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
}

export default function Toast({ message, type, isVisible, onClose }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-green-600" />,
    error: <AlertCircle className="w-5 h-5 text-red-600" />,
    info: <Info className="w-5 h-5 text-blue-600" />
  };

  const bgColors = {
    success: 'bg-green-50 border-green-100',
    error: 'bg-red-50 border-red-100',
    info: 'bg-blue-50 border-blue-100'
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className={cn(
            "fixed bottom-10 left-10 z-[100] flex items-center gap-4 px-6 py-4 shadow-2xl border min-w-[300px]",
            bgColors[type]
          )}
        >
          {icons[type]}
          <p className="flex-1 font-sans text-xs font-black uppercase tracking-widest text-editorial-text leading-tight">
            {message}
          </p>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-black/5 transition-colors"
          >
            <X size={14} className="opacity-40" />
          </button>
          <div className="absolute top-0 left-0 h-[2px] bg-editorial-text/10 w-full overflow-hidden">
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "0%" }}
              transition={{ duration: 5, ease: "linear" }}
              className="h-full bg-editorial-text w-full"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
