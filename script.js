//Variables

//temp ones
var group = "income_group";
var recipient = ["Vietnam","Brazil","Kenya","Nigeria"]
var donor = ["African Development Foundation", "Department of Energy", "Department of Labor"]

/*
var chartsDiv = document.getElementById("charts"),
    pageWidth = chartsDiv.clientWidth,
    pageHeight = chartsDiv.clientHeight
*/

var margin = {top: 10, right: 5, bottom: 10, left: 5},
    sankeyWidth = 650,
    mapWidth = 550,
    height = 600,
    R = Math.min(mapWidth, height)/2,
    donutWidth = 25,
    innerR = R - donutWidth;

var svg1 = d3.select("#chart1")
           .append("svg")
           .attr("width", sankeyWidth)
           .attr("height", height),

    svg2 = d3.select("#chart2")
           .append("svg")
           .attr("width", mapWidth)
           .attr("height", height)
           
    svg2.append("clipPath")
         .attr("id", "map_area")
         .append("circle")
         .attr("cx", mapWidth/2)
         .attr("cy", height/2)
         .attr("r", innerR);

var gMap = svg2.append("g")
         .attr("class", "map")
               .attr("clip-path", "url(#map_area)");


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

var sankey_layout = d3.sankey()
    .nodeId(function (d) {
        return d.name;      
    })
    .nodeWidth(12)
    .nodePadding(20)
    .extent([[margin.left,margin.top], [sankeyWidth-50, height-margin.bottom]]);

var pie = d3.pie()
            .value(function(d) { return d.value; });

var originalScale = 250,
    scale = originalScale;
    k = 1;

var projection = d3.geoOrthographic()
          .scale(scale)
          .translate([mapWidth/2, height/2])
          .clipAngle(90);  

var map_path = d3.geoPath()
                 .projection(projection);


//Load
d3.queue()
  .defer(d3.csv, 'data/sample.csv')
  .defer(d3.json, 'data/world.json')
  .await(load);


function load(error, aid, world) {
  if (error) { console.log(error); }

  //local variables from data
  countries = world.features;
  centroid = getCentroid(countries);

  byCategory = aggregateCategory(aid); 
  byCountry = aggregateCountry(aid);
  byCountryTotal = byCountry[0];
  byCountryCategory = byCountry[1];
   

  //Sankey
  graph = sankeyFormat(aid, group);
  plotSankey(graph);
  sankeyMotion();

  //Map
  plotDonut(byCategory);  
  drawMap(countries);
  drawCountryPie();
  
  mapMotion();
  }



//Shared Functions
function getColor(name) {
      if (category.includes(name)) {
        return colorCategory(name);
      } else if (income.includes(name)) {
        return colorIncome(name);
      } else if (region.includes(name)) {
        return colorRegion(name);
      } else { return "#cccccc"; }
};

//Viz 1 Functions
function sankeyFormat(data, criteria) {

  var nodes = [],
      graph = {"nodes":[], "links":[]};

  function node(name) {
    this.name=name;
  };

  function link(source, target, value, donor, category, group, recipient) {
    this.source=source;
    this.target=target;
    this.value=value;
    this.donor=donor;
    this.category=category;
    this.group=group;
    this.recipient=recipient;
  };

  data.forEach(function (d) {
      names = [d.implementing_agency_name, d.dac_category_name,
               d[group+"_name"], d.country_name];
      names.forEach(function (name) {
        if (!nodes.includes(name)) {
                nodes.push(name);
              };
            });
      
      graph.links.push(new link(names[0], names[1], d.constant_amount, names[0], names[1], names[2], names[3]),
                       new link(names[1], names[2], d.constant_amount, names[0], names[1], names[2], names[3]),
                       new link(names[2], names[3], d.constant_amount, names[0], names[1], names[2], names[3]));
    });

  nodes.forEach(function(name) {
    graph.nodes.push(new node(name));
  });

  return graph;
}


function className(string) {
  return string.split(".").join("").replace(/ /g,"");
}

