// Dropdown line in LineSelector and SearchDropdown showing an image next to text
function DropdownTrainLine({ button_class, onClick, left_elem, p_text }) {
  return (
    <button className={button_class} onClick={onClick}>
      {left_elem}
      <p>{p_text}</p>
    </button>
  );
}

export { DropdownTrainLine };
