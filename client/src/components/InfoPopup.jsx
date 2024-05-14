// Basic stuff
import { forwardRef } from "react";

// Fontawesome
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleXmark } from "@fortawesome/free-solid-svg-icons";

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
      <h4>zinnkayosmorton@gmail.com</h4>
      <div className="break" />
      <h4>
        Data from{" "}
        <a href="https://developer.odpt.org/en/info" target="_blank">
          Public Transportation Open Data Center
        </a>
      </h4>
      <div className="break" />
      <h4>
        Translations from{" "}
        <a
          href="https://rapidapi.com/undergroundapi-undergroundapi-default/api/google-translate113"
          target="_blank"
        >
          undergroundAPI's Google Translate API on rapidapi.com
        </a>
      </h4>
      <div className="break" />
      <h4>
        Some station geological data was gathered from{" "}
        <a
          href="https://nominatim.org/release-docs/develop/api/Overview/"
          target="_blank"
        >
          Nominatim API
        </a>
      </h4>
      <div className="break" />
      <h4>Made using React, Vite, Express</h4>
      <div className="break" />
      <h4>Packages used: Leaflet, React Leaflet, Axios, FontAwesome</h4>
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
      <h4>
        Note: Data may not be up to date
        <br />
        Non Tokyo Metro stations/lines were machine translated to Korean and
        Chinese
      </h4>
      <div className="break"></div>
    </div>
  );
});

export { InfoPopup };