function plotSankey(graph) {
  
  sankey_layout(graph);

  var links = svg1.append("g").selectAll(".link")
                    .data(graph.links)
                    .enter()
                    .append("path")
                    .attr("d", d3.sankeyLinkHorizontal())
                    .attr("class", function(d) { return "link "+className(d.donor)
                     + " " + className(d.category) + " " + className(d.group) + " " 
                     + className(d.recipient); })
                    .attr("fill", "none")
                    .attr("stroke", function(d) { return getColor(d.source.name)})
                    .attr("stroke-opacity", 0.3)
                    .attr("stroke-width", function(d) { return Math.max(1, d.width); })


      links.append("title")
           .text(function(d) { return d.value; });

  var nodes = svg1.append("g").selectAll(".node")
                  .data(graph.nodes)
                  .enter()
                  .append("g")
                  .attr("class", "node")
                  .attr("transform", function(d) { 
                      return "translate(" + d.x0 + "," + d.y0 + ")"; }) 

      nodes.append("rect")
           .attr("class", function(d){
            if (recipient.includes(d.name)) {
              return "recipient "+ className(d.name);
            } else if (donor.includes(d.name)) {
              return "donor "+ className(d.name);
            } else if (category.includes(d.name)) {
              return "category "+className(d.name);
            } else { return "group "+className(d.name); }
          })
          .attr("height", function(d) { return d.y1 - d.y0; })
          .attr("width", function(d) { return d.x1 - d.x0; })
          .attr("fill", function(d) { return getColor(d.name); })
          .attr("opacity", 0.7)
          .attr("stroke", "black")

      nodes.append("text")
          .attr("x", function(d) { return 14; })
          .attr("y", function(d) { return (d.y1-d.y0)/2; })
          .attr("dy", ".35em") //reference
          .attr("font-family", "Candara")
          .attr("text-anchor", "start")
          .text(function(d) { return d.name; })

      nodes.append("title")
          .text(function(d) { return d.name + "\n" + d.value; });
}

function dragging(d) {
    var node_h = d.y1-d.y0
    d.y0 = Math.max(margin.top, Math.min(height-margin.bottom-node_h, d.y0+d3.event.dy))
    d.y1 = d.y0+node_h
    d3.select(this)
      .attr("transform", "translate(" + d.x0 + "," + d.y0 + ")");
    sankey_layout.update(graph);
    d3.selectAll(".link")
      .attr("d", d3.sankeyLinkHorizontal());
  };

function wrap(text, width) {
  text.each(function() {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy")),
        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
      }
    }
  });
}

//Viz 2 Functions
function getCentroid() {
  var centroid = d3.map();
  countries.forEach(function (country) {
    centroid.set(className(country.properties.name), d3.geoCentroid(country));
    });
  return centroid;
  };

function pieArc(k){
  return d3.arc()
            .outerRadius(function(d) { return k*Math.max(4, Math.sqrt(byCountryTotal.get(getCountry(this))/10000)); })
            .innerRadius(function(d) { return k*3; })
};

function aggregateCategory(data) {
  return d3.nest()
  .key(function(d) { return d.dac_category_name; })
  .rollup(function(v) { return d3.sum(v, function(d) { return d.constant_amount; }); })
  .entries(data);
};

function aggregateCountry(data) {
  byCountry = d3.nest().key(function(d) { return d.country_name; })
                       .rollup(function(v) { return d3.sum(v, function(d) { return d.constant_amount; }); })
                       .entries(data)
  var byCountryTotal = d3.map();
  byCountry.forEach(function(country) {
    byCountryTotal.set(country.key, country.value);
  });

  byCountryCategory = d3.nest().key(function(d) { return d.country_name; }).entries(data)
  byCountryCategory.forEach(function(country) {
    country.values = d3.nest()
              .key(function(d) { return d.dac_category_name; })
              .rollup(function(v) { return d3.sum(v, function(d) { return d.constant_amount; }); })
              .entries(country.values)
  });

  return [byCountryTotal, byCountryCategory];
};

function plotDonut(data) {

  var arc = d3.arc().outerRadius(R).innerRadius(innerR);
      label = d3.arc().outerRadius(R-18).innerRadius(R-18);

  var arcs = svg2.selectAll(".donut")
              .data(pie(data))
              .enter()
              .append("g")
              .attr("class", "donut")
              .attr("transform", "translate(" + (mapWidth-R) + "," + height/2 + ")");

  arcs.append("path")
        .attr("fill", function(d) { return getColor(d.data.key); })
        .attr("class", function(d) { return className(d.data.key); })
        .attr("opacity", 0.7)
        .attr("stroke", "black")
        .attr("d", arc)
        .append("title")
        .text(function(d) { return d.value});

  arcs.append("text")
        .attr("transform", function(d) { return "translate(" + label.centroid(d) + ")" +
          'rotate(' + ((d.startAngle + d.endAngle) / 2) * 180 / Math.PI + ')'; })
        .attr("text-anchor", "middle")
        .attr("stroke", "black")
        .attr("font-family", "Candara")
        .text(function(d) { return d.data.key; });
};


