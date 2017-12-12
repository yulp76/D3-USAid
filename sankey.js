//Transform data into formats required by sankey layout
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
};


//Plot Sankey diagram
function plotSankey(graph) {
  
  sankey_layout(graph);

  var back = svg1.append("g")
                 .classed("back", true),
      front = svg1.append("g")
                 .classed("front", true);

  var links = back.selectAll(".link")
                    .data(graph.links, function(d) { return d.source.name+"->"+d.target.name; })
                    .enter()
                    .append("path")
                    .attr("d", d3.sankeyLinkHorizontal())
                    .attr("class", function(d) { return "link "+className(d.donor)
                     + " " + className(d.category) + " " + className(d.group) + " " 
                     + className(d.recipient); })
                    .attr("fill", "none")
                    .attr("stroke", function(d) { return getColor(d.source.name); })
                    .attr("stroke-opacity", 0.3)
                    .attr("stroke-width", function(d) { return Math.max(1, d.width); })
                    .sort(function(a, b) { return b.width - a.width; });

      links.append("title")
           .text(function(d) { return "US$" + d3.format(".2s")(d.value); });

  var nodes = front.selectAll(".node")
                  .data(graph.nodes, function(d) { return d.name; })
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
          .attr("opacity", 0.6)
          .attr("stroke", "black")

      nodes.append("text")
          .attr("x", 14)
          .attr("y", function(d) { return (d.y1-d.y0)/2; })
          .attr("dy", ".35em")
          .attr("font-family", "Garamond")
          .attr("font-size", 13)
          .attr("text-anchor", "start")
          .text(function(d) { return d.name; })

      nodes.append("title")
          .text(function(d) { return d.name + ":\nUS$" + d3.format(".2s")(d.value); });
};