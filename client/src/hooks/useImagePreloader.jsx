import { useState, useEffect } from "react";

import { getStationImg, getLineImg } from "../functions/getMetroImg.jsx";

function useImagePreloader(stations, lines) {
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    let is_mounted = true;

    if (stations && lines) {
      let image_urls = [];
      stations.forEach((station) => {
        station.railways.forEach((railway) => {
          image_urls.push(getStationImg(railway.code, railway.index));
        });
      });

      lines.forEach((line) => {
        image_urls.push(getLineImg(line.code));
      });

      function preloadImages() {
        const image_promises = image_urls.map((url) => {
          return new Promise((resolve, reject) => {
            const img = (new Image().src = url);
            img.onload = resolve;
            img.onerror = reject;
          });
        });

        Promise.all(image_promises)
          .then(() => {
            // All images are loaded
            if (is_mounted) {
              setImagesLoaded(true);
            }
          })
          .catch((error) => {
            console.error("Error preloading images:", error);
          });
      }

      preloadImages();
    }

    return () => {
      is_mounted = false;
    };
  }, [stations, lines]);

  return imagesLoaded;
}

export { useImagePreloader };
