// Basic stuff
import { useState, useEffect, useRef, useContext, createContext, forwardRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Map stuff
import { MapContainer, useMapEvents, TileLayer, Marker, Popup, Polyline, ZoomControl } from "react-leaflet";
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";

// Fontawesome
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrain,
  faMagnifyingGlass,
  faCircleHalfStroke,
  faSquareCheck,
  faSquareXmark,
  faGear,
  faLanguage,
  faCircleInfo,
  faCircleXmark,
} from "@fortawesome/free-solid-svg-icons";
import { faMap } from "@fortawesome/free-regular-svg-icons";

// CSS
import "./css/index.css";
import "./css/nav.css";
import "./css/map.css";
import "./css/popup.css";
import "./css/dropdown.css";
import "./css/settings.css";
import "./css/line-select.css";
import "./css/search.css";

// My hooks
import { useImagePreloader } from "./hooks/useImagePreloader.jsx";
import { useClickOutside } from "./hooks/useClickOutside.jsx";

// My functions
import { fetchMetroInfo } from "./functions/fetchMetroInfo.jsx";
import { getStationImg, getLineImg } from "./functions/getMetroImg.jsx";
import { getChosenLineIds } from "./functions/getChosenLineIds.jsx";

// URL of backend - TODO: change on launch
const url = "http://localhost:5000";
// const url = "https://task-manager-self.fly.dev";

// Contexts
const MetroContext = createContext();
const SettingsContext = createContext();

function Index() {
  // Data about the stations and lines fetched from the backend
  const [stations, setStations] = useState([]);
  const [lines, setLines] = useState([]);
  const [geoHashmap, setGeoHashmap] = useState({});

  // User settings
  const [language, setLanguage] = useState("en");
  const [darkMode, setDarkMode] = useState(true);
  const [enableMap, setEnableMap] = useState(true);

  const [languageList, setLanguageList] = useState([]);

  function toggleMap() {
    setEnableMap(!enableMap);
  }

  function toggleDarkMode() {
    setDarkMode(!darkMode);
  }

  // Preloads images
  const imagesLoaded = useImagePreloader(stations, lines);

  // Initial render
  useEffect(() => {
    fetchMetroInfo(url, setStations, setLines, setGeoHashmap);

    setLanguageList([
      {
        code: "en",
        name: "English",
      },
      {
        code: "ja",
        name: "日本語",
      },
      {
        code: "zh-Hans",
        name: "中文 (简体字)",
      },
      {
        code: "zh-Hant",
        name: "中文 (繁体字)",
      },
      {
        code: "ko",
        name: "한국어",
      },
    ]);
  }, []);

  // Sets shown/unshown stations depending on which lines are shown
  useEffect(() => {
    let new_stations = [...stations];

    const chosen_line_ids = getChosenLineIds(lines);

    new_stations.forEach((station) => {
      let shown = false;

      station.railways.forEach((railway) => {
        if (chosen_line_ids.includes(railway.id)) {
          shown = true;
        }
      });

      station.shown = shown;
    });

    setStations(new_stations);
  }, [lines]);

  return (
    <SettingsContext.Provider
      value={{
        language: language,
        setLanguage: setLanguage,
        languageList: languageList,
        darkMode: darkMode,
        setDarkMode: setDarkMode,
        toggleDarkMode: toggleDarkMode,
        enableMap: enableMap,
        setEnableMap: setEnableMap,
        toggleMap: toggleMap,
      }}
    >
      <MetroContext.Provider
        value={{
          stations: stations,
          setStations: setStations,
          lines: lines,
          setLines: setLines,
          geoHashmap: geoHashmap,
        }}
      >
        <Site />
      </MetroContext.Provider>
    </SettingsContext.Provider>
  );
}

// Webpage container
function Site() {
  const { darkMode } = useContext(SettingsContext);

  return (
    <div className={`site-container ${darkMode ? "" : "light"}`}>
      <Nav />
      <div className="map-container">
        <MapComponent />
      </div>
    </div>
  );
}

