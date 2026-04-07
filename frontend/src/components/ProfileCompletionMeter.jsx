import { useNavigate } from "react-router-dom";
import { C, font } from "../theme/colors";
import { ClipboardList, PenLine, Camera, Check, Circle } from "lucide-react";

export default function ProfileCompletionMeter({ profileData }) {
  const navigate = useNavigate();

  if (!profileData) return null;

  const hasBio = profileData.bio && profileData.bio.trim().length > 0;
  const hasProfilePic = !!profileData.profile_pic_url;
  const hasQuestionnaire = profileData.questionnaire_completed;

  const completionItems = [
    { key: "questionnaire", label: "Questionnaire", completed: hasQuestionnaire, icon: <ClipboardList size={15} /> },
    { key: "bio", label: "Bio", completed: hasBio, icon: <PenLine size={15} /> },
    { key: "picture", label: "Profile Picture", completed: hasProfilePic, icon: <Camera size={15} /> }
  ];

  const completedCount = completionItems.filter(item => item.completed).length;
  const percentage = Math.round((completedCount / completionItems.length) * 100);
  const isComplete = percentage === 100;

  if (isComplete) return null;

  return (
    <div className="anim-fade-up" style={{ background: "rgba(99,102,241,0.06)", border: "1.5px solid rgba(99,102,241,0.18)", borderRadius: 16, padding: 20, marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: font.display, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Complete Your Profile</div>
          <div style={{ fontSize: 14, color: C.textMuted }}>Boost your match visibility by {100 - percentage}%</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: font.display, fontSize: 32, fontWeight: 900, color: C.accent, lineHeight: 1 }}>{percentage}%</div>
          <div style={{ fontSize: 11, color: C.textDim }}>complete</div>
        </div>
      </div>

      <div style={{ background: C.surfaceLight, borderRadius: 100, height: 8, marginBottom: 16, overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-soft))", height: "100%", width: `${percentage}%`, transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)", borderRadius: 100 }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {completionItems.map(item => (
          <div key={item.key} style={{ background: item.completed ? "rgba(16,185,129,0.08)" : C.surface, border: `1px solid ${item.completed ? C.green : C.border}`, borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "flex", alignItems: "center", color: item.completed ? C.green : C.textMuted }}>{item.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: item.completed ? C.green : C.text }}>{item.label}</div>
            </div>
            {item.completed ? <Check size={15} color="#10B981" /> : <Circle size={14} color="var(--text-dim)" />}
          </div>
        ))}
      </div>

      {!isComplete && (
        <button className="btn-primary" style={{ width: "100%", marginTop: 16, padding: "12px", fontSize: 14 }} onClick={() => navigate("/profile")}>
          Complete Profile →
        </button>
      )}
    </div>
  );
}
