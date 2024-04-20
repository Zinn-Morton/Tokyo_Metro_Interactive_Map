function getStationImg(code, index) {
  let path = "";
  if (index < 10) {
    path = `/metro_img/station_number/${code[0]}/${code.toLowerCase()}-0${index}.png`;
  } else {
    path = `/metro_img/station_number/${code[0]}/${code.toLowerCase()}-${index}.png`;
  }

  return path;
}

function getLineImg(code) {
  return `/metro_img/line_symbol/${code}.png`;
}

export { getStationImg, getLineImg };
