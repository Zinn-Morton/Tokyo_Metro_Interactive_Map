function getChosenLineIds(lines) {
  let chosen_line_ids = [];

  if (lines) {
    lines.forEach((line) => {
      if (line.shown && !chosen_line_ids.includes(line.id)) {
        chosen_line_ids.push(line.id);
      }
    });
  }

  return chosen_line_ids;
}

export { getChosenLineIds };
