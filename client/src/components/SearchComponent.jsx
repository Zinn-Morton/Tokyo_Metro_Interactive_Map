// Basic stuff
import { useState, useEffect, useRef, useContext, forwardRef } from "react";

// Fontawesome
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrain, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

// Contexts
import {
  SettingsContext,
  TranslationContext,
  MapContext,
  MetroContext,
} from "../Contexts.jsx";

// My components
import { DropdownTrainLine } from "./DropdownTrainLine.jsx";
import { SearchbarWithIcon } from "./SearchbarWithIcon.jsx";
import DynamicCustomScroll from "./DynamicCustomScroll.jsx";

// My functions
import { getLineImg } from "../functions/getMetroImg.jsx";

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
    }, [searchDropdown]);

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
        <div className="dropdown-content left-side search-dropdown" ref={ref}>
          {/* Search input */}
          <div className="dropdown-line search-line">
            <SearchbarWithIcon
              ref={searchbox_ref}
              icon={faMagnifyingGlass}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {/* Search results */}
          <DynamicCustomScroll className="search-results-container">
            {/* Station results */}
            <div className="search-results">
              <div className="dropdown-line label-line search-line title-line">
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
              <div className="dropdown-line label-line search-line title-line">
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
                            src={getLineImg(line.code)}
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
          </DynamicCustomScroll>
        </div>
      )
    );
  }
);

export { SearchComponent };
