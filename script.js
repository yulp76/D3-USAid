var margin = {top: 10, right: 5, bottom: 10, left: 5},
    sankeyWidth = 700,
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

var zoom = d3.zoom()
             .scaleExtent([1,10])
             .on("zoom", zooming);
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

/*
var chartsDiv = document.getElementById("charts"),
    pageWidth = chartsDiv.clientWidth,
    pageHeight = chartsDiv.clientHeight
*/


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
    .extent([[margin.left,margin.top], [sankeyWidth-50, height-margin.bottom]]);

var arc = d3.arc().outerRadius(R).innerRadius(innerR);

var pie = d3.pie().value(function(d) { return d.value; });

function pieArc(k){
  return d3.arc()
            .outerRadius(function(d) { return k*Math.max(5, Math.sqrt(byCountryTotal.get(getCountry(this))/10000)); })
            .innerRadius(function(d) { return k*4; })
};

//Load
d3.queue()
  .defer(d3.csv, 'data/sample.csv')
  .defer(d3.json, 'data/world.json')
  .await(load);


function load(error, aid, world) {
  if (error) { console.log(error); }

  countries = world.features;
  centroid = getCentroid(countries);

  //populate donors/recipients
  var dataAllYears;
  donor = [];
  recipient = [];

  aid.forEach(function (record) {
        if (!donor.includes(record.implementing_agency_name)) {
                donor.push(record.implementing_agency_name); };
        if (!recipient.includes(record.country_name)) {
                recipient.push(record.country_name); };
  });

  d3.select("#donor")
    .append("select")
    .attr("multiple", true)
    .selectAll("option")
    .data(donor)
    .enter()
    .append("option")
    .text(function(d) { return d; })
    .attr("value", function (d) { return d; });

  d3.select("#recipient")
    .append("select")
    .attr("multiple", true)
    .selectAll("option")
    .data(recipient)
    .enter()
    .append("option")
    .text(function(d) { return d; })
    .attr("value", function (d) { return d; });


  d3.select("#generate")
    .on("click", function(){
      selectedDonor = [];
      selectedRecipient = [];
      selectedCategory = [];

      d3.select("#donor")
        .selectAll("option")
        .filter(function () { return this.selected; })
        .each(function () { selectedDonor.push(this.value); });
      d3.select("#recipient")
        .selectAll("option")
        .filter(function () { return this.selected; })
        .each(function () { selectedRecipient.push(this.value); });
      d3.select("#category")
        .selectAll("input")
        .filter(function () { return d3.select(this).property("checked"); })
        .each(function () { selectedCategory.push(d3.select(this).property("value")); });
      d3.select("#group")
        .selectAll("input")
        .filter(function () { return d3.select(this).property("checked"); })
        .each(function () { group = d3.select(this).property("value"); });
      year = parseInt(d3.select("#year").property("value"));
      dataAllYears = aid.filter(function(d) { return (selectedDonor.includes(d.implementing_agency_name)) &&
                                             (selectedRecipient.includes(d.country_name)) &&
                                             (selectedCategory.includes(d.dac_category_name)); });
      data = dataAllYears.filter(function(d) { return d.numeric_year == year; });

      byCategory = aggregateCategory(data); 
      byCountry = aggregateCountry(data);
      byCountryTotal = byCountry[0];
      byCountryCategory = byCountry[1];
      graph = sankeyFormat(data, group);     
      
      if (init) {
            plotSankey(graph);
            plotDonut(byCategory);
            drawMap(countries);
            drawCountryPie();
            init = false;
      } else { update(); };

      sankeyMotion();  
      mapMotion();

});

  d3.select("#year").on("input", function(){
    d3.select("#year-value").text(this.value);
    if (!init) {
          year = this.value;
          data = dataAllYears.filter(function(d) { return d.numeric_year == year; });
          update();
          sankeyMotion();
          mapMotion(); 
         };
  })
};

function update() {
  //Will work with update Sankey later if it's visually effectively,
    //replot for now
    d3.selectAll(".node")
      .remove()
    d3.selectAll(".link")
      .remove()

    plotSankey(graph);

    //Update pies on the map
    //Choose to remove all old pies and plot new ones
    //Otherwise very complicated and not visually valuable at all
    d3.selectAll(".countryPie")
      .remove();
    drawCountryPie();

    //Update Donut
    //need to work on tweenArc
    //otherwise will generate path errors with "transition"
    var donut = svg2.selectAll(".donut")
                    .data(pie(byCategory), function(d) { return d.data.key; })

    donut.enter()
         .append("path")
          .attr("d", arc)
          .attr("fill", function(d) { return getColor(d.data.key); })
          .attr("class", function(d) { return "donut "+className(d.data.key); })
          .attr("opacity", 0.6)
          .attr("stroke", "black")
          .attr("transform", "translate(" + (mapWidth-R) + "," + height/2 + ")")
          .append("title")
          .text(function(d) { return d.data.key + "\nUS$" + d3.format(".2s")(d.value)})
        .merge(donut)
          //.transition()
          .attr("d", arc);

    donut.exit()
         .remove();
};