// Navbar at top
function Nav() {
  const { toggleDarkMode, toggleMap } = useContext(SettingsContext);
  const { stations, lines, setLines } = useContext(MetroContext);

  // Popup toggle
  const [infoPopup, setInfoPopup] = useState(false);

  // Dropdown toggles
  const [settingsDropdown, setSettingsDropdown] = useState(false);
  const [linesDropdown, setLinesDropdown] = useState(false);
  const [searchDropdown, setSearchDropdown] = useState(false);

  const maptoggle_ref = useRef(null);
  const darkmode_ref = useRef(null);
  const settings_dropdown_btn_ref = useRef(null);
  const settings_dropdown_ref = useRef(null);
  const lines_dropdown_btn_ref = useRef(null);
  const lines_dropdown_ref = useRef(null);
  const search_dropdown_btn_ref = useRef(null);
  const search_dropdown_ref = useRef(null);
  const popup_btn_ref = useRef(null);
  const popup_ref = useRef(null);

  // Closes dropdowns / popups when clicked outside of
  useClickOutside([lines_dropdown_btn_ref, lines_dropdown_ref, darkmode_ref, maptoggle_ref], () => {
    setLinesDropdown(false);
  });

  useClickOutside([settings_dropdown_btn_ref, settings_dropdown_ref, darkmode_ref, maptoggle_ref], () => {
    setSettingsDropdown(false);
  });

  useClickOutside([search_dropdown_btn_ref, search_dropdown_ref, darkmode_ref, maptoggle_ref], () => {
    setSearchDropdown(false);
  });

  useClickOutside([popup_btn_ref, popup_ref, darkmode_ref], () => {
    setInfoPopup(false);
  });

  return (
    <>
      <nav className="site-nav">
        {/* Settings */}
        <div className="dropdown">
          <FontAwesomeIcon icon={faGear} ref={settings_dropdown_btn_ref} className="nav-icon button" onClick={() => setSettingsDropdown(!settingsDropdown)} />
          {settingsDropdown ? (
            <SettingsDropdown ref={settings_dropdown_ref} setSettingsDropdown={setSettingsDropdown} setInfoPopup={setInfoPopup} popup_btn_ref={popup_btn_ref} />
          ) : null}
        </div>
        {/* Map toggle */}
        <FontAwesomeIcon icon={faMap} ref={maptoggle_ref} className="nav-icon button" onClick={toggleMap} />
        {/* Dark mode toggle */}
        {/* <h2 className="site-title">Site Title</h2> */}
        <FontAwesomeIcon icon={faCircleHalfStroke} ref={darkmode_ref} className="nav-icon button" onClick={toggleDarkMode} />
        {/* Metro lines selector */}
        <div className="line-select-btn dropdown">
          <FontAwesomeIcon icon={faTrain} className="nav-icon button" ref={lines_dropdown_btn_ref} onClick={() => setLinesDropdown(!linesDropdown)} />
          {linesDropdown ? <LineSelector ref={lines_dropdown_ref} /> : null}
        </div>
        {/* Search */}
        <div className="dropdown">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="nav-icon nav-search button"
            ref={search_dropdown_btn_ref}
            onClick={() => setSearchDropdown(!searchDropdown)}
          />
          {searchDropdown ? <SearchComponent ref={search_dropdown_ref} /> : null}
        </div>
      </nav>
      {/* Info popup */}
      {infoPopup ? <InfoPopup ref={popup_ref} setInfoPopup={setInfoPopup} /> : null}
    </>
  );
}

