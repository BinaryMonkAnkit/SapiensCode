export default function LanguageGrid({ languages, onSelect }) {
  return (
    <div className="doc-grid-wrapper">
      <div className="doc-grid-card">
        <div style={{ textAlign: "center" }}>
          <div className="doc-grid-title">Select a language for doc</div>
          <div className="doc-grid-subtitle">
            Choose a language icon to open its official documentation.
          </div>
        </div>

        <div className="doc-grid">
          {languages.map((language) => (
            <button
              key={language.key}
              type="button"
              onClick={() => onSelect(language.key)}
              title={`${language.label} documentation`}
              className="doc-grid-item"
              aria-label={`Open ${language.label} documentation`}
            >
              <img
                src={language.icon}
                alt={language.label}
                className="doc-grid-icon"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
