import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { SiWhatsapp } from "react-icons/si";
import { X } from "lucide-react";

const WA_NUMBER = "917877082223";
const WA_MESSAGE = encodeURIComponent("Hello! Mujhe ek reading book karni hai. Kya aap available hain?");

export function WhatsAppButton() {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end gap-3">
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="relative bg-white text-[#0a0a1a] rounded-2xl px-5 py-4 shadow-2xl max-w-[220px] text-sm font-medium"
          >
            <button
              onClick={() => setShowTooltip(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3 h-3" />
            </button>
            <p className="pr-4 leading-snug">
              💬 <strong>WhatsApp pe chat karein</strong> — booking, queries, ya koi bhi sawaal!
            </p>
            <div className="absolute bottom-[-8px] right-6 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.a
        href={`https://wa.me/${WA_NUMBER}?text=${WA_MESSAGE}`}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.5, type: "spring", stiffness: 200 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(37,211,102,0.5)] hover:shadow-[0_4px_30px_rgba(37,211,102,0.7)] transition-shadow duration-300"
        data-testid="whatsapp-float-btn"
        aria-label="Chat on WhatsApp"
      >
        <SiWhatsapp className="w-8 h-8 text-white" />
        {/* Pulse ring */}
        <span className="absolute w-16 h-16 rounded-full bg-[#25D366]/40 animate-ping" />
      </motion.a>
    </div>
  );
}
