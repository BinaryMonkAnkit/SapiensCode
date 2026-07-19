export default function DocFrame({ language, onLoad }) {
  return (
    <div className="doc-frame-wrapper">
      <iframe
        src={language.url}
        title={`${language.label} Documentation`}
        onLoad={onLoad}
        className="doc-iframe"
      />
    </div>
  );
}
