// Set Spacing Guidelines
var margin = {top: 20, right: 20, bottom: 20, left: 20}
var width = 800 - margin.left - margin.right;
var height = 800 - margin.top - margin.bottom;
var color = d3.scaleOrdinal(d3.schemeCategory20b);

// Visualization 1
// Reference: https://bl.ocks.org/mbostock/ca9a0bb7ba204d12974bca90acc507c0

//var group = "region"
var group = "income_group";

d3.csv("data/sample.csv", function(error, data) {
  if (error) throw error;
  graph = sankey_format(data);
  sankey_plot(graph);
});

svg1 = d3.select("#chart1")
           .append("svg")
           .attr("width", width + margin.left + margin.right)
           .attr("height", height + margin.top + margin.bottom);

var sankey_layout = d3.sankey()
    .nodeWidth(20)
    .nodePadding(20)
    .extent([[margin.left,margin.top], [width-30, margin.top+height]]);

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
                   .attr("stroke", "green")
                   .attr("stroke-opacity", 0.2)
                 .selectAll("path");

  links = links
    .data(graph.links)
    .enter().append("path")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("border", "black")
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
svg2 = d3.select("#chart2")
           .append("svg")
           .attr("width", width + margin.left + margin.right)
           .attr("height", height + margin.top + margin.bottom);

var outerRadius = Math.min(width, height)/2;
var innerRadius = outerRadius - 50;
var arc = d3.arc()
          .innerRadius(innerRadius)
          .outerRadius(outerRadius);
var label = d3.arc()
          .innerRadius(outerRadius-25)
          .outerRadius(outerRadius-25);
var pie = d3.pie()
            .value(function(d) { return d.value; });

d3.csv("data/sample.csv", function(data) {
  agg = aggregate_by_type(data);
  console.log(agg);
  donut_plot(agg);
});

function aggregate_by_type(data) {
  return d3.nest()
  .key(function(d) { return d.dac_category_name; })
  .rollup(function(v) { return d3.sum(v, function(d) { return d.constant_amount; }); })
  .entries(data);
};

function donut_plot(data) {
  var arcs = svg2.selectAll("g.arc")
              .data(pie(data))
              .enter()
              .append("g")
              .attr("class", "arc")
              .attr("transform", "translate(" + outerRadius + "," + outerRadius + ")");

  arcs.append("path")
        .attr("fill", function(d, i) {
            return color(i);
        })
        .attr("d", arc)
        .append("title")
        .text(function(d) { return d.value})

  arcs.append("text")
        //.attr("transform", function(d) { return "translate(" + label.centroid(d) + ")"; })
        .attr("text-anchor", "middle")
        .text(function(d) { return d.key; });
};