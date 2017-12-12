d3.queue()
  .defer(d3.csv, 'data/complete.csv')
  .defer(d3.json, 'data/world.json')
  .await(load);

//Load
function load(error, aid, world) {
  if (error) { console.log(error); }

  countries = world.features;
  centroid = getCentroid(countries);

  var dataAllYears;
  donor = [];
  recipient = [];

  aid.forEach(function (record) {
        if (!donor.includes(record.implementing_agency_name)) {
                donor.push(record.implementing_agency_name); };
        if (!recipient.includes(record.country_name)) {
                recipient.push(record.country_name); };
  });

  donor.sort();
  recipient.sort();

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

      interact(data);
});

  d3.select("#year").on("input", function(){
    d3.select("#year-value").text(this.value);

    if (dataAllYears) {
        year = this.value;
        data = dataAllYears.filter(function(d) { return d.numeric_year == year; });
        interact(data);
      };
    });

};

//Plot from scratch
function generate() {
    byCategory = aggregateCategory(data); 
    byCountry = aggregateCountry(data);
    byCountryTotal = byCountry[0];
    byCountryCategory = byCountry[1];
    graph = sankeyFormat(data, group); 

    plotSankey(graph);
    plotDonut(byCategory);
    drawMap(countries);
    drawCountryPie();
    init = false;

    sankeyMotion();  
    mapMotion();
}

//Remove plotted
function clearSpace() {
    svg1.select(".front").remove();
    svg1.select(".back").remove();
    svg2.selectAll(".globe").remove();
    svg2.selectAll(".donut").remove();
    svg2.selectAll(".countryPie").remove();  
};

//Decide whether to issue warning/plot/update
function interact(data) {
      d3.select("#warning")
           .select("p")
           .remove();

      if (data.length == 0) {
         if (!init) { clearSpace(); }

         d3.select("#warning")
           .append("p")
           .text("Unfortunately, your search returns no result.\nPlease modify the criteria and try again.")

         init = true;
      } else if (data.length > 200) {
         if (!init) { clearSpace(); }

         d3.select("#warning")
           .append("p")
           .text("Unfortunately, your search yields too many results, which are not ideal for this presentation.\nPlease modify the criteria and try again.")

         init = true;

      } else {
         if (init) {
            generate();
            init = false;
          } else { update(); };
      };
};

//Update function collection
function update() {

    byCategory = aggregateCategory(data); 
    byCountry = aggregateCountry(data);
    byCountryTotal = byCountry[0];
    byCountryCategory = byCountry[1];
    graph = sankeyFormat(data, group);  
  
    //Update Sankey with node transitions
    updateSankey();

    //Update Donut with arcTween transitions
    updateDonut();

    //Update pies on the map
    //Choose to remove all old pies and plot new ones
    //Transition not visually effective
    d3.selectAll(".countryPie")
      .remove();
    drawCountryPie();

    sankeyMotion();  
    mapMotion();
};


//Sankey update functions
function updateSankey(){

    sankey_layout(graph);

    //Replot links
    var back = svg1.select(".back"),
        front = svg1.select(".front");

    back.selectAll(".link")
        .remove();

    //Node transition

    var nodes = front.selectAll(".node")
                     .data(graph.nodes, function(d) { return d.name; })

    nodes.exit().remove();

    var enter = nodes.enter()
                     .append("g")
                     .classed("node", true)
                     .attr("transform", function(d) { return "translate(" + d.x0 + "," + 0 + ")"; });

    enter.append("rect")
         .attr("class", function(d){
                if (recipient.includes(d.name)) {
                  return "recipient "+ className(d.name);
                } else if (donor.includes(d.name)) {
                  return "donor "+ className(d.name);
                } else if (category.includes(d.name)) {
                  return "category "+className(d.name);
                } else { return "group "+className(d.name); }
              })
         .attr("width", function(d) { return d.x1 - d.x0; })
         .attr("height", 5)
         .attr("fill", function(d) { return getColor(d.name); })
         .attr("opacity", 0.6)
         .attr("stroke", "black");

    enter.append("text")
          .attr("x", 14)
          .attr("dy", ".35em")
          .attr("font-family", "Garamond")
          .attr("font-weight", "bold")
          .attr("font-size", 13)
          .attr("text-anchor", "start")
          .text(function(d) { return d.name; });

    enter.append("title")

    enter.merge(nodes)
         .transition()
         .duration(750)
         .attr("transform", function(d) { return "translate(" + d.x0 + "," + d.y0 + ")"; })

    front.selectAll(".node")
         .select("title")
         .text(function(d) { return d.name + ":\nUS$" + d3.format(".2s")(d.value); });
    
    front.selectAll(".node")
        .select("rect")
        .transition()
        .duration(750)
        .attr("height", function(d) { return d.y1 - d.y0; });

    front.selectAll(".node")
        .select("text")
        .transition()
        .duration(750)
        .attr("y", function(d) { return (d.y1 - d.y0)/2; });

    setTimeout(function() {
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

        d3.selectAll(".link")
            .on("mouseover", function() { d3.select(this).attr("stroke-opacity", 0.6); })
            .on("mouseout", function() { d3.select(this).attr("stroke-opacity", 0.3); });
    
      }, 750);

  }

//Donut update functions
function updateDonut() {

    var donut = svg2.selectAll(".donut");
    var data0 = donut.data(),
        data1 = pie(byCategory);

    donut = donut.data(data1, function(d) { return d.data.key; });

    var exit = donut.exit();
    var enter = donut.enter().append('path')
                      .attr("fill", function(d) { return getColor(d.data.key); })
                      .attr("class", function(d) { return "donut "+className(d.data.key); })
                      .attr("opacity", 0.6)
                      .attr("stroke", "black")
                      .attr("transform", "translate(" + (mapWidth-R) + "," + height/2 + ")");
                      
        enter.append("title");
    
    var update = enter.merge(donut);

    exit.each(function(d) {
        d.start = {startAngle: d.startAngle, endAngle: d.endAngle};
        d.end = {startAngle: d.startAngle, endAngle: d.startAngle};
    });

    update.each(function(d) {
        var previous; 
        data0.forEach(function(d) {
              if (d.data.key == "Other") {
              previous = d;
              return;
              }
        });

        if (previous) {
          d.start = {startAngle: previous.startAngle, endAngle: previous.endAngle};
          d.end = {startAngle: d.startAngle, endAngle: d.endAngle};
        } else {
          d.start = {startAngle: d.startAngle, endAngle: d.startAngle};
          d.end = {startAngle: d.startAngle, endAngle: d.endAngle};
        }
    });

    d3.selectAll(".donut")
      .select("title")
      .text(function(d) { return d.data.key + ":\nUS$" + d3.format(".2s")(d.data.value); ; });

    exit.transition().duration(750)
      .attrTween('d', arcTween())
      .remove();

    update.transition().duration(750)
      .attrTween('d', arcTween());

};   

function arcTween() {
  return function(d) {

    var interpolateStart = d3.interpolate(d.start.startAngle, d.end.startAngle);
    var interpolateEnd = d3.interpolate(d.start.endAngle, d.end.endAngle);
    return function(t) {
      return arc({
        startAngle: interpolateStart(t),
        endAngle: interpolateEnd(t),
      });
    };
  };
}