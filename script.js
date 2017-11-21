var margin = {top: 20, right: 20, bottom: 20, left: 20}
var svg_w = 800
var svg_h = 800
var width = svg_w - margin.left - margin.right;
var height = svg_h - margin.top - margin.bottom;
var color = d3.scaleOrdinal(d3.schemeCategory10);



// Visualization 1

// Reference: https://bl.ocks.org/mbostock/ca9a0bb7ba204d12974bca90acc507c0

//var group = "region"
var group = "income_group";

var svg1 = d3.select("#chart1")
           .append("svg")
           .attr("width", svg_w)
           .attr("height", svg_h);

var sankey_layout = d3.sankey()
    .nodeWidth(20)
    .nodePadding(20)
    .extent([[margin.left,margin.top], [margin.left+width-50, margin.top+height]]);

d3.csv("data/sample.csv", function(error, data) {
  if (error) { throw error; }
  graph = sankey_format(data);
  sankey_plot(graph);
  });

/* Reference: http://www.d3noob.org/2013/02/formatting-data-for-sankey-diagrams-in.html */
function sankey_format(data) {

  graph = {"nodes":[], "links":[]};

  data.forEach(function (d) {
      graph.nodes.push({"name": d.implementing_agency_name},
                       {"name": d.dac_category_name},
                       {"name": d[group+"_name"]},
                       {"name": d.country_name});
      graph.links.push({"source": d.implementing_agency_name, "target": d.dac_category_name, "value": +d.constant_amount},
                       {"source": d.dac_category_name, "target": d[group+"_name"], "value": +d.constant_amount},
                       {"source": d[group+"_name"], "target": d.country_name, "value": +d.constant_amount});

     });

  //get an array of unique nodes
  graph.nodes = d3.keys(d3.nest()
       .key(function (d) { return d.name; })
       .object(graph.nodes));  //entries vs. object vs. rollup vs. map!!!

   graph.links.forEach(function (d, i) {
        graph.links[i].source = graph.nodes.indexOf(graph.links[i].source);
        graph.links[i].target = graph.nodes.indexOf(graph.links[i].target);
        });

  graph.nodes.forEach(function (d, i) {
        graph.nodes[i] = {"name": d};
  });

  return graph;
}

function sankey_plot(graph) {
  
  sankey_layout(graph);

  var nodes = svg1.append("g")
                   .attr("class", "nodes")
                  .selectAll("g");

  var links = svg1.append("g")
                   .attr("class", "links")
                   .attr("fill", "none")
                   .attr("stroke", "steelblue")
                   .attr("stroke-opacity", 0.2)
                  .selectAll("path");

  links = links
    .data(graph.links)
    .enter().append("path")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke-width", function(d) { return Math.max(1, d.width); });

  links.append("title")
      .text(function(d) { return d.value; });

  nodes = nodes
    .data(graph.nodes)
    .enter().append("g");

  nodes.append("rect")
      .attr("x", function(d) { return d.x0; })
      .attr("y", function(d) { return d.y0; })
      .attr("height", function(d) { return d.y1 - d.y0; })
      .attr("width", function(d) { return d.x1 - d.x0; })
      .attr("fill", function(d) { return color(d.name); })
      .attr("stroke", "black");

  nodes.append("text")
      .attr("x", function(d) { return d.x0 + 25; })
      .attr("y", function(d) { return (d.y1 + d.y0) / 2; })
      .attr("dy", 6)
      .attr("font-family", "Candara")
      .attr("text-anchor", "start")
      .text(function(d) { return d.name; })

  nodes.append("title")
      .text(function(d) { return d.name + "\n" + d.value; });
}



// Visualization 2

var svg2 = d3.select("#chart2")
           .append("svg")
           .attr("width", svg_w)
           .attr("height", svg_h);

var g = svg2.append("g");

var R = Math.min(width, height)/2,
    donut_w = 40,
    innerR = R - donut_w;

svg2.append("clipPath")
    .attr("id", "map_area")
    .append("circle")
    .attr("cx", svg_w/2)
    .attr("cy", svg_h/2)
    .attr("r", innerR)

function draw_arc(outerR, innerR) {
  return d3.arc()
            .outerRadius(outerR)
            .innerRadius(innerR);
};

var projection = d3.geoMercator()
                  .center([svg_w/2, svg_h/2])
                  .translate([svg_w/2, svg_h/2])
                  .scale(200)

var map_path = d3.geoPath()
                 .projection(projection);


