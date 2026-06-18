import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Star, Send, X, MessageSquare } from "lucide-react";

interface SatisfactionSurveyProps {
  applicationId: string;
  applicationNumber: string;
  serviceName: string;
  userId: string;
  lang: string;
  onClose: () => void;
}

export const SatisfactionSurvey: React.FC<SatisfactionSurveyProps> = ({
  applicationId,
  applicationNumber,
  serviceName,
  userId,
  lang,
  onClose,
}) => {
  const sw = lang === "sw";
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSending(true);
    try {
      await supabase.from("satisfaction_surveys").insert({
        application_id: applicationId,
        user_id: userId,
        rating,
        comment: comment.trim() || null,
        service_name: serviceName,
      });
      setSubmitted(true);
    } catch {
      // Silently fail — survey is optional
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
        <p className="text-sm font-bold text-emerald-700 mb-1">
          {sw ? "Asante kwa maoni yako!" : "Thank you for your feedback!"}
        </p>
        <p className="text-xs text-emerald-600">
          {sw
            ? "Maoni yako yatasaidia kuboresha huduma zetu."
            : "Your feedback helps us improve our services."}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-amber-600" />
          <p className="text-xs font-black text-amber-800 uppercase tracking-wider">
            {sw ? "Tathmini Huduma" : "Rate This Service"}
          </p>
        </div>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
          <X size={14} />
        </button>
      </div>
      <p className="text-xs text-stone-600 mb-3">
        {sw
          ? `Ulikuwaje na huduma ya ${serviceName} (${applicationNumber})?`
          : `How was your experience with ${serviceName} (${applicationNumber})?`}
      </p>

      {/* Star rating */}
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="p-0.5"
          >
            <Star
              size={28}
              className={`transition-colors ${
                star <= (hover || rating) ? "text-amber-500 fill-amber-500" : "text-stone-300"
              }`}
            />
          </button>
        ))}
        <span className="text-xs text-stone-500 ml-2 self-center">
          {rating > 0 &&
            (rating === 1
              ? sw
                ? "Mbaya"
                : "Poor"
              : rating === 2
                ? sw
                  ? "Wastani"
                  : "Fair"
                : rating === 3
                  ? sw
                    ? "Nzuri"
                    : "Good"
                  : rating === 4
                    ? sw
                      ? "Nzuri Sana"
                      : "Very Good"
                    : sw
                      ? "Bora"
                      : "Excellent")}
        </span>
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder={sw ? "Maoni yako (si lazima)..." : "Your comments (optional)..."}
        className="w-full text-sm bg-white border border-amber-200 rounded-xl px-3 py-2 resize-none placeholder-stone-400 mb-3"
      />

      <button
        onClick={handleSubmit}
        disabled={rating === 0 || sending}
        className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
      >
        <Send size={14} />
        {sw ? "Tuma Tathmini" : "Submit Rating"}
      </button>
    </div>
  );
};
