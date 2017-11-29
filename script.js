var chartsDiv = document.getElementById("charts"),
    pageWidth = chartsDiv.clientWidth,
    pageHeight = chartsDiv.clientHeight,
    margin = {top: 10, right: 5, bottom: 10, left: 5},
    sankeyWidth = pageWidth * 7/12,
    mapWidth = pageWidth * 5/12,
    svg_h = 600,
    color = d3.scaleOrdinal(d3.schemeCategory10);


var colorType = d3.scaleOrdinal()
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

var type = colorType.domain(),
    income = colorIncome.domain(),
    region = colorRegion.domain();

var country = ["Vietnam","Brazil","Kenya","Nigeria"]

var svg1 = d3.select("#chart1")
           .append("svg")
           .attr("width", sankeyWidth)
           .attr("height", svg_h),
    svg2 = d3.select("#chart2")
           .append("svg")
           .attr("width", mapWidth)
           .attr("height", svg_h);

// Read Data
d3.queue()
  .defer(d3.csv, 'data/sample.csv')
  .defer(d3.json, 'data/world.json')
  .awaitAll(load);

function load(error, aid, world) {
  if (error) { console.log(error); }

  }

// Visualization 1

// Reference: https://bl.ocks.org/mbostock/ca9a0bb7ba204d12974bca90acc507c0

//var group = "region"
var group = "income_group";

var sankey_layout = d3.sankey()
    .nodeId(function (d) {
        return d.name;      
    })
    .nodeWidth(12)
    .nodePadding(20)
    .extent([[margin.left,margin.top], [sankeyWidth-50, svg_h-margin.bottom]]);

d3.csv("data/sample.csv", function(error, data) {
  if (error) { throw error; }

  graph = sankey_format(data, group);
  console.log(graph);
  plot_sankey(graph);
  });


function sankey_format(data, criteria) {

  var nodes = [],
      graph = {"nodes":[], "links":[]};

  function node(name) {
    this.name=name;
  };

  function link(source, target, value, id) {
    this.source=source;
    this.target=target;
    this.value=value;
    this.id=id;
  };

  data.forEach(function (d) {
      names = [d.implementing_agency_name, d.dac_category_name,
               d[group+"_name"], d.country_name];

      names.forEach(function (name) {
        if (!nodes.includes(name)) {
                nodes.push(name);
              };
            });
      
      graph.links.push(new link(names[0], names[1], d.constant_amount, names[3]),
                       new link(names[1], names[2], d.constant_amount, names[3]),
                       new link(names[2], names[3], d.constant_amount, names[3]));
    });

  nodes.forEach(function(name) {
    graph.nodes.push(new node(name));
  });

  return graph;
}

function getColor(name) {
  if (type.includes(name)) {
    return colorType(name);
  } else if (income.includes(name)) {
    return colorIncome(name);
  } else if (region.includes(name)) {
    return colorRegion(name);
  } else { return "#cccccc"; }
};

function plot_sankey(graph) {
  
  sankey_layout(graph);

  var links = svg1.append("g").selectAll(".link")
                    .data(graph.links)
                    .enter()
                    .append("path")
                    .attr("d", d3.sankeyLinkHorizontal())
                    .attr("class", function(d) { return "link "+d.id; })
                    .attr("fill", "none")
                    .attr("stroke", function(d) { return getColor(d.source.name)})
                    .attr("stroke-opacity", 0.3)
                    .attr("stroke-width", function(d) { return Math.max(1, d.width); })
                    //.sort(function(a, b) { return b.dy - a.dy; });                    

      links.on("mouseover", function() {
                      d3.select(this)
                        .attr("stroke-opacity", 0.6);
                    })
           .on("mouseout", function() {
                      d3.select(this)
                        .attr("stroke-opacity", 0.3);
                     });

      links.append("title")
           .text(function(d) { return d.value; });

  var nodes = svg1.append("g").selectAll(".node")
                  .data(graph.nodes)
                  .enter()
                  .append("g")
                  .attr("class", "node")
                  .attr("transform", function(d) { 
                      return "translate(" + d.x0 + "," + d.y0 + ")"; }) 
                  .call(d3.drag()
                          .on("drag", dragging));

      nodes.append("rect")
          .attr("class", function(d){
            if (country.includes(d.name)) {
              return "country "+d.name;
            } else { return "non-country"; }
          })
          .attr("height", function(d) { return d.y1 - d.y0; })
          .attr("width", function(d) { return d.x1 - d.x0; })
          .attr("fill", function(d) { return getColor(d.name); })
          .attr("opacity", 0.8)
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

      d3.selectAll(".node .country")
        .on("mouseover", function() {
                      d3.select(this)
                        .attr("opacity", 1);
                      country = d3.select(this).attr("class").slice(8);
                      console.log(country)
                      d3.selectAll(".link."+country)
                        .attr("stroke-opacity", 1);
                    })
         .on("mouseout", function() {
                      d3.select(this)
                        .attr("opacity", 0.8);
                      country = d3.select(this).attr("class").slice(8);
                      d3.selectAll(".link."+country)
                        .attr("stroke-opacity", 0.3);
                     });

  function dragging(d) {
    var height = d.y1-d.y0
    d.y0 = Math.max(margin.top, Math.min(svg_h-margin.bottom-height, d.y0+d3.event.dy))
    d.y1 = d.y0+height
    d3.select(this)
      .attr("transform", "translate(" + d.x0 + "," + d.y0 + ")");
    sankey_layout.update(graph);
    links.attr("d", d3.sankeyLinkHorizontal());
  };
}

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

