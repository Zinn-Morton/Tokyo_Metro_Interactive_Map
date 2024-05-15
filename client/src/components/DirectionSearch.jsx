// Basic stuff
import { useState, useRef, useEffect, useContext, forwardRef } from "react";
import axios from "axios";
import { isMobile, isBrowser } from "react-device-detect";

// Fontawesome
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLocationArrow,
  faMapPin,
  faSquareCaretUp,
} from "@fortawesome/free-solid-svg-icons";

// Contexts
import {
  MetroContext,
  SettingsContext,
  TranslationContext,
} from "../Contexts.jsx";

// My components
import { SelectWithIcon } from "./SearchbarWithIcon.jsx";
import DynamicCustomScroll from "./DynamicCustomScroll.jsx";
import MeasureWrapper from "./MeasureWrapper.jsx";
import EllipsisVertLine from "./EllipsisVertLine.jsx";

// My functions
import {
  getStationFromId,
  getLineFromId,
  getStationIndexOnLine,
} from "../functions/metroLookupFuncs.jsx";
import { getStationImg } from "../functions/getMetroImg.jsx";
import {
  getTowardsStationTranslation,
  getNumberStopsTranslation,
} from "../functions/getTranslations.jsx";

// URL of backend
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Search for directions
const DirectionSearch = forwardRef(
  ({ hideNavMobile, setHideNavMobile }, ref) => {
    const { stations, setMapDirections } = useContext(MetroContext);
    const { language } = useContext(SettingsContext);
    const translations = useContext(TranslationContext);

    // Queries
    const [startQuery, setStartQuery] = useState({});
    const [destQuery, setDestQuery] = useState({});

    // Route result
    const [result, setResult] = useState({});

    // Size of stuff
    const [directionSearchHeight, setDirectionSearchHeight] = useState(0);
    const [ellipsisHeight, setEllipsisHeight] = useState(0);

    // Call to backend to get results
    async function getDirections(e) {
      e.preventDefault();

      try {
        const response = await axios.get(
          `${BACKEND_URL}/api/v1/metroInfo/getRoute/${startQuery.value}/${destQuery.value}`
        );

        setResult(response.data);

        setMapDirections(response.data);

        setHideNavMobile(true);
      } catch (err) {
        setResult([]);
      }
    }

    // Mobile reset results
    function resetSearch() {
      setStartQuery("");
      setDestQuery("");
      setResult({});
      setMapDirections({});
      setHideNavMobile(false);
    }

    // Results shown?
    const is_results_shown = Object.keys(result).length !== 0;

    // Options for select dropdown
    const options = stations.map((station) => {
      return { value: station.id, label: station.name[language] };
    });

    return (
      <div
        className={`dropdown-content left-side directions-search-container ${
          hideNavMobile ? "mobile-adjust" : ""
        }`}
        ref={ref}
      >
        <MeasureWrapper
          onResize={(contentRect) =>
            setDirectionSearchHeight(contentRect.offset.height)
          }
        >
          <form
            className="directions-search-input-form"
            onSubmit={getDirections}
          >
            {/* Make space on mobile when search has already gone through */}
            {is_results_shown && (
              <>
                {/* Layout for when mobile and search results are showing */}
                <FontAwesomeIcon
                  className="mobile-return-directions-search"
                  icon={faSquareCaretUp}
                  onClick={resetSearch}
                />
              </>
            )}
            <div
              className={`directions-search-input-container ${
                is_results_shown ? "mobile-hidden" : ""
              }`}
            >
              {/* Start input */}
              <div className="directions-search-line">
                <SelectWithIcon
                  className={"directions-searchbar"}
                  icon={faLocationArrow}
                  value={startQuery}
                  options={options}
                  onChange={(option) => setStartQuery(option)}
                  key={`react-select-key${startQuery}`}
                />
              </div>
              {/* Divider ellipsis */}
              <MeasureWrapper
                onResize={(contentRect) =>
                  setEllipsisHeight(contentRect.client.height)
                }
              >
                <div className="search-ellipsis">
                  <EllipsisVertLine
                    backgroundHeight={ellipsisHeight}
                    dotColor={"var(--white)"}
                    backgroundWidth={"40%"}
                    style={{ margin: "5px 0" }}
                  />
                </div>
              </MeasureWrapper>
              {/* Destination input */}
              <div className="directions-search-line">
                <SelectWithIcon
                  className={"directions-searchbar"}
                  icon={faMapPin}
                  value={destQuery}
                  options={options}
                  onChange={(option) => setDestQuery(option)}
                  key={`react-select-key${destQuery}`}
                />
              </div>
              {/* Submit */}
              <button className="directions-search-submit" type="submit">
                {translations["Find-Route"][language]}
              </button>
            </div>
          </form>
        </MeasureWrapper>
        {/* Route result */}
        {result.trip_legs && (
          <>
            <div className="route-results-border" />
            <DynamicCustomScroll
              className="route-results-container"
              maxHeight={`calc(100dvh - var(--nav-height) - var(--nav-border-width) - ${directionSearchHeight}px`}
            >
              <div className="route-results">
                {result.trip_legs.map(
                  (
                    { start_id, end_id, line_id, towards_station_id, stops },
                    index
                  ) => {
                    return (
                      <div className="trip-leg">
                        {index === 0 && (
                          <DirectionsStation
                            station_id={start_id}
                            line_id={line_id}
                          />
                        )}
                        <DirectionsRailway
                          line_id={line_id}
                          stops={stops}
                          towards_station_id={towards_station_id}
                        />
                        <DirectionsStation
                          station_id={end_id}
                          line_id={line_id}
                        />
                      </div>
                    );
                  }
                )}
              </div>
            </DynamicCustomScroll>
          </>
        )}
      </div>
    );
  }
);

// Template for a line of the directions containing a station
function DirectionsStation({ station_id, line_id }) {
  const { language } = useContext(SettingsContext);

  const station = getStationFromId(station_id);
  const line = getLineFromId(line_id);

  return (
    <>
      <div className="directions-line">
        <div className="directions-icon">
          <img
            src={getStationImg(
              line.code,
              getStationIndexOnLine(station_id, line_id)
            )}
          />
        </div>
        <div className="directions-text">
          <h3>{station.name[language]}</h3>
        </div>
      </div>
    </>
  );
}

// Template for a line of the directions containing a railway
function DirectionsRailway({ line_id, towards_station_id, stops }) {
  const { language } = useContext(SettingsContext);

  // Match height of ellipsis with text
  const [textHeight, setTextHeight] = useState(48);

  // Get all the info
  const line = getLineFromId(line_id);
  const towards_station = getStationFromId(towards_station_id);

  const towards_station_name = towards_station.name[language];
  const towards_station_parens =
    " (" + line.code + getStationIndexOnLine(towards_station_id, line_id) + ")";

  return (
    <>
      <div className="directions-line">
        <div className="directions-icon">
          <EllipsisVertLine
            backgroundHeight={textHeight}
            dotColor={line.color}
          />
        </div>
        <MeasureWrapper
          onResize={(contentRect) => setTextHeight(contentRect.bounds.height)}
        >
          <div className="directions-text">
            <h4>{line.name[language]}</h4>
            <h4>
              {getTowardsStationTranslation(
                towards_station_name,
                towards_station_parens,
                language
              )}
            </h4>
            <h4>{getNumberStopsTranslation(stops, language)}</h4>
          </div>
        </MeasureWrapper>
      </div>
    </>
  );
}

export { DirectionSearch };
