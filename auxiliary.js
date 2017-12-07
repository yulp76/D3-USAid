//Set color scales
var colorCategory = d3.scaleOrdinal()
                  .domain(['Other', 'Agriculture', 'Economic Growth', 'Governance',
                           'Infrastructure', 'Health and Population', 'Education',
                            'Administrative Costs', 'Commodity Assistance', 'Humanitarian'])
                  .range(["#d9d9d9", "#8dd3c7", "#b3de69", "#bebada", "#80b1d3",
                          "#fccde5", "#ffffb3", "#bc80bd", "#fb8072","#fdb462"]),
    colorIncome = d3.scaleOrdinal()
                    .domain(['Low Income Country','Lower Middle Income Country', 
                            'Upper Middle Income Country', 'High Income Country'])
                    .range(["#b30000", "#fc8d59", "#fdd49e", "#7bccc4"]),
    colorRegion = d3.scaleOrdinal()
                    .domain(['Sub-Saharan Africa', 'Western Hemisphere', 'East Asia and Oceania',
                             'South and Central Asia', 'Europe and Eurasia',
                             'Middle East and North Africa'])
                    .range(["#e41a1c","#377eb8","#4daf4a","#984ea3","#ff7f00","#ffff33"])

var category = colorCategory.domain(),
    income = colorIncome.domain(),
    region = colorRegion.domain();


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