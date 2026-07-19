import { Loader } from "lucide-react";

function LiveDots() {
  return (
    <span className="doc-loading-dots" aria-hidden="true">
      <span>.</span>
      <span>.</span>
      <span>.</span>
    </span>
  );
}

export default function LoadingOverlay() {
  return (
    <div className="doc-loading-overlay" role="status" aria-live="polite">
      <div className="doc-loading-content">
        <Loader className="doc-spinner" size={22} />
        <span>
          Loading
          <LiveDots />
        </span>
      </div>
    </div>
  );
}
