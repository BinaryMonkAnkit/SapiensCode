export default function DotGridButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Return to language selection"
      title="Return to language selection"
      className="doc-dotgrid-btn"
    >
      <div className="doc-dotgrid-btn-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <span key={index} className="doc-dotgrid-btn-dot" />
        ))}
      </div>
    </button>
  );
}