function drawMap(data) {

      //Dummy circle to ensure zoom/pan works for non-land areas
      gMap.append("circle")
          .attr("cx", mapWidth/2)
          .attr("cy", height/2)
          .attr("r", innerR)
          .attr("opacity", 0);

  var graticule = d3.geoGraticule(),
      grid = graticule();

      gMap.selectAll('.grid')
          .data([grid])
          .enter()
          .append('path')
          .classed('world', true)
          .classed('grid', true)
          .attr('d', map_path)
          .attr('fill', 'none')
          .attr('stroke', '#deebf7')
          .attr('stroke-width', 0.7);

  var country = gMap.selectAll(".land")
                    .data(data)
                    .enter()
                    .append("path")
                    .attr("class", function(d) { return className(d.properties.name); })
                    .classed('world', true)
                    .classed("land", true)
                    .attr("d", map_path)
                    .attr("fill", "#e5f5e0")
                    .attr("opacity", 0.3)
                    .attr("stroke", "#08306b");

    country.append("title")
            .text(function(d) { return d.properties.name });
};

var isVisible = {
  front: function(d) {
    return ((Math.cos((projection.rotate()[0]+centroid.get(className(d.key))[0])/360*2*Math.PI)>0)?'visible':'hidden');
  }
};

function drawCountryPie() {
  var points = gMap.selectAll(".countryPie")
                  .data(byCountryCategory)
                  .enter()
                .append("g")
                  .attr("class", function(d) { return className(d.key); })
                  .classed("countryPie", true)
                  .attr("transform", function(d) { 
                      return "translate(" + projection(centroid.get(className(d.key))) +")";})
                  .attr('visibility', isVisible.front);

  
    points.append("circle")
            .attr("fill", "#e34a33")
            .attr("r", 2*k)
          .append("title")
            .text(function(d) { return d.key });
  
      points.selectAll(".pie")
            .data(function(d) { return pie(d.values); })
            .enter()
            .append("path")
            .attr("d", pieArc(k))
            .attr("fill", function(d) { return getColor(d.data.key); })
            .attr("class", function(d) { return "pie "+className(d.data.key); })
            .attr("opacity", 0.6)
            .attr("stroke", "black")
            .append("title")
            .text(function(d) { return d.data.key + ":\n"
                + d3.format(".0%")(d.data.value/byCountryTotal.get(getCountry(this)))
                + " of US$" + d3.format(".2s")(byCountryTotal.get(getCountry(this))); })
  };


function getCountry(obj) {
  return d3.select(obj.parentNode).attr("class").slice(0,-11);
}


