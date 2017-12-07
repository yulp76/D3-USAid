function getColor(name) {
      if (category.includes(name)) {
        return colorCategory(name);
      } else if (income.includes(name)) {
        return colorIncome(name);
      } else if (region.includes(name)) {
        return colorRegion(name);
      } else { return "#cccccc"; }
};

//Delete whitespace and "." in a string to make it a valid class name
function className(string) {
  return string.split(".").join("").replace(/ /g,"");
}

function getCountry(obj) {
  return d3.select(obj.parentNode).attr("class").slice(0,-11);
};