// Set Spacing Guidelines
var margin = {top: 50, right: 50, bottom: 50, left: 50}
var width = 800 - margin.left - margin.right;
var height = 800 - margin.top - margin.bottom;

var group = "region"
// var group = "income_group"


d3.csv("data/sample.csv", function(error, data) {
  if (error) throw error;
  graph = sankey_format(data);
  console.log(graph);

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

  // return only the distinct / unique nodes
  graph.nodes = d3.keys(d3.nest()
       .key(function (d) {return d.name;})
       .object(graph.nodes));

  // loop through each link replacing the text with its index from node
   graph.links.forEach(function (d, i) {
        graph.links[i].source = graph.nodes.indexOf(graph.links[i].source);
        graph.links[i].target = graph.nodes.indexOf(graph.links[i].target);
        });

  //now loop through each nodes to make nodes an array of objects rather than an array of strings
  graph.nodes.forEach(function (d, i) {
        graph.nodes[i] = {"name": d};
  });

  return graph;
}