// Dropdown from navbar to be able to select lines
const LineSelector = forwardRef(({}, ref) => {
  const { language } = useContext(SettingsContext);
  const { lines, setLines } = useContext(MetroContext);

  const [translations, setTranslations] = useState({});

  useEffect(() => {
    const temp = {
      "Select-All": {
        en: "Show All",
        ja: "全表示",
        ko: "전체 선택",
        "zh-Hans": "全选",
        "zh-Hant": "全選",
      },
      "Deselect-All": {
        en: "Hide All",
        ja: "全非表示",
        ko: "전체 선택 해제",
        "zh-Hans": "取消全选",
        "zh-Hant": "取消全選",
      },
    };

    setTranslations(temp);
  }, []);

  // Get chosen line ids in a simple list
  const chosen_line_ids = getChosenLineIds(lines);
  if (lines) {
    lines.forEach((line) => {
      if (line.shown && !chosen_line_ids.includes(line.id)) {
        chosen_line_ids.push(line.id);
      }
    });
  }

  // Toggles a line showing on the map given the line id
  function toggleLineShown(id) {
    let updated_lines = [...lines];

    const shown = updated_lines.find((line) => line.id === id).shown;
    updated_lines.find((line) => line.id === id).shown = !shown;

    setLines(updated_lines);
  }

  // Show all / hide all stuff
  function setAllLines(show) {
    let updated_lines = [...lines];

    updated_lines.forEach((line) => {
      line.shown = show;
    });

    setLines(updated_lines);
  }

  return (
    <div className="dropdown-content right-side" ref={ref}>
      <button className="dropdown-line div-button black selected" onClick={() => setAllLines(true)}>
        <FontAwesomeIcon icon={faSquareCheck} className="dropdown-icon" />
        {translations["Select-All"]?.[language]}
      </button>
      <button className="dropdown-line div-button black unselected" onClick={() => setAllLines(false)}>
        <FontAwesomeIcon icon={faSquareXmark} className="dropdown-icon" />
        {translations["Deselect-All"]?.[language]}
      </button>
      {lines.map((line) => {
        let selected = false;
        if (chosen_line_ids && chosen_line_ids.includes(line.id)) {
          selected = true;
        }

        return (
          <button
            className={selected ? "dropdown-line div-button black selected" : "dropdown-line div-button black unselected"}
            onClick={() => toggleLineShown(line.id)}
          >
            <img src={getLineImg(line.code[0])} className="metro-img" alt="" />
            <p>{line.name[language]}</p>
          </button>
        );
      })}
    </div>
  );
});

// Dropdown from navbar for settings
const SettingsDropdown = forwardRef(({ setSettingsDropdown, setInfoPopup, popup_btn_ref }, ref) => {
  const { language, setLanguage, languageList } = useContext(SettingsContext);

  return (
    <div className="dropdown-content left-side" ref={ref}>
      {/* Language selection */}
      <div className="dropdown-line settings-line">
        <FontAwesomeIcon icon={faLanguage} className="settings-icon enlarge" />
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
      <button
        ref={popup_btn_ref}
        className="dropdown-line settings-line div-button"
        onClick={() => {
          setInfoPopup(true);
          setSettingsDropdown(false);
        }}
      >
        <FontAwesomeIcon icon={faCircleInfo} className="settings-icon" />
        <h3 className="link">About</h3>
      </button>
    </div>
  );
});

// Search dropdown
const SearchComponent = forwardRef(({ stations, lines }, ref) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  function handleChange(e) {
    setQuery(e.target.value);
    getResults(e.target.value);
  }

  function getResults(q) {
    // const station_matches = stations.filter((station) => station.name[language].includes(q));
  }

  return (
    <div className="dropdown-content right-side" ref={ref}>
      <div className="dropdown-line">
        {/* <div className="search-side-icon-background"> */}
        <FontAwesomeIcon icon={faMagnifyingGlass} className="search-side-icon"></FontAwesomeIcon>
        {/* </div> */}
        <input type="text" className="search-input" placeholder="Search..." value={query} onChange={handleChange} />
      </div>
      {results.map((result) => {
        <div className="dropdown-line">result</div>;
      })}
    </div>
  );
});

// On screen info popup
const InfoPopup = forwardRef(({ setInfoPopup }, ref) => {
  return (
    <div className="popup-content" ref={ref}>
      <FontAwesomeIcon
        icon={faCircleXmark}
        className="exit button"
        onClick={() => {
          setInfoPopup(false);
        }}
      />
      <h1>Tokyo Metro Interactive Map</h1>
      <h3>Created by Zinn Morton</h3>
      <div className="break" />
      <h4>
        Data from{" "}
        <a href="https://developer.odpt.org/en/info" target="_blank">
          Public Transportation Open Data Center
        </a>
      </h4>
      <div className="break" />
      <h4>Made using React, Vite, Express</h4>
      <div className="break" />
      <h4>Packages used: Leaflet, React Leaflet, Axios</h4>
      <div className="break" />
    </div>
  );
});

