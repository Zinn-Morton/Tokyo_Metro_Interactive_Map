// Basic stuff
import { useState, useEffect, useRef, useContext } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isMobile, isBrowser } from "react-device-detect";

// Map stuff
import {
  MapContainer,
  useMapEvents,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  ZoomControl,
  useMap,
  FeatureGroup,
} from "react-leaflet";
import L, { map } from "leaflet";
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";

// Fontawesome
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrain } from "@fortawesome/free-solid-svg-icons";

// Contexts
import { SettingsContext, MapContext, MetroContext } from "../Contexts.jsx";

// My functions
import { getStationImg, getLineImg } from "../functions/getMetroImg.jsx";
import {
  getLineFromId,
  getStationFromId,
} from "../functions/metroLookupFuncs.jsx";

// Constants
const TOKYO_CENTER = [35.71, 139.75];
const FIT_BOUNDS_LEFT_PADDING = 0.02;

// Map
function MapComponent() {
  const { language, enableMap, darkMode } = useContext(SettingsContext);
  const { map_ref, popup_refs } = useContext(MapContext);
  const {
    stations,
    lines,
    geoHashmap,
    mapDirections,
    setSearchedStationId,
    fetchInfoError,
  } = useContext(MetroContext);

  // Tracks zoom level for showing station indices
  const [zoom, setZoom] = useState(isMobile ? 11.5 : 12);

  // Fit map to bounds when directions are shown
  const directions_group_ref = useRef(null);
  const [bounds, setBounds] = useState(null);
  useEffect(() => {
    if (directions_group_ref.current)
      setBounds(directions_group_ref.current.getBounds());
  }, [mapDirections]);

  function FitBounds() {
    const map = useMap();

    useEffect(() => {
      if (bounds) {
        let adj_bounds = bounds;

        const zoomout_factor = 0.5;
        const panleft_amount = 0.7;
        const panup_amount = 0.005;
        const { _southWest, _northEast } = bounds;

        const new_sw = L.latLng(
          _southWest.lat +
            panup_amount -
            zoomout_factor * (_northEast.lat - _southWest.lat),
          _southWest.lng - panleft_amount * (_northEast.lng - _southWest.lng)
        );
        const new_ne = L.latLng(
          _northEast.lat + zoomout_factor * (_northEast.lat - _southWest.lat),
          _northEast.lng
        );
        adj_bounds = L.latLngBounds(new_sw, new_ne);

        map.fitBounds(adj_bounds);

        setBounds(null);
      }
    }, [mapDirections, bounds]);

    return null;
  }

  // Rerender map tiles when darkmode changes
  const [tileKey, setTileKey] = useState(0);
  useEffect(() => {
    setTileKey((prevKey) => (prevKey + 1) % 10);
  }, [darkMode]);

  // Show line when hovering over the line and hide when it gets far enough away from the popup
  const [showMouseOverPopup, setShowMouseOverPopup] = useState(false);
  const [mouseOverPopupImg, setMouseOverPopupImg] = useState("");
  const [mouseOverPopupName, setMouseOverPopupName] = useState("");
  const [mouseOverPopupPos, setMouseOverPopupPos] = useState(TOKYO_CENTER);

  // Show popup
  function handleMouseOver(e, name, img) {
    if (isBrowser && showMouseOverPopup) return;

    setMouseOverPopupName(name);
    setMouseOverPopupImg(img);
    setMouseOverPopupPos(e.latlng);
    setShowMouseOverPopup(true);
  }

  // Function to hide popup
  function hideMouseOverPopup() {
    map_ref.current.closePopup();

    // Had to do this timeout because conditional rendering of the popup was weird when hiding
    setTimeout(() => {
      setShowMouseOverPopup(false);
    }, 200);
  }

  // Hide popup when mouse is far enough away
  function MapEvents() {
    useMapEvents({
      mousemove: (e) => {
        if (!showMouseOverPopup) return;

        // Calculate distance between mouse position and popup position
        const popup_point =
          map_ref.current.latLngToContainerPoint(mouseOverPopupPos);
        const mouse_point = map_ref.current.mouseEventToContainerPoint(
          e.originalEvent
        );
        const distance = popup_point.distanceTo(mouse_point);

        // Hide the popup if the distance is greater than a threshold
        if (distance > 25) {
          hideMouseOverPopup();
        }
      },
      popupclose: () => {
        // Had to do this timeout because conditional rendering of the popup was weird when hiding
        setTimeout(() => {
          // Unshow searched station
          setSearchedStationId(null);
        }, 200);
      },
      zoom: () => {
        setZoom(map_ref.current.getZoom());
      },
    });

    return null;
  }

  return (
    <>
      {/* Div to color background if map is disabled */}
      <div className="map-background">
        <MapContainer
          className="map"
          ref={map_ref}
          center={isMobile ? [35.685, 139.75] : TOKYO_CENTER}
          zoom={zoom}
          zoomControl={false}
          attributionControl={false}
          zoomDelta={0.5}
          zoomSnap={0.5}
        >
          <MapEvents />
          <FitBounds />

          {/* Fetch info error message */}
          {fetchInfoError && <h1 className="error-msg">{fetchInfoError}</h1>}

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

          {/* If directions are searched show them instead of regular map */}
          {Object.keys(mapDirections).length > 0 ? (
            <FeatureGroup ref={directions_group_ref}>
              {/* Station markers */}
              {mapDirections.station_list.map(({ id }) => {
                return (
                  <StationMarker
                    station={getStationFromId(id)}
                    zoom={zoom}
                    popup_refs={popup_refs}
                    setShowMouseOverPopup={setShowMouseOverPopup}
                    force_shown={true}
                  />
                );
              })}
              {/* Line polylines */}
              {mapDirections.polylines.map(({ line_id, station_order }) => {
                const positions = station_order.map((station_id) => {
                  return geoHashmap[station_id];
                });

                const line = getLineFromId(line_id);

                return (
                  <RailwayPolyline
                    line={line}
                    polyline_positions={positions}
                    handleMouseOver={handleMouseOver}
                    force_shown={true}
                  />
                );
              })}
              ;
            </FeatureGroup>
          ) : (
            <>
              {/* Maps stations into markers on the map */}
              {stations &&
                stations.map((station) => {
                  return (
                    <StationMarker
                      station={station}
                      zoom={zoom}
                      popup_refs={popup_refs}
                      setShowMouseOverPopup={setShowMouseOverPopup}
                    />
                  );
                })}

              {/* Draws lines between markers for each metro line */}
              {lines &&
                lines.map((line) => {
                  return (
                    <RailwayPolyline
                      line={line}
                      handleMouseOver={handleMouseOver}
                    />
                  );
                })}
            </>
          )}

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

// Station marker for map
function StationMarker({
  station,
  zoom,
  popup_refs,
  setShowMouseOverPopup,
  force_shown,
}) {
  const { language } = useContext(SettingsContext);
  const { lines, searchedStationId } = useContext(MetroContext);

  // Invisible icon
  const invis_icon = new L.icon({
    iconUrl:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    iconSize: [1, 1], // Set a very small icon size
  });

  // Map icon
  const custom_icon = mapIcon(zoom, station);

  const shown = force_shown
    ? true
    : station.shown || station.id === searchedStationId;

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
      eventHandlers={{
        click: () => {
          setShowMouseOverPopup(false);
        },
      }}
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
                  <img src={getStationImg(railway.code, railway.index)}></img>
                  <h3>
                    {
                      lines.find((line) => line.id === railway.id).name[
                        language
                      ]
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
}

// Rail line polyline for map
function RailwayPolyline({
  line,
  polyline_positions,
  handleMouseOver,
  force_shown,
}) {
  const { language } = useContext(SettingsContext);
  const { geoHashmap } = useContext(MetroContext);

  if (!force_shown && !line.shown) {
    return null;
  }

  const positions =
    polyline_positions ||
    line.stationOrder.map((station) => {
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
            weight: 25,
            opacity: 0,
          }}
          eventHandlers={{
            click: (e) =>
              handleMouseOver(e, line.name[language], getLineImg(line.code)),
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
}

// Custom map icon which depends on zoom level
function mapIcon(zoom, station) {
  const ENLARGE_ZOOM_LVL = 14.5;

  const ZOOM_VARS = {
    "--map-icon-size": `${8 * (zoom - ENLARGE_ZOOM_LVL) + 24}px !important`,
    "--map-icon-station-size": "calc(var(--map-icon-size) + 2px) !important",
    "--map-icon-total-size": "calc(var(--map-icon-size) * 1.4) !important",
  };

  const use_style = zoom >= ENLARGE_ZOOM_LVL ? ZOOM_VARS : {};

  const icon_markup = renderToStaticMarkup(
    <div className="map-icon-container" style={use_style}>
      <div>
        <div className="map-icon-background">
          <FontAwesomeIcon className="map-icon" icon={faTrain} />
        </div>
        {/* If sufficiently zoomed in show stop indices */}
        {zoom >= ENLARGE_ZOOM_LVL && (
          <div className="map-icon-stations-container">
            {station.railways.map((railway) => {
              return (
                <div className="map-icon-background map-icon-station-div">
                  <img
                    className="map-icon-station"
                    src={getStationImg(railway.code, railway.index)}
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

export { MapComponent };
