import DotGridButton from "./DotGridButton";

export default function LanguageBadge({ language, onBack }) {
  return (
    <div className="doc-language-badge">
      <DotGridButton onClick={onBack} />
      <span className="doc-language-badge-label">{language.label}</span>
    </div>
  );
}
