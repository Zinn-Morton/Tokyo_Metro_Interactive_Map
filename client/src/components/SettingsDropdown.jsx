// Basic stuff
import { useContext, forwardRef } from "react";

// Fontawesome
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLanguage, faCircleInfo } from "@fortawesome/free-solid-svg-icons";

// Contexts
import { SettingsContext } from "../Contexts.jsx";

// Dropdown from navbar for settings
const SettingsDropdown = forwardRef(
  ({ setSettingsDropdown, setInfoPopup, popup_btn_ref }, ref) => {
    const { language, setLanguage, languageList } = useContext(SettingsContext);

    return (
      <div className="dropdown-content right-side" ref={ref}>
        {/* Language selection */}
        <div className="dropdown-line settings-line">
          <FontAwesomeIcon
            icon={faLanguage}
            className="settings-icon enlarge"
          />
          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
            }}
          >
            {languageList.map((language) => {
              return <option value={language.code}>{language.name}</option>;
            })}
          </select>
        </div>
        {/* Information */}
        <div className="dropdown-line settings-line">
          <button
            ref={popup_btn_ref}
            className="div-button flex"
            onClick={() => {
              setInfoPopup(true);
              setSettingsDropdown(false);
            }}
          >
            <FontAwesomeIcon icon={faCircleInfo} className="settings-icon" />
            <h3 className="link">About</h3>
          </button>
        </div>
      </div>
    );
  }
);

export { SettingsDropdown };