d3.queue()
  .defer(d3.csv, 'data/sample.csv')
  .defer(d3.json, 'data/world.json')
  .awaitAll(function (error, results) {
    if (error) { throw error; }

  byType = aggregate_by_type(results[0]);
  donut_plot(byType);

  draw_map(results[1].features);

  var locate_country_centroid = d3.map();
  results[1].features.forEach(function (country) {
    locate_country_centroid.set(country.properties.name, map_path.centroid(country));
    });

  byCountry = aggregate_by_country(results[0]);
  byCountryTotal = byCountry[0];
  byCountryType = byCountry[1];

  console.log(byCountryType)
  console.log(byCountryTotal)

  var pie = d3.pie()
              .value(function(d) { return d.value; });

  var arc = draw_arc(10, 0);

  var points = g.selectAll("g.country_point")
                  .data(byCountryType)
                  .enter()
                .append("g")
                  .attr("class", "country_point")
                  .attr("transform", function(d) { return "translate(" + locate_country_centroid.get(d.key)[0] + "," +
                        locate_country_centroid.get(d.key)[1] +")";});

  var pies = points.selectAll(".country_pie")
                      .data(function(d) { return pie(d.values); })
                      .enter()
                    .append("g")
                      .attr("class", "country_pie")
                      //.attr("clip-path", "url(#map_area)");

  pies.append("path")
        .attr("d", arc)
          //var outerR = Math.sqrt(byCountryTotal[i].value/10000);
          //console.log(outerR);
          //var arc = draw_arc(outerR, 2);
        .attr("fill", function(d) { return color(d.data.key); })

});


/* Reference: https://stackoverflow.com/questions/12062561/calculate-svg-path-centroid-with-d3-js

function getBoundingBoxCenter (selection) {
  var bbox = selection.node().getBBox();
  console.log([bbox.x + bbox.width/2, bbox.y + bbox.height/2]);
}
 */

function aggregate_by_type(data) {
  return d3.nest()
  .key(function(d) { return d.dac_category_name; })
  .rollup(function(v) { return d3.sum(v, function(d) { return d.constant_amount; }); })
  .entries(data);
};

function aggregate_by_country(data) {
  byCountryTotal = d3.nest().key(function(d) { return d.country_name; })
                        .rollup(function(v) { return d3.sum(v, function(d) { return d.constant_amount; }); })
                        .entries(data)

  byCountryType = d3.nest().key(function(d) { return d.country_name; }).entries(data)


  byCountryType.forEach(function(country) {
    country.values = d3.nest()
    .key(function(d) { return d.dac_category_name; })
    .rollup(function(v) { return d3.sum(v, function(d) { return d.constant_amount; }); })
    .entries(country.values)
  });

  return [byCountryTotal, byCountryType] ;
}

function donut_plot(data) {

  var arc = draw_arc(R, innerR),
      label = draw_arc(R-25, R-25);

  var pie = d3.pie()
              .value(function(d) { return d.value; });

  var arcs = svg2.selectAll("g.arc")
              .data(pie(data))
              .enter()
              .append("g")
              .attr("class", "arc")
              .attr("transform", "translate(" + svg_w/2 + "," + svg_h/2 + ")");

  arcs.append("path")
        .attr("fill", function(d) { return color(d.data.key); })
        .attr("d", arc)
        .append("title")
        .text(function(d) { return d.value});

  arcs.append("text")
        .attr("transform", function(d) { return "translate(" + label.centroid(d) + ")" +
          'rotate(' + ((d.startAngle + d.endAngle) / 2) * 180 / Math.PI + ')'; })
        .attr("text-anchor", "middle")
        .attr("stroke", "white")
        .attr("font-family", "Candara")
        .text(function(d) { return d.data.key; });
};

function draw_map(dataset) {
  var country = g.selectAll(".country")
                  .data(dataset)
                  .enter()
                 .append("path")
                  .attr("class", "country")
                  .attr("clip-path", "url(#map_area)")
                  .attr("d", map_path)
                  .attr("fill", "#969696");

  country.append("title")
          .text(function(d) { return d.properties.name });

  /* 
  var centroids = g.selectAll(".centroid")
                     .data(dataset)
                     .enter()
                    .append("circle")
                     .attr("class", "centroid")
                     .attr("clip-path", "url(#map_area)")
                     .attr("r", 2)
                     .attr("cx", function(d) { return map_path.centroid(d)[0]; })
                     .attr("cy", function(d) { return map_path.centroid(d)[1]; })
                    .append("title")
                     .text(function(d) { return d.properties.name });
  */
};