// Visualization 2

var g = svg2.append("g")
            .attr("clip-path", "url(#map_area)");

var R = Math.min(mapWidth, svg_h)/2,
    donut_w = 40,
    innerR = R - donut_w;

svg2.append("clipPath")
    .attr("id", "map_area")
    .append("circle")
    .attr("cx", mapWidth/2)
    .attr("cy", svg_h/2)
    .attr("r", innerR)

function draw_arc(outerR, innerR) {
  return d3.arc()
            .outerRadius(outerR)
            .innerRadius(innerR);
};

var pie = d3.pie()
            .value(function(d) { return d.value; });

var projection = d3.geoMercator()
                  //.center([svg_w/2, svg_h/2])
                  .translate([mapWidth/5, svg_h/3*2])
                  .scale(250)

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

  var points = g.selectAll("g.country_point")
                  .data(byCountryType)
                  .enter()
                .append("g")
                  .attr("class", "country_point")
                  .attr("transform", function(d) { return "translate(" + locate_country_centroid.get(d.key)[0] + "," +
                        locate_country_centroid.get(d.key)[1] +")";});

  points.append("circle")
          .attr("fill", "white")
          .attr("r", 2)
        .append("title")
          .text(function(d) { return d.key });

  var pies = points.selectAll(".country_pie")
                      .data(function(d) { return pie(d.values); })
                      .enter()
                    .append("g")
                      .attr("class", "country_pie");

  var arc = draw_arc(function(d){ return Math.max(4, Math.sqrt(byCountryTotal.get(d.data.mainkey)/10000));}, 3);

  pies.append("path")
        .attr("d", arc)
        .attr("fill", function(d) { console.log(d); return color(d.data.key); })
      .append("title")
        .text(function(d) { return d.data.key + ":\n"
          + d3.format(".0%")(d.data.value/byCountryTotal.get(d.data.mainkey))
          + " of US$" + d3.format(".2s")(byCountryTotal.get(d.data.mainkey));})

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
  byCountry = d3.nest().key(function(d) { return d.country_name; })
                        .rollup(function(v) { return d3.sum(v, function(d) { return d.constant_amount; }); })
                        .entries(data)
  var byCountryTotal = d3.map();
  byCountry.forEach(function(country) {
    byCountryTotal.set(country.key, country.value);
  });

  byCountryType = d3.nest().key(function(d) { return d.country_name; }).entries(data)
  byCountryType.forEach(function(country) {
    country.values = d3.nest()
    .key(function(d) { return d.dac_category_name; })
    .rollup(function(v) { return d3.sum(v, function(d) { return d.constant_amount; }); })
    .entries(country.values)
    country.values.forEach(function(d) {
      d.mainkey = country.key;
    })
  });

  return [byCountryTotal, byCountryType] ;
}

function donut_plot(data) {

  var arc = draw_arc(R, innerR),
      label = draw_arc(R-25, R-25);

  var arcs = svg2.selectAll("g.arc")
              .data(pie(data))
              .enter()
              .append("g")
              .attr("class", "arc")
              .attr("transform", "translate(" + mapWidth/2 + "," + svg_h/2 + ")");

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
                     .attr("r", 2)
                     .attr("cx", function(d) { return map_path.centroid(d)[0]; })
                     .attr("cy", function(d) { return map_path.centroid(d)[1]; })
                    .append("title")
                     .text(function(d) { return d.properties.name });
  */
};