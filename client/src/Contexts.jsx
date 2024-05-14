// Basic stuff
import { useState, useEffect, useRef, createContext } from "react";

// My hooks
import { useImagePreloader } from "./hooks/useImagePreloader.jsx";

// My functions
import { fetchMetroInfo } from "./functions/fetchMetroInfo.jsx";
import { getChosenLineIds } from "./functions/getChosenLineIds.jsx";
import { getLanguageList } from "./functions/getLanguageList.jsx";
import { getTranslations } from "./functions/getTranslations.jsx";

// URL of backend
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

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

// Prepares all the data for the site into contexts
function ContextWrapper({ children }) {
  // Data about the stations and lines fetched from the backend
  const [stations, setStations] = useState([]);
  const [lines, setLines] = useState([]);
  const [geoHashmap, setGeoHashmap] = useState({});
  const [operators, setOperators] = useState([]);
  const [fetchInfoError, setFetchInfoError] = useState("");

  // User search
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

  // Metro info fetch
  async function fetchMetroInfoWrapper(timerId = null) {
    return await fetchMetroInfo({
      BACKEND_URL: BACKEND_URL,
      setStations: setStations,
      setLines: setLines,
      setGeoHashmap: setGeoHashmap,
      setOperators: setOperators,
      setFetchInfoError: setFetchInfoError,
      timerId: timerId,
    });
  }

  // Initial fetch
  useEffect(() => {
    const success = fetchMetroInfoWrapper();

    if (!success) {
      const timerId = setInterval(() => fetchMetroInfoWrapper(timerId), 5000);
    }

    setLanguageList(getLanguageList());
  }, []);

  // Function to set lines while updating station visibility
  function setLinesUpdateStation(updated_lines) {
    updateStationVisibility(updated_lines);
    setLines(updated_lines);
  }

  // Sets shown/unshown stations depending on which lines are shown
  function updateStationVisibility(updated_lines) {
    let new_stations = [...stations];

    const chosen_line_ids = getChosenLineIds(updated_lines);

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
  }

  // Gets next state of lines when a line id is toggled visible
  function toggleLineShownNextState(id) {
    let updated_lines = [...lines];

    const shown = updated_lines.find((line) => line.id === id).shown;
    updated_lines.find((line) => line.id === id).shown = !shown;

    return updated_lines;
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

    setLinesUpdateStation(updated_lines);
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

  useEffect(() => {}, [stations]);

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
              setLinesUpdateStation: setLinesUpdateStation,
              toggleLineShownNextState: toggleLineShownNextState,
              showOnlyLines: showOnlyLines,
              geoHashmap: geoHashmap,
              operators: operators,
              searchedStationId: searchedStationId,
              setSearchedStationId: setSearchedStationId,
              fetchInfoError: fetchInfoError,
            }}
          >
            {children}
          </MetroContext.Provider>
        </MapContext.Provider>
      </TranslationContext.Provider>
    </SettingsContext.Provider>
  );
}

export {
  ContextWrapper,
  SettingsContext,
  TranslationContext,
  MapContext,
  MetroContext,
};
