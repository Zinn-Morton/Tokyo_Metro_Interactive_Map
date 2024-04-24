import { useEffect } from "react";

// Hook to handle what happens when you click outside of an element
// onClickOutside is a function for what to do if there is a click outside the element
// inside_refs is an array of refs "inside", which should not trigger onClickOutside
function useClickOutside(inside_refs, onClickOutside) {
  useEffect(() => {
    function handleClickOutside(e) {
      // Check if the click is outside all elements in inside_refs
      let clicked_inside = false;

      for (let i = 0; i < inside_refs.length; i++) {
        if (inside_refs[i].current && inside_refs[i].current.contains(e.target)) {
          clicked_inside = true;
          break;
        }
      }

      // If the click is on none of the elements run onClickOutside
      if (!clicked_inside) {
        onClickOutside();
      }
    }

    // Event listener
    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [inside_refs, onClickOutside]);
}

export { useClickOutside };
