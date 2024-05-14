function EllipsisVertLine({
  className,
  backgroundHeight,
  backgroundWidth,
  dotColor,
  style,
}) {
  const ellipsis_total_height = backgroundHeight * 0.9;
  const num_ellipsis = Math.floor(ellipsis_total_height / 10) - 2;
  const single_ellipsis_height = ellipsis_total_height / num_ellipsis;

  return (
    <div
      className={`ellipsis-background ${className}`}
      style={{ ...style, height: backgroundHeight, width: backgroundWidth }}
    >
      <div
        className="ellipsis-custom"
        style={{
          backgroundImage: `radial-gradient(circle, ${dotColor} 4px, transparent 1px)`,
          backgroundSize: `100% ${single_ellipsis_height}px`,
        }}
      />
    </div>
  );
}

export default EllipsisVertLine;
