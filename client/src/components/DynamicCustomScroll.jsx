import { useState, useEffect } from "react";
import { CustomScroll } from "react-custom-scroll";

function DynamicCustomScroll({ className, maxHeight, children }) {
  // Rerender on window resize
  const [rerender, setRerender] = useState(0);
  useEffect(() => {
    function handleResize() {
      setRerender((prevKey) => (prevKey + 1) % 10);
    }

    window.addEventListener("resize", handleResize);

    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div
      className={`${className} dynamic-custom-scroll-container`}
      style={{ display: "flex", maxHeight: maxHeight }}
    >
      <CustomScroll
        flex="1"
        className="custom-scroll-root"
        handleClass="custom-scroll-handle"
      >
        {children}
      </CustomScroll>
    </div>
  );
}

export default DynamicCustomScroll;
