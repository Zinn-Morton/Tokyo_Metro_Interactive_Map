// Basic stuff
import {
  useState,
  useEffect,
  useRef,
  useContext,
  createContext,
  forwardRef,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isMobile } from "react-device-detect";

// Map stuff
import {
  MapContainer,
  useMapEvents,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
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
import { getLanguageList } from "./functions/getLanguageList.jsx";
import { getTranslations } from "./functions/getTranslations.jsx";

// URL of backend - TODO: change on launch
const url = import.meta.env.VITE_BACKEND_URL;

// Contexts
const MetroContext = createContext();
const SettingsContext = createContext();
const default_settings = {
  darkMode: true,
  enableMap: true,
  language: "en",
};
const TranslationContext = createContext();
const MapContext = createContext();

function Index() {
  // Data about the stations and lines fetched from the backend
  const [stations, setStations] = useState([]);
  const [lines, setLines] = useState([]);
  const [geoHashmap, setGeoHashmap] = useState({});
  const [searchedStationId, setSearchedStationId] = useState(null);

  // User settings
  const [language, setLanguage] = useState(default_settings.language);
  const [darkMode, setDarkMode] = useState(default_settings.darkMode);
  const [enableMap, setEnableMap] = useState(default_settings.enableMap);
  const [languageList, setLanguageList] = useState([]);

  function toggleMap() {
    setEnableMap(!enableMap);
  }

  function toggleDarkMode() {
    setDarkMode(!darkMode);
  }

  // Load user settings from browser
  useEffect(() => {
    try {
      const settings = JSON.parse(localStorage.getItem("settings"));
      setLanguage(settings.language);
      setDarkMode(settings.darkMode);
      setEnableMap(settings.enableMap);
    } catch {
      setLanguage(default_settings.language);
      setDarkMode(default_settings.darkMode);
      setEnableMap(default_settings.enableMap);
    }
  }, []);

  // Save user settings to browser
  useEffect(() => {
    localStorage.setItem(
      "settings",
      JSON.stringify({
        darkMode: darkMode,
        enableMap: enableMap,
        language: language,
      })
    );
  }, [language, darkMode, enableMap]);

  // Preloads images
  useImagePreloader(stations, lines);

  // Initial render data fetch
  useEffect(() => {
    fetchMetroInfo(url, setStations, setLines, setGeoHashmap);
    setLanguageList(getLanguageList());
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

  // Toggles a line showing on the map given the line id
  function toggleLineShown(id) {
    let updated_lines = [...lines];

    const shown = updated_lines.find((line) => line.id === id).shown;
    updated_lines.find((line) => line.id === id).shown = !shown;

    setLines(updated_lines);
  }

  // Hides all lines showing on map except those with ids in the input array
  function showOnlyLines(id_array) {
    let updated_lines = [...lines];

    updated_lines.forEach((line) => {
      if (id_array.includes(line.id)) {
        line.shown = true;
      } else {
        line.shown = false;
      }
    });

    setLines(updated_lines);
  }

  // Map stuff since it needs to be in the context
  const map_ref = useRef(null);
  const popup_refs = useRef({});

  // Function to open a station popup
  function openStationPopup(station_id) {
    // Find the popup ref
    const popup_ref = popup_refs.current[station_id];

    popup_ref.openOn(map_ref.current);
  }

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
      <TranslationContext.Provider value={getTranslations()}>
        <MapContext.Provider
          value={{
            map_ref: map_ref,
            popup_refs: popup_refs,
            openStationPopup: openStationPopup,
          }}
        >
          <MetroContext.Provider
            value={{
              stations: stations,
              setStations: setStations,
              lines: lines,
              setLines: setLines,
              toggleLineShown: toggleLineShown,
              showOnlyLines: showOnlyLines,
              geoHashmap: geoHashmap,
              searchedStationId: searchedStationId,
              setSearchedStationId: setSearchedStationId,
            }}
          >
            <Site />
          </MetroContext.Provider>
        </MapContext.Provider>
      </TranslationContext.Provider>
    </SettingsContext.Provider>
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

// Navbar at top
function NavComponent({}) {
  const { toggleDarkMode, toggleMap } = useContext(SettingsContext);

  // Popup toggle
  const [infoPopup, setInfoPopup] = useState(false);

  // Dropdown toggles
  const [settingsDropdown, setSettingsDropdown] = useState(false);
  const [linesDropdown, setLinesDropdown] = useState(false);
  const [searchDropdown, setSearchDropdown] = useState(false);

  // A bunch of references
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
      <nav className="site-nav">
        {/* Settings */}
        <div className="dropdown">
          <FontAwesomeIcon
            icon={faGear}
            ref={settings_dropdown_btn_ref}
            className="nav-icon button"
            onClick={() => setSettingsDropdown(!settingsDropdown)}
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
        {/* Map toggle */}
        <FontAwesomeIcon
          icon={faMap}
          ref={maptoggle_ref}
          className="nav-icon button"
          onClick={toggleMap}
        />
        {/* Dark mode toggle */}
        {/* <h2 className="site-title">Site Title</h2> */}
        <FontAwesomeIcon
          icon={faCircleHalfStroke}
          ref={darkmode_ref}
          className="nav-icon button"
          onClick={toggleDarkMode}
        />
        {/* Metro lines selector */}
        <div className="line-select-btn dropdown">
          <FontAwesomeIcon
            icon={faTrain}
            className="nav-icon button"
            ref={lines_dropdown_btn_ref}
            onClick={() => setLinesDropdown(!linesDropdown)}
          />
          {linesDropdown && <LineSelector ref={lines_dropdown_ref} />}
        </div>
        {/* Search */}
        <div className="dropdown">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="nav-icon nav-search button"
            ref={search_dropdown_btn_ref}
            onClick={() => setSearchDropdown(!searchDropdown)}
          />
          <SearchComponent
            ref={search_dropdown_ref}
            searchDropdown={searchDropdown}
            setSearchDropdown={setSearchDropdown}
          />
        </div>
      </nav>
      {/* Info popup */}
      {infoPopup && <InfoPopup ref={popup_ref} setInfoPopup={setInfoPopup} />}
    </>
  );
}

// Dropdown from navbar to be able to select lines
const LineSelector = forwardRef(({}, ref) => {
  const { language } = useContext(SettingsContext);
  const translations = useContext(TranslationContext);
  const { lines, setLines, toggleLineShown } = useContext(MetroContext);

  // Get chosen line ids in a simple list
  const chosen_line_ids = getChosenLineIds(lines);
  if (lines) {
    lines.forEach((line) => {
      if (line.shown && !chosen_line_ids.includes(line.id)) {
        chosen_line_ids.push(line.id);
      }
    });
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
      <DropdownTrainLine
        button_class="dropdown-line div-button black selected"
        onClick={() => setAllLines(true)}
        left_elem={
          <FontAwesomeIcon icon={faSquareCheck} className="dropdown-icon" />
        }
        p_text={translations["Show-All"]?.[language]}
      />
      <DropdownTrainLine
        button_class="dropdown-line div-button black unselected"
        onClick={() => setAllLines(false)}
        left_elem={
          <FontAwesomeIcon icon={faSquareXmark} className="dropdown-icon" />
        }
        p_text={translations["Hide-All"]?.[language]}
      />
      {lines.map((line) => {
        let selected = false;
        if (chosen_line_ids && chosen_line_ids.includes(line.id)) {
          selected = true;
        }

        return (
          <DropdownTrainLine
            button_class={
              selected
                ? "dropdown-line div-button black selected"
                : "dropdown-line div-button black unselected"
            }
            onClick={() => toggleLineShown(line.id)}
            left_elem={
              <img
                src={getLineImg(line.code[0])}
                className="metro-img"
                alt=""
              />
            }
            p_text={line.name[language]}
          />
        );
      })}
    </div>
  );
});

// Dropdown line in LineSelector and SearchDropdown showing an image next to text
function DropdownTrainLine({ button_class, onClick, left_elem, p_text }) {
  return (
    <button className={button_class} onClick={onClick}>
      {left_elem}
      <p>{p_text}</p>
    </button>
  );
}

// Dropdown from navbar for settings
const SettingsDropdown = forwardRef(
  ({ setSettingsDropdown, setInfoPopup, popup_btn_ref }, ref) => {
    const { language, setLanguage, languageList } = useContext(SettingsContext);

    return (
      <div className="dropdown-content left-side" ref={ref}>
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

// Search dropdown
const SearchComponent = forwardRef(
  ({ searchDropdown, setSearchDropdown }, ref) => {
    const { language, languageList } = useContext(SettingsContext);
    const translations = useContext(TranslationContext);
    const { openStationPopup } = useContext(MapContext);
    const { stations, lines, showOnlyLines, setSearchedStationId } =
      useContext(MetroContext);

    // Query and results
    const [query, setQuery] = useState("");
    const [results, setResults] = useState({
      station_matches: [],
      line_matches: [],
    });

    // Ref for input
    const searchbox_ref = useRef(null);

    // Focus search when dropdown opens
    useEffect(() => {
      if (searchDropdown) {
        searchbox_ref.current.focus();
      }
    });

    // Update results when query changes
    useEffect(() => {
      if (query != "") {
        getResults(query);
      } else {
        setResults({
          station_matches: [],
          line_matches: [],
        });
      }
    }, [query]);

    // Searches for matching items in an object (i.e stations or lines)
    function filterFromObject(q, obj) {
      return obj.filter((item) => {
        const name = item.name;

        for (const { code } of languageList) {
          if (name[code].toLowerCase().includes(q.toLowerCase())) {
            return true;
          }
        }

        return false;
      });
    }

    // Gets results from query
    function getResults(q) {
      const station_matches = filterFromObject(q, stations);
      const line_matches = filterFromObject(q, lines);

      setResults({
        station_matches: [...station_matches],
        line_matches: [...line_matches],
      });
    }

    // Opens station popup on map when clicking search result
    function handleStationSearchClick(station_id) {
      setSearchedStationId(station_id);
      setQuery("");
      setSearchDropdown(false);
      openStationPopup(station_id);
    }

    // Hides all lines except the search result
    function handleLineSearchClick(line_id) {
      showOnlyLines([line_id]);
      setQuery("");
      setSearchDropdown(false);
    }

    return (
      searchDropdown && (
        <div className="dropdown-content right-side" ref={ref}>
          {/* Search input */}
          <div className="dropdown-line search-line">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="search-side-icon"
            />
            <input
              type="text"
              ref={searchbox_ref}
              className="search-input"
              placeholder="..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {/* Search results */}
          <div className="search-results">
            {/* Station results */}
            <div className="dropdown-line label-line search-line">
              <h3>{translations["Stations"][language]}:</h3>
            </div>
            {results.station_matches.length != 0 && (
              <div className="station-results">
                {results.station_matches.map((station) => {
                  return (
                    <DropdownTrainLine
                      button_class="dropdown-line div-button search-line"
                      onClick={() => handleStationSearchClick(station.id)}
                      left_elem={
                        <FontAwesomeIcon
                          icon={faTrain}
                          className="dropdown-icon background"
                        />
                      }
                      p_text={station.name[language]}
                    />
                  );
                })}
              </div>
            )}
            {/* Line results */}
            <div className="dropdown-line label-line search-line">
              <h3>{translations["Lines"][language]}:</h3>
            </div>
            {results.line_matches.length != 0 && (
              <div className="lines-results">
                {results.line_matches.map((line) => {
                  return (
                    <DropdownTrainLine
                      button_class="dropdown-line div-button search-line"
                      onClick={() => handleLineSearchClick(line.id)}
                      left_elem={
                        <img
                          src={getLineImg(line.code[0])}
                          className="metro-img"
                          alt=""
                        />
                      }
                      p_text={line.name[language]}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )
    );
  }
);

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
      <h4>
        <a
          href="https://github.com/ZinnMortonOSU/Tokyo_Metro_Interactive_Map"
          target="_blank"
        >
          Site Github Repo
        </a>
      </h4>
      <div className="break" />
    </div>
  );
});

// Map
function MapComponent() {
  const { language, enableMap, darkMode } = useContext(SettingsContext);
  const { map_ref, popup_refs } = useContext(MapContext);
  const {
    stations,
    lines,
    geoHashmap,
    searchedStationId,
    setSearchedStationId,
  } = useContext(MetroContext);

  // Tracks zoom level for showing station indices
  const [zoom, setZoom] = useState(isMobile ? 11.5 : 12);

  // Rerender map tiles when darkmode changes
  const [tileKey, setTileKey] = useState(0);
  useEffect(() => {
    setTileKey((prevKey) => (prevKey + 1) % 10);
  }, [darkMode]);

  // Show line when hovering over the line and hide when it gets far enough away from the popup
  const [showMouseOverPopup, setShowMouseOverPopup] = useState(false);
  const [mouseOverPopupImg, setMouseOverPopupImg] = useState("");
  const [mouseOverPopupName, setMouseOverPopupName] = useState("");
  const [mouseOverPopupPos, setMouseOverPopupPos] = useState([35.71, 139.75]);

  // Show popup
  function handleMouseOver(e, name, img) {
    if (showMouseOverPopup) return;

    setMouseOverPopupName(name);
    setMouseOverPopupImg(img);
    setMouseOverPopupPos(e.latlng);
    setShowMouseOverPopup(true);
  }

  // Hide popup when mouse is far enough away
  function MapEvents() {
    useMapEvents({
      mousemove: (e) => {
        if (!showMouseOverPopup || isMobile) return;

        // Calculate distance between mouse position and popup position
        const popup_point =
          map_ref.current.latLngToContainerPoint(mouseOverPopupPos);
        const mouse_point = map_ref.current.mouseEventToContainerPoint(
          e.originalEvent
        );
        const distance = popup_point.distanceTo(mouse_point);

        // Hide the popup if the distance is greater than a threshold
        if (distance > 25) {
          map_ref.current.closePopup();
        }
      },
      popupclose: () => {
        // Had to do this timeout because conditional rendering of the popup was weird when hiding
        setTimeout(() => {
          // Unshow line hover popup
          setShowMouseOverPopup(false);

          // Unshow searched station
          setSearchedStationId(null);
        }, 200);
      },
      zoom: () => {
        console.log(map_ref.current.getZoom());
        setZoom(map_ref.current.getZoom());
      },
      move: () => {
        console.log(map_ref.current.getCenter());
      },
    });

    return null;
  }

  // Invisible icon
  const invis_icon = new L.icon({
    iconUrl:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    iconSize: [1, 1], // Set a very small icon size
  });

  return (
    <>
      {/* Div to color background if map is disabled */}
      <div className="map-background">
        <MapContainer
          className="map"
          ref={map_ref}
          center={isMobile ? [35.685, 139.75] : [35.71, 139.75]}
          zoom={zoom}
          zoomControl={false}
          attributionControl={false}
          zoomDelta={0.5}
          zoomSnap={0.5}
        >
          <MapEvents />

          {/* Map tiles */}
          {enableMap && (
            <TileLayer
              key={tileKey}
              url={
                darkMode
                  ? `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=61fbf018-da81-4430-8b6c-3111114ac03f`
                  : `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=61fbf018-da81-4430-8b6c-3111114ac03f`
              }
            />
          )}

          <ZoomControl position="bottomleft" />

          {/* Maps stations into markers on the map */}
          {stations.map((station) => {
            // Map icon
            const custom_icon = mapIcon(zoom, station);

            const shown = station.shown || station.id === searchedStationId;

            const code = station.railways[0].code;
            const index = station.railways[0].index;
            return (
              <Marker
                opacity={shown ? 100 : 0}
                position={[station.geo.lat, station.geo.long]}
                width="30px"
                height="30px"
                icon={shown ? custom_icon : invis_icon}
                riseOnHover={true}
              >
                <Popup
                  ref={(el) => {
                    popup_refs.current[station.id] = el;
                  }}
                >
                  <div className="popup-data">
                    <h3>{station.name[language]}</h3>
                    <div className="line-imgs">
                      {station.railways.map((railway) => {
                        return (
                          <div className="map-popup-line">
                            <img
                              src={getStationImg(railway.code, railway.index)}
                            ></img>
                            <h3>
                              {
                                lines.find((line) => line.id === railway.id)
                                  .name[language]
                              }{" "}
                              {railway.index}
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
                {/* Invisible to make mobile click easier */}
                {isMobile && (
                  <Polyline
                    positions={positions}
                    pathOptions={{
                      color: "#000000",
                      weight: 20,
                      opacity: 0,
                    }}
                    eventHandlers={{
                      click: (e) =>
                        handleMouseOver(
                          e,
                          line.name[language],
                          getLineImg(line.code)
                        ),
                    }}
                  />
                )}
                {/* Outline */}
                <Polyline
                  positions={positions}
                  pathOptions={{
                    color: "#000000",
                    weight: 5,
                  }}
                  eventHandlers={
                    isMobile
                      ? {}
                      : {
                          mouseover: (e) =>
                            handleMouseOver(
                              e,
                              line.name[language],
                              getLineImg(line.code)
                            ),
                        }
                  }
                />
                {/* The line itself */}
                <Polyline
                  positions={positions}
                  pathOptions={{
                    color: line.color,
                    weight: 3,
                  }}
                />
              </>
            );
          })}

          {/* Hover over line to show line name */}
          {showMouseOverPopup && (
            <Popup
              className="line-hover-popup test"
              position={mouseOverPopupPos}
            >
              <div className="map-popup-line">
                <img src={mouseOverPopupImg}></img>
                <h3>{mouseOverPopupName}</h3>
              </div>
            </Popup>
          )}
        </MapContainer>
      </div>
    </>
  );
}

// Custom map icon which depends on zoom level
function mapIcon(zoom, station) {
  const ENLARGE_ZOOM_LVL = 14;

  const ZOOM_VARS = {
    "--map-icon-size": `${8 * (zoom - ENLARGE_ZOOM_LVL) + 18}px !important`,
    "--map-icon-station-size": "calc(var(--map-icon-size) + 2px) !important",
    "--map-icon-total-size": "calc(var(--map-icon-size) * 1.4) !important",
  };

  const use_style = zoom >= ENLARGE_ZOOM_LVL ? ZOOM_VARS : {};

  const icon_markup = renderToStaticMarkup(
    <div className="map-icon-container">
      <div>
        <div className="map-icon-background" style={use_style}>
          <FontAwesomeIcon
            className="map-icon"
            icon={faTrain}
            style={use_style}
          />
        </div>
        {/* If sufficiently zoomed in show stop indices */}
        {zoom >= ENLARGE_ZOOM_LVL && (
          <div className="map-icon-stations-container" style={use_style}>
            {station.railways.map((railway) => {
              return (
                <div
                  className="map-icon-background map-icon-station-div"
                  style={use_style}
                >
                  <img
                    className="map-icon-station"
                    src={getStationImg(railway.code, railway.index)}
                    style={use_style}
                  ></img>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return divIcon({
    html: icon_markup,
  });
}

export default Index;
