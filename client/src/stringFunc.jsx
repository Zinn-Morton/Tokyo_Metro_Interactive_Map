function substringBeforeLastSpace(str) {
  // Find the last index of space character
  const lastIndex = str.lastIndexOf(" ");

  if (lastIndex !== -1) {
    // Return substring before the last space
    return str.substring(0, lastIndex);
  } else {
    // If no space found, return the original string
    return str;
  }
}

export { substringBeforeLastSpace };
