// Basic stuff
import { useState, useEffect, useRef, useContext } from "react";

// Fontawesome
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrain,
  faMagnifyingGlass,
  faCircleHalfStroke,
  faGear,
  faRoute,
} from "@fortawesome/free-solid-svg-icons";
import { faMap } from "@fortawesome/free-regular-svg-icons";

// Contexts
import { MetroContext, SettingsContext } from "../Contexts.jsx";

// My components
import { SettingsDropdown } from "./SettingsDropdown.jsx";
import { LineSelector } from "./LineSelector.jsx";
import { SearchComponent } from "./SearchComponent.jsx";
import { DirectionSearch } from "./DirectionSearch.jsx";
import { InfoPopup } from "./InfoPopup.jsx";

// My hooks
import { useClickOutside } from "../hooks/useClickOutside.jsx";

// Navbar at top
function NavComponent() {
  const { setMapDirections } = useContext(MetroContext);
  const { toggleDarkMode, toggleMap } = useContext(SettingsContext);

  // Popup toggle
  const [infoPopup, setInfoPopup] = useState(false);

  // Dropdown toggles
  const [hideNavMobile, setHideNavMobile] = useState(false);
  const [settingsDropdown, setSettingsDropdown] = useState(false);
  const [linesDropdown, setLinesDropdown] = useState(false);
  const [searchDropdown, setSearchDropdown] = useState(false);
  const [directionDropdown, setDirectionDropdown] = useState(false);

  // A bunch of references
  const maptoggle_ref = useRef(null);
  const darkmode_ref = useRef(null);
  const settings_dropdown_btn_ref = useRef(null);
  const settings_dropdown_ref = useRef(null);
  const lines_dropdown_btn_ref = useRef(null);
  const lines_dropdown_ref = useRef(null);
  const search_dropdown_btn_ref = useRef(null);
  const search_dropdown_ref = useRef(null);
  const direction_dropdown_btn_ref = useRef(null);
  const direction_dropdown_ref = useRef(null);
  const popup_btn_ref = useRef(null);
  const popup_ref = useRef(null);

  // Set directionDropdown and set related states accordingly
  function setDirectionDropdownStates(show) {
    setDirectionDropdown(show);
    setMapDirections({});
  }

  // Ensure nav is reshown when directionDropdown hides
  useEffect(() => {
    if (!directionDropdown) setHideNavMobile(false);
  }, [directionDropdown]);

  // Dropdown toggle handler
  function toggleDropdown(dropdown, setDropdown) {
    setDropdown(!dropdown);
    setDirectionDropdownStates(false);
  }

  // Closes dropdowns / popups when clicked outside of
  useClickOutside(
    [lines_dropdown_btn_ref, lines_dropdown_ref, darkmode_ref, maptoggle_ref],
    () => {
      setLinesDropdown(false);
    }
  );

  useClickOutside(
    [
      settings_dropdown_btn_ref,
      settings_dropdown_ref,
      darkmode_ref,
      maptoggle_ref,
    ],
    () => {
      setSettingsDropdown(false);
    }
  );

  useClickOutside(
    [search_dropdown_btn_ref, search_dropdown_ref, darkmode_ref, maptoggle_ref],
    () => {
      setSearchDropdown(false);
    }
  );

  useClickOutside([popup_btn_ref, popup_ref, darkmode_ref], () => {
    setInfoPopup(false);
  });

  return (
    <>
      <nav className={`site-nav ${hideNavMobile ? "mobile-hidden-nav" : ""}`}>
        {/* Metro lines selector */}
        <div className="line-select-btn dropdown">
          <FontAwesomeIcon
            icon={faTrain}
            className="nav-icon button"
            ref={lines_dropdown_btn_ref}
            onClick={() => toggleDropdown(linesDropdown, setLinesDropdown)}
          />
          <LineSelector
            ref={lines_dropdown_ref}
            linesDropdown={linesDropdown}
          />
        </div>
        {/* Search */}
        <div className="dropdown">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="nav-icon nav-search button"
            ref={search_dropdown_btn_ref}
            onClick={() => toggleDropdown(searchDropdown, setSearchDropdown)}
          />
          <SearchComponent
            ref={search_dropdown_ref}
            searchDropdown={searchDropdown}
            setSearchDropdown={setSearchDropdown}
          />
        </div>
        {/* Route finder */}
        <div className="dropdown">
          <FontAwesomeIcon
            icon={faRoute}
            className="nav-icon nav-search button"
            ref={direction_dropdown_btn_ref}
            onClick={() => setDirectionDropdownStates(!directionDropdown)}
          ></FontAwesomeIcon>
          {directionDropdown && (
            <DirectionSearch
              ref={direction_dropdown_ref}
              hideNavMobile={hideNavMobile}
              setHideNavMobile={setHideNavMobile}
            />
          )}
        </div>
        <div className="navbar-right">
          {/* Map toggle */}
          <FontAwesomeIcon
            icon={faMap}
            ref={maptoggle_ref}
            className="nav-icon button"
            onClick={toggleMap}
          />
          {/* Dark mode toggle */}
          <FontAwesomeIcon
            icon={faCircleHalfStroke}
            ref={darkmode_ref}
            className="nav-icon button"
            onClick={toggleDarkMode}
          />
          {/* Settings */}
          <div className="dropdown">
            <FontAwesomeIcon
              icon={faGear}
              ref={settings_dropdown_btn_ref}
              className="nav-icon button"
              onClick={() =>
                toggleDropdown(settingsDropdown, setSettingsDropdown)
              }
            />
            {settingsDropdown && (
              <SettingsDropdown
                ref={settings_dropdown_ref}
                setSettingsDropdown={setSettingsDropdown}
                setInfoPopup={setInfoPopup}
                popup_btn_ref={popup_btn_ref}
              />
            )}
          </div>
        </div>
      </nav>
      {/* Info popup */}
      {infoPopup && <InfoPopup ref={popup_ref} setInfoPopup={setInfoPopup} />}
    </>
  );
}

export { NavComponent };