function sankeyMotion(){

      d3.selectAll(".link").on("mouseover", function() {
                      d3.select(this)
                        .attr("stroke-opacity", 0.6);
                    })
        .on("mouseout", function() {
                      d3.select(this)
                        .attr("stroke-opacity", 0.3);
                     });

      d3.selectAll(".node")
        .call(d3.drag().on("drag", dragging));

    d3.selectAll(".node .donor")
      .on("mouseover", function() {
                      d3.select(this)
                        .attr("opacity", 1);
                      donor = d3.select(this).attr("class").slice(6);
                      d3.selectAll(".link."+donor)
                        .attr("stroke-opacity", 1);
                    })
        .on("mouseout", function() {
                      d3.select(this)
                        .attr("opacity", 0.7);
                      donor = d3.select(this).attr("class").slice(6);
                      d3.selectAll(".link."+donor)
                        .attr("stroke-opacity", 0.3);
                     })

    d3.selectAll(".node .category")
        .on("mouseover", function() {
                      d3.select(this)
                        .attr("opacity", 1);
                      category = d3.select(this).attr("class").slice(9);

                      d3.selectAll(".link."+category)
                        .attr("stroke-opacity", 1);
                      d3.selectAll(".donut ."+category)
                        .attr("opacity", 1);
                      d3.selectAll(".countryPie ."+category)
                        .attr("opacity", 1);

                    })
        .on("mouseout", function() {
                      d3.select(this)
                        .attr("opacity", 0.7);
                      donor = d3.select(this).attr("class").slice(9);
                      d3.selectAll(".link."+category)
                        .attr("stroke-opacity", 0.3);
                      d3.selectAll(".donut ."+category)
                        .attr("opacity", 0.7);
                      d3.selectAll(".countryPie ."+category)
                        .attr("opacity", 0.6);
                     })

    d3.selectAll(".node .group")
        .on("mouseover", function() {
                      d3.select(this)
                        .attr("opacity", 1);
                      group = d3.select(this).attr("class").slice(6);
                      d3.selectAll(".link."+group)
                        .attr("stroke-opacity", 1);
                    })
        .on("mouseout", function() {
                      d3.select(this)
                        .attr("opacity", 0.7);
                      group = d3.select(this).attr("class").slice(6);
                      d3.selectAll(".link."+group)
                        .attr("stroke-opacity", 0.3);
                     })

    d3.selectAll(".node .recipient")
        .on("mouseover", function() {
                      d3.select(this)
                        .attr("opacity", 1);
                      recipient = d3.select(this).attr("class").slice(10);
                      d3.selectAll(".link."+recipient)
                        .attr("stroke-opacity", 1);
                      pie = gMap.selectAll(".countryPie")
                        .filter("."+recipient);
                      pie.select("circle")
                         .attr("fill", "#fee8c8");
                      pie.selectAll(".pie")
                        .attr("opacity", 1);
                      gMap.selectAll(".land."+recipient)
                          .attr("fill", "#e34a33")
                          .attr("opacity", 1);
                            })
         .on("mouseout", function() {
                      d3.select(this)
                        .attr("opacity", 0.7);
                      recipient = d3.select(this).attr("class").slice(10);
                      d3.selectAll(".link."+recipient)
                        .attr("stroke-opacity", 0.3);
                      pie = gMap.selectAll(".countryPie")
                        .filter("."+recipient);
                      pie.select("circle")
                         .attr("fill", "#e34a33");
                      pie.selectAll(".pie")
                        .attr("opacity", 0.6);
                      gMap.selectAll(".land."+recipient)
                        .attr("fill", "#e5f5e0")
                        .attr("opacity", 0.3)
                     })
         .on("click", function(){
                      recipient = d3.select(this).attr("class").slice(10);
                      cen = centroid.get(recipient);

                      gMap.select('.land.'+recipient)
                            .transition()
                            .duration(1500)
                            .tween("rotate-scale", function(){
                                var r = d3.interpolate(projection.rotate(), [-cen[0],-cen[1]]);
                                scale += originalScale*(4-k);
                                var s = d3.interpolate(projection.scale(), scale);
                                var p = d3.interpolate(k, 4);
                                return function (t) {
                                    projection.rotate(r(t));
                                    projection.scale(s(t));
                                    gMap.selectAll(".world").attr("d", map_path);
                                    gMap.selectAll('.countryPie')
                                        .attr("transform", function(d) { return "translate(" + projection(centroid.get(className(d.key))) +")"; })
                                        .attr('visibility', isVisible.front);
                                    gMap.selectAll(".countryPie")
                                        .selectAll("circle")
                                        .attr("r", 2*p(t));
                                    gMap.selectAll(".pie")
                                        .attr("d", pieArc(p(t)));
                                    k = 4;
                                }; 
                            })

         });
};

function mapMotion(){
    var zoom = d3.zoom()
           .scaleExtent([1, 5])
         .on("zoom", zooming);
    
    d3.select('.map').call(zoom);


    
};

//Reference: https://bl.ocks.org/larsvers/f8efeabf480244d59001310f70815b4e 
function zooming() {        
      if (d3.event.sourceEvent.type === 'wheel') {
        
        k_new = d3.event.transform.k;
        k_delta = k_new - k;
        scale += originalScale*k_delta;
        k = k_new;

        console.log(k);

        //New projection
        projection.scale(scale);
        
        //Update map
        gMap.selectAll('.world')
            .transition()
            .attr('d', map_path);

        //Update pies
        gMap.selectAll(".countryPie")
            .selectAll("circle")
            .transition()
            .attr("r", 2*k);

        gMap.selectAll('.countryPie')
            .transition()
              .attr("transform", function(d) { return "translate(" + projection(centroid.get(className(d.key))) + ")"; });
      
        gMap.selectAll(".pie")
            .transition()
            .attr("d", pieArc(k));
  
      } else {
        var dx = d3.event.sourceEvent.movementX,
            dy = d3.event.sourceEvent.movementY,
            r = projection.rotate();

        rotation = [r[0]+dx*0.3, r[1]-dy*0.3, r[2]];

        projection.rotate(rotation);

        gMap.selectAll('.world')
            .transition()
              .attr('d', map_path);

        gMap.selectAll('.countryPie')
            .transition()
              .attr("transform", function(d) { return "translate(" + projection(centroid.get(className(d.key))) +")"; })
              .attr('visibility', isVisible.front);
    };
  };