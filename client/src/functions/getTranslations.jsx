const translations = {
  "Show-All": {
    en: "Show All",
    ja: "全表示",
    ko: "전체 선택",
    "zh-Hans": "全选",
    "zh-Hant": "全選",
  },
  "Hide-All": {
    en: "Hide All",
    ja: "全非表示",
    ko: "전체 선택 해제",
    "zh-Hans": "取消全选",
    "zh-Hant": "取消全選",
  },
  Stations: {
    en: "Stations",
    ja: "駅",
    ko: "역",
    "zh-Hans": "站",
    "zh-Hant": "站",
  },
  Lines: {
    en: "Lines",
    ja: "線",
    ko: "노선",
    "zh-Hans": "线",
    "zh-Hant": "線",
  },
  "Find-Route": {
    en: "Find Route",
    ja: "ルートを検索する",
    ko: "루트 검색",
    "zh-Hans": "路线检索",
    "zh-Hant": "路線檢索",
  },
  For: {
    en: "For",
    ja: "行",
    ko: "행",
    "zh-Hans": "开往",
    "zh-Hant": "開往",
  },
};

function getTranslations() {
  return translations;
}

// Translates "For [STATION] (X-##)" to multiple languages
function getTowardsStationTranslation(station_name, station_parens, language) {
  if (language === "en") {
    return `${translations["For"].en} ${station_name} ${station_parens}`;
  } else if (language === "ja") {
    return `${station_name}${translations["For"].ja} ${station_parens}`;
  } else if (language === "ko") {
    return `${station_name}${translations["For"].ko} ${station_parens}`;
  } else if (language === "zh-Hans") {
    return `${translations["For"]["zh-Hans"]} ${station_name} ${station_parens}`;
  } else if (language === "zh-Hant") {
    return `${translations["For"]["zh-Hant"]} ${station_name} ${station_parens}`;
  }
}

// Translates "X Station(s)" to multiple languages
function getNumberStopsTranslation(num, language) {
  if (language === "en") {
    if (num === 1) {
      return "1 Stop";
    } else {
      return `${num} Stops`;
    }
  } else if (language === "ja") {
    return `${num}駅`;
  } else if (language === "ko") {
    return `정류장 ${num}개`;
  } else if (language === "zh-Hans" || language === "zh-Hant") {
    return `${num}站`;
  }
}

export {
  getTranslations,
  getTowardsStationTranslation,
  getNumberStopsTranslation,
};