// Map
function MapComponent() {
  const { language, enableMap, darkMode } = useContext(SettingsContext);
  const { stations, lines, geoHashmap } = useContext(MetroContext);

  const map_ref = useRef(null);

  // Show line when hovering over the line and hide when it gets far enough away from the popup
  // The following code is pretty fucked up and idk how it works.
  // I just made it from trying to fix one problem at a time.
  // Note to self: Don't touch this unless you really have to
  const [initialPopupHidden, setInitialPopupHidden] = useState(false);
  const [showMouseOverPopup, setShowMouseOverPopup] = useState(false);
  const [mouseOverPopupImg, setMouseOverPopupImg] = useState("");
  const [mouseOverPopupName, setMouseOverPopupName] = useState("");
  const [mouseOverPopupPos, setMouseOverPopupPos] = useState([35.71, 139.75]);

  useEffect(() => {
    setShowMouseOverPopup(false);
    setInitialPopupHidden(false);
  }, [lines]);

  // Show popup
  function handleMouseOver(e, name, img) {
    if (showMouseOverPopup) return;

    setMouseOverPopupName(name);
    setMouseOverPopupImg(img);
    setMouseOverPopupPos(e.latlng);
    setShowMouseOverPopup(true);
  }

  // Hide initial popup / Hide popup when mouse is far enough away
  function MapEvents() {
    useMapEvents({
      mousemove: (e) => {
        if (!showMouseOverPopup) return;

        // Calculate distance between mouse position and popup position
        const popup_point = map_ref.current.latLngToContainerPoint(mouseOverPopupPos);
        const mouse_point = map_ref.current.mouseEventToContainerPoint(e.originalEvent);
        const distance = popup_point.distanceTo(mouse_point);

        // Hide the popup if the distance is greater than a threshold
        if (distance > 25) {
          setShowMouseOverPopup(false);
          map_ref.current.closePopup();
        }
      },
      popupopen: () => {
        if (!initialPopupHidden) {
          map_ref.current.closePopup();
          setInitialPopupHidden(true);
        }
      },
    });

    return null;
  }

  // Train icon
  const icon_markup = renderToStaticMarkup(<FontAwesomeIcon className="map-icon" icon={faTrain} />);
  const custom_icon = divIcon({
    html: icon_markup,
  });

  return (
    <>
      {/* Div to color background if map is disabled */}
      <div className="map-background">
        <MapContainer className="map" ref={map_ref} center={[35.71, 139.75]} zoom={12} zoomControl={false} attributionControl={false}>
          <MapEvents />
          {enableMap ? (
            <TileLayer
              url={
                darkMode
                  ? "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
                  : "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
              }
            />
          ) : null}
          <ZoomControl position="bottomleft" />
          {/* Maps stations into markers on the map */}
          {stations.map((station) => {
            if (!station.shown) {
              return null;
            }

            const code = station.railways[0].code;
            const index = station.railways[0].index;

            return (
              <Marker position={[station.geo.lat, station.geo.long]} width="30px" height="30px" icon={custom_icon}>
                <Popup>
                  <div className="popup-data">
                    <h3>{station.name[language]}</h3>
                    <div className="line-imgs">
                      {station.railways.map((railway) => {
                        return (
                          <div className="map-popup-line">
                            <img src={getStationImg(railway.code, railway.index)}></img>
                            <h3>
                              {lines.find((line) => line.id === railway.id).name[language]} {railway.index}
                            </h3>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Draws lines between markers for each metro line */}
          {lines.map((line) => {
            if (!line.shown) {
              return null;
            }

            const positions = line.stationOrder.map((station) => {
              return geoHashmap[station.station];
            });

            return (
              <>
                {/* Outline */}
                <Polyline
                  positions={positions}
                  pathOptions={{
                    color: "#000000",
                    weight: 5,
                  }}
                  eventHandlers={{
                    mouseover: (e) => handleMouseOver(e, line.name[language], getLineImg(line.code)),
                  }}
                />
                {/* The line itself */}
                <Polyline
                  positions={positions}
                  pathOptions={{
                    color: line.color,
                    weight: 3,
                  }}
                />

                {/* Hover over line to show line name */}
                <Popup className="line-hover-popup" position={mouseOverPopupPos}>
                  <div className="map-popup-line">
                    <img src={mouseOverPopupImg}></img>
                    <h3>{mouseOverPopupName}</h3>
                  </div>
                </Popup>
              </>
            );
          })}
        </MapContainer>
      </div>
    </>
  );
}

export default Index;
