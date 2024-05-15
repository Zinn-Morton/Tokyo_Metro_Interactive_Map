import { forwardRef } from "react";
import Select from "react-select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { SingleValue } from "react-select/animated";

const SearchbarWithIcon = forwardRef(
  ({ icon, value, onChange, className }, searchbox_ref) => {
    return (
      <div className={`searchbar-with-icon ${className}`}>
        <div className="search-side-icon-background">
          <FontAwesomeIcon icon={icon} className="search-side-icon" />
        </div>
        <input
          type="text"
          ref={searchbox_ref}
          className="search-input"
          placeholder="..."
          value={value}
          onChange={onChange}
        />
      </div>
    );
  }
);

const SelectWithIcon = forwardRef(
  ({ icon, value, options, onChange, className, autoFocus }, select_ref) => {
    const customStyles = {
      container: (provided) => ({
        ...provided,
        width: "calc(100% - var(--metro-img-size))",
      }),

      control: (provided, state) => ({
        ...provided,
        background: "var(--background-color)",
        color: "var(--opposite-color)",
        border: "none",
        height: "var(--search-height)",
        minHeight: "var(--search-height)",
        boxShadow: state.isFocused ? null : null,
        width: "100%",
      }),

      valueContainer: (provided, state) => ({
        ...provided,
        height: "var(--search-height)",
        padding: "0 6px",
        background: "var(--background-color)",
      }),

      input: (provided, state) => ({
        ...provided,
        margin: "0px",
        color: "var(--opposite-color)",
        width: "calc(100% - var(--metro-img-size))",
      }),

      indicatorSeparator: (state) => ({
        display: "none",
      }),

      indicatorsContainer: (provided, state) => ({
        ...provided,
        height: "var(--search-height)",
      }),

      menu: (provided, state) => ({
        ...provided,
        background: "var(--background-color)",
      }),

      option: (provided, { isFocused }) => ({
        ...provided,
        background: isFocused
          ? "var(--select-hover)"
          : "var(--background-color)",
      }),

      singleValue: (provided) => ({
        ...provided,
        color: "var(--opposite-color)",
        position: "relative",
      }),
    };

    return (
      <div className={`searchbar-with-icon ${className}`}>
        <div className="search-side-icon-background">
          <FontAwesomeIcon icon={icon} className="search-side-icon" />
        </div>
        <Select
          ref={select_ref}
          className="search-input"
          defaultValue={value}
          options={options}
          onChange={onChange}
          styles={customStyles}
          autoFocus={autoFocus}
          // menuIsOpen={true}
        />
      </div>
    );
  }
);

export { SearchbarWithIcon, SelectWithIcon };
