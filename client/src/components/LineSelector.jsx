// Basic stuff
import { useState, useEffect, useContext, forwardRef } from "react";

// Fontawesome
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSquareCheck,
  faSquareXmark,
} from "@fortawesome/free-solid-svg-icons";

// Contexts
import {
  SettingsContext,
  TranslationContext,
  MetroContext,
} from "../Contexts.jsx";

// My components
import { DropdownTrainLine } from "./DropdownTrainLine.jsx";
import DynamicCustomScroll from "./DynamicCustomScroll.jsx";

// My functions
import { getLineImg, getOperatorImg } from "../functions/getMetroImg.jsx";
import { getChosenLineIds } from "../functions/getChosenLineIds.jsx";

// Dropdown from navbar to be able to select lines
const LineSelector = forwardRef(({ linesDropdown }, ref) => {
  const { language } = useContext(SettingsContext);
  const translations = useContext(TranslationContext);
  const {
    lines,
    setLinesUpdateStation,
    toggleLineShownNextState,
    operatorIdToName,
    operators,
  } = useContext(MetroContext);

  // State of each operator toggle (selected/unselected)
  const [operatorToggles, setOperatorToggles] = useState({});

  // Initialize all as true
  useEffect(() => {
    let operator_toggles = {};

    operators.forEach((operator) => {
      operator_toggles[operator] = true;
    });

    setOperatorToggles(operator_toggles);
  }, [operators]);

  // Update operator toggles from lines
  function updateOperatorToggles(updated_lines) {
    let updated_operator_toggles = { ...operatorToggles };

    operators.forEach((operator) => {
      let all_false = true;
      let all_true = true;

      updated_lines.forEach((line) => {
        if (line.operator === operator) {
          if (line.shown) {
            all_false = false;
          } else {
            all_true = false;
          }
        }
      });

      if (all_true) {
        updated_operator_toggles[operator] = true;
      }

      if (all_false) {
        updated_operator_toggles[operator] = false;
      }
    });

    setOperatorToggles(updated_operator_toggles);
  }

  // Each time a station is shown/unshown update the operator toggles (if neccesary)
  useEffect(() => updateOperatorToggles(lines), [lines]);

  // Button handler for line toggle - update operator button and line button in sync
  function toggleLineShownButton(line_id) {
    const updated_lines = toggleLineShownNextState(line_id);
    updateOperatorToggles(updated_lines);
    setLinesUpdateStation(updated_lines);
  }

  // Show all / hide all stuff
  function setAllLines(show) {
    let updated_lines = [...lines];

    updated_lines.forEach((line) => {
      line.shown = show;
    });

    updateOperatorToggles(updated_lines);

    setLinesUpdateStation(updated_lines);
  }

  // Toggles show/hide for all lines for an operator
  function toggleOperatorLines(operator) {
    let updated_lines = [...lines];

    updated_lines.forEach((line) => {
      if (line.operator === operator) line.shown = !operatorToggles[operator];
    });

    updateOperatorToggles(updated_lines);

    setLinesUpdateStation(updated_lines);
  }

  // Get chosen line ids in a simple list
  const chosen_line_ids = getChosenLineIds(lines);
  if (lines) {
    lines.forEach((line) => {
      if (line.shown && !chosen_line_ids.includes(line.id)) {
        chosen_line_ids.push(line.id);
      }
    });
  }

  return (
    linesDropdown && (
      <div className="dropdown-content left-side line-selector" ref={ref}>
        <div className="control-all">
          <DropdownTrainLine
            button_class="dropdown-line railway-line div-button black selected"
            onClick={() => setAllLines(true)}
            left_elem={
              <FontAwesomeIcon icon={faSquareCheck} className="dropdown-icon" />
            }
            p_text={translations["Show-All"]?.[language]}
          />
          <DropdownTrainLine
            button_class="dropdown-line railway-line div-button black unselected"
            onClick={() => setAllLines(false)}
            left_elem={
              <FontAwesomeIcon icon={faSquareXmark} className="dropdown-icon" />
            }
            p_text={translations["Hide-All"]?.[language]}
          />
        </div>
        {/* Section for each operator */}
        <DynamicCustomScroll className={"line-toggles-container"}>
          <div className="line-toggles">
            {operators.map((operator) => {
              return (
                <>
                  <DropdownTrainLine
                    button_class={
                      "dropdown-line railway-line div-button black operator-line " +
                      (operatorToggles[operator] ? "selected" : "unselected")
                    }
                    onClick={() => {
                      toggleOperatorLines(operator);
                    }}
                    left_elem={
                      <img
                        src={getOperatorImg(operator)}
                        className="metro-img"
                        alt=""
                      />
                    }
                    p_text={operatorIdToName[operator][language]}
                  />
                  {/* Line for each line */}
                  {lines.map((line) => {
                    const selected =
                      chosen_line_ids && chosen_line_ids.includes(line.id);

                    // Conditionally render if its ran by the above operator
                    return (
                      line.operator === operator && (
                        <DropdownTrainLine
                          button_class={
                            "dropdown-line railway-line div-button black " +
                            (selected ? "selected" : "unselected")
                          }
                          onClick={() => toggleLineShownButton(line.id)}
                          left_elem={
                            <img
                              src={getLineImg(line.code)}
                              className="metro-img indent"
                              alt=""
                            />
                          }
                          p_text={line.name[language]}
                        />
                      )
                    );
                  })}
                </>
              );
            })}
          </div>
        </DynamicCustomScroll>
      </div>
    )
  );
});

export { LineSelector };
