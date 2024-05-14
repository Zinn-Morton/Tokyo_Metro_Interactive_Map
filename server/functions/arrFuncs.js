// Intersection of two arrays
function getArrIntersection(arr1, arr2) {
  return arr1.filter((value) => arr2.includes(value));
}

module.exports = { getArrIntersection };
