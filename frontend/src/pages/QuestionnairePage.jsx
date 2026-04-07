import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { C, font } from "../theme/colors";
import { authFetch } from "../utils/api";
import questions from "../data/questions";

export default function QuestionnairePage({ user, token, onComplete }) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const [customInput, setCustomInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filterQuestions = (answersObj) => {
    return questions.filter(q => {
      if (!q.conditional) return true;
      const conditions = Array.isArray(q.conditional) ? q.conditional : [q.conditional];
      return conditions.every(cond => {
        const val = answersObj[cond.dependsOn];
        if (cond.showIfValue !== undefined) return val === cond.showIfValue;
        if (cond.hideIfValue !== undefined) return val !== cond.hideIfValue;
        return true;
      });
    });
  };
  const getVisibleQuestions = () => filterQuestions(answers);

  const visibleQuestions = getVisibleQuestions();
  const q = visibleQuestions[current];
  const progress = (current / visibleQuestions.length) * 100;

  const isLastOption = selected === q.options.length - 1;
  const needsCustomInput = q.allowCustom && isLastOption;

  const handleNext = async () => {
    if (selected === null) return;
    if (needsCustomInput && !customInput.trim()) return;

    const value = needsCustomInput ? customInput.trim() : selected;
    const updated = { ...answers, [q.id]: value };
    setAnswers(updated);
    setSelected(null);
    setCustomInput("");

    const newVisibleQuestions = filterQuestions(updated);

    if (current < newVisibleQuestions.length - 1) {
      setCurrent(current + 1);
    } else {
      setSubmitting(true);
      try {
        const response = await authFetch(`/api/questionnaire/submit?user_id=${user.user_id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ responses: updated }) }, token);
        if (response.ok) {
          await authFetch(`/api/matches/calculate?user_id=${user.user_id}`, { method: "POST" }, token);
          onComplete(updated);
          navigate("/profile-setup");
        } else { alert("Error submitting questionnaire"); setSubmitting(false); }
      } catch (err) { alert("Network error"); setSubmitting(false); }
    }
  };

  const handleBack = () => {
    if (current > 0) {
      setCurrent(current - 1);
      const prevAnswer = answers[visibleQuestions[current - 1].id];
      if (typeof prevAnswer === "string") {
        setSelected(visibleQuestions[current - 1].options.length - 1);
        setCustomInput(prevAnswer);
      } else {
        setSelected(prevAnswer ?? null);
        setCustomInput("");
      }
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 80, padding: "120px 24px 60px" }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: C.textDim }}>Question {current + 1} of {visibleQuestions.length}</span>
            <span style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: 4, background: C.surfaceLight, borderRadius: 100, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 100, background: "var(--accent)", width: `${progress}%`, transition: "width 0.5s ease", animation: "progressFill 0.5s ease-out" }} />
          </div>
        </div>
        <div key={current} className="anim-fade-up">
          <div style={{ fontSize: 48, marginBottom: 16 }}>{q.icon}</div>
          <h2 style={{ fontFamily: font.display, fontSize: 28, fontWeight: 700, marginBottom: 32, letterSpacing: "-0.02em", lineHeight: 1.3 }}>{q.question}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {q.options.map((opt, i) => {
              const isSelected = selected === i;
              return (
                <button key={i} onClick={() => setSelected(i)} style={{ padding: "16px 20px", borderRadius: 12, border: "1.5px solid", borderColor: isSelected ? "var(--accent)" : "var(--border)", background: isSelected ? "rgba(99,102,241,0.08)" : "var(--surface-light)", color: isSelected ? "var(--accent)" : C.text, fontFamily: font.body, fontSize: 15, fontWeight: isSelected ? 600 : 400, textAlign: "left", cursor: "pointer", transition: "all 0.2s ease", transform: isSelected ? "scale(1.02)" : "scale(1)" }}>
                  <span style={{ display: "inline-block", width: 22, height: 22, borderRadius: 6, border: `2px solid ${isSelected ? C.accent : C.border}`, background: isSelected ? C.accent : "transparent", marginRight: 14, verticalAlign: "middle", textAlign: "center", lineHeight: "18px", fontSize: 12, color: C.bg }}>{isSelected ? "✓" : ""}</span>
                  {opt}
                </button>
              );
            })}
            {needsCustomInput && (
              <input
                className="input-field"
                placeholder={q.id === "budget" ? "Enter your budget (e.g., $1600)" : q.id === "program" ? "Enter your program" : "Specify..."}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                autoFocus
                style={{ marginTop: 8 }}
              />
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40 }}>
            <button className="btn-secondary" style={{ padding: "12px 24px", fontSize: 14, opacity: current === 0 ? 0.3 : 1, pointerEvents: current === 0 ? "none" : "auto" }} onClick={handleBack}>← Back</button>
            <button className="btn-primary" style={{ padding: "12px 32px", fontSize: 14, opacity: selected === null || submitting ? 0.4 : 1, pointerEvents: selected === null || submitting ? "none" : "auto" }} onClick={handleNext}>
              {submitting ? "Submitting..." : current === visibleQuestions.length - 1 ? "Find matches →" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
