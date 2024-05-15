function getStationImg(code, index) {
  let folder_code = code == "Mb" ? "M" : code;

  let path = "";
  if (index < 10) {
    path = `/metro_img/station_number/${folder_code}/${code.toLowerCase()}-0${index}.png`;
  } else {
    path = `/metro_img/station_number/${folder_code}/${code.toLowerCase()}-${index}.png`;
  }

  return path;
}

function getLineImg(code) {
  let line_code = code == "Mb" ? "M" : code;

  return `/metro_img/line_symbol/${line_code}.png`;
}

function getOperatorImg(operator) {
  return `/metro_img/operator_symbol/${operator.split(":").pop()}.png`;
}

export { getStationImg, getLineImg, getOperatorImg };
