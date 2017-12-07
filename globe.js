function getCentroid() {
  var centroid = d3.map();
  countries.forEach(function (country) {
    centroid.set(className(country.properties.name), d3.geoCentroid(country));
    });
  return centroid;
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
    byCountryTotal.set(className(country.key), country.value);
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

var pie = d3.pie()
            .value(function(d) { return d.value; });

  var arcs = svg2.selectAll("path")
              .data(pie(data), function(d) { return d.data.key; })
              .enter()
              .append("path")
              .attr("d", arc)
              .attr("fill", function(d) { return getColor(d.data.key); })
              .attr("class", function(d) { return "donut "+className(d.data.key); })
              .attr("opacity", 0.6)
              .attr("stroke", "black")
              .attr("transform", "translate(" + (mapWidth-R) + "," + height/2 + ")")
              .append("title")
              .text(function(d) { return d.data.key + "\nUS$" + d3.format(".2s")(d.value)});
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
          .attr('stroke-width', 0.6);

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


    button = gMap.append("g")
                .attr("transform", "translate(" +(mapWidth/2-30)+","+(R*2-25)+")")
       
    button.append("text")
          .attr("id", "reset")
          .text("RESET")
          .attr("stroke", "#2c7fb8")
          .attr("transform", "translate(6,35)");
};

var isVisible = {
  front: function(d) {
    return (((Math.cos((projection.rotate()[0]+centroid.get(className(d.key))[0])/360*2*Math.PI)>0) &&
        ((Math.cos((projection.rotate()[1]+centroid.get(className(d.key))[1])/360*2*Math.PI)>0)))?'visible':'hidden');
  }
};

function drawCountryPie() {
  var points = gMap.selectAll(".countryPie")
                  .data(byCountryCategory, function(d) {
                       return d.key;
                      })
                  .enter()
                .append("g")
                  .attr("class", function(d) { return className(d.key); })
                  .classed("countryPie", true)
                  .attr("transform", function(d) { 
                      return "translate(" + projection(centroid.get(className(d.key))) +")"; })
                  .attr('visibility', isVisible.front);

      points.append("circle")
            .attr("fill", "#e34a33")
            .attr("class", function(d) { return className(d.key); })
            .attr("r", 3*map_k)
            .append("title")
            .text(function(d) { return d.key });
  
      points.selectAll(".pie")
            .data(function(d) { return pie(d.values); })
            .enter()
            .append("path")
            .attr("d", pieArc(map_k))
            .attr("fill", function(d) { return getColor(d.data.key); })
            .attr("class", function(d) { return "pie "+className(d.data.key); })
            .attr("opacity", 0.6)
            .attr("stroke", "black")
            .append("title")
            .text(function(d) { return d.data.key + ":\n"
                + d3.format(".0%")(d.data.value/byCountryTotal.get(getCountry(this.parentNode)))
                + " of US$" + d3.format(".2s")(byCountryTotal.get(getCountry(this.parentNode))); })
  };