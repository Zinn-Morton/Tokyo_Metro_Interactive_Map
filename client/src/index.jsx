// Basic stuff
import { useContext } from "react";

// CSS
import "./css/nav.css";
import "./css/map.css";
import "./css/popup.css";
import "./css/dropdown.css";
import "./css/settings.css";
import "./css/line-select.css";
import "./css/search.css";
import "./css/direction-search.css";
import "./css/index.css";

// Contexts
// Context wrapper - Fetches and prepares all data into contexts
import { ContextWrapper, SettingsContext } from "./Contexts.jsx";

// My components
import { MapComponent } from "./components/MapComponent.jsx";
import { NavComponent } from "./components/NavComponent.jsx";

// Wrap all contexts
function Index() {
  return (
    <ContextWrapper>
      <Site />
    </ContextWrapper>
  );
}

// Webpage container
function Site() {
  const { darkMode } = useContext(SettingsContext);

  return (
    <div className={`site-container ${darkMode ? "" : "light"}`}>
      <NavComponent />
      <div className="map-container">
        <MapComponent />
      </div>
    </div>
  );
}

export { Index };
