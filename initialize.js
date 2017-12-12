var margin = {top: 10, right: 5, bottom: 10, left: 5},
    sankeyWidth = 750,
    mapWidth = 500,
    height = 600,
    R = Math.min(mapWidth, height)/2,
    donutWidth = 25,
    innerR = R - donutWidth;

var colorCategory = d3.scaleOrdinal()
                  .domain(['Administrative Costs', 'Agriculture', 'Commodity Assistance',
                           'Economic Growth', 'Education', 'Governance', 'Health and Population', 
                           'Humanitarian', 'Infrastructure', 'Other'])
                  .range(["#8dd3c7", "#b3de69", "#bebada", "#80b1d3", "#fccde5",
                          "#ffffb3", "#bc80bd", "#fb8072", "#fdb462", "#d9d9d9"]),
    colorIncome = d3.scaleOrdinal()
                    .domain(['Low Income Country','Lower Middle Income Country', 
                            'Upper Middle Income Country', 'High Income Country'])
                    .range(["#b30000", "#fc8d59", "#fdd49e", "#7bccc4"]),
    colorRegion = d3.scaleOrdinal()
                    .domain(['Sub-Saharan Africa', 'Western Hemisphere', 'East Asia and Oceania',
                             'South and Central Asia', 'Europe and Eurasia',
                             'Middle East and North Africa'])
                    .range(["#e41a1c","#377eb8","#4daf4a","#984ea3","#ff7f00","#ffff33"]);

var category = colorCategory.domain(),
    income = colorIncome.domain(),
    region = colorRegion.domain();

var originalScale = 250,
    scale = originalScale;

var wheel_k = 1;
var map_k = 1;
var init = true;
var group = "region";

//Map projection
var projection = d3.geoOrthographic()
          .scale(scale)
          .translate([mapWidth/2, height/2])
          .clipAngle(90);  

var map_path = d3.geoPath()
                 .projection(projection);


//SVGs
var svg1 = d3.select("#chart1")
           .attr("width", sankeyWidth)
           .attr("height", height);

var svg2 = d3.select("#chart2")
           .attr("width", mapWidth)
           .attr("height", height);
           
    svg2.append("clipPath")
         .attr("id", "map_area")
         .append("circle")
         .attr("cx", mapWidth/2)
         .attr("cy", height/2)
         .attr("r", innerR);

var gMap = svg2.append("g")
               .attr("class", "map")
               .attr("clip-path", "url(#map_area)");

//Layouts
var sankey_layout = d3.sankey()
    .nodeId(function (d) { return d.name; })
    .nodeWidth(12)
    .nodePadding(20)
    .extent([[margin.left,margin.top], [sankeyWidth-75, height-margin.bottom]]);

var arc = d3.arc().outerRadius(R).innerRadius(innerR);

var pie = d3.pie().value(function(d) { return d.value; });

function pieArc(k){
  return d3.arc()
            .outerRadius(function(d) { return k*Math.min(50, Math.max(5, Math.sqrt(byCountryTotal.get(getCountry(this))/50000))); })
            .innerRadius(function(d) { return k*4; })
};