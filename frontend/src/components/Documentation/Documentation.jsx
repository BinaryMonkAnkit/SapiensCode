import { useEffect, useState } from "react";
import { languageOptions } from "./data/languageOptions";
import LoadingOverlay from "./components/LoadingOverlay";
import LanguageBadge from "./components/LanguageBadge";
import LanguageGrid from "./components/LanguageGrid";
import DocFrame from "./components/DocFrame";
import "./documentation.css";

export default function Documentation() {
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const activeLanguage = languageOptions.find(
    (language) => language.key === selectedLanguage,
  );

  useEffect(() => {
    if (!selectedLanguage) {
      const timer = window.setTimeout(() => setIsLoading(false), 900);
      return () => window.clearTimeout(timer);
    }
    setIsLoading(true);
    return undefined;
  }, [selectedLanguage]);

  const handleLanguageSelect = (languageKey) => {
    setSelectedLanguage(languageKey);
    setIsLoading(true);
  };

  const handleDocLoad = () => setIsLoading(false);

  return (
    <div className="doc-root">
      {isLoading ? <LoadingOverlay /> : null}

      {activeLanguage ? (
        <LanguageBadge
          language={activeLanguage}
          onBack={() => setSelectedLanguage(null)}
        />
      ) : null}

      {!activeLanguage ? (
        <LanguageGrid
          languages={languageOptions}
          onSelect={handleLanguageSelect}
        />
      ) : (
        <DocFrame language={activeLanguage} onLoad={handleDocLoad} />
      )}
    </div>
  );
}
