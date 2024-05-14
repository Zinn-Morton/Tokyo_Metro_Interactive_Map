import Measure from "react-measure";

function MeasureWrapper({ children, onResize }) {
  return (
    <Measure bounds client offset onResize={onResize}>
      {({ measureRef }) => (
        <div className="measurer" ref={measureRef}>
          {children}
        </div>
      )}
    </Measure>
  );
}

export default MeasureWrapper;
