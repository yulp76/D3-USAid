var group = "income_group";
var country = ["Vietnam","Brazil","Kenya","Nigeria"]

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
    donut_w = 25,
    innerR = R - donut_w;

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

var sankey_layout = d3.sankey()
    .nodeId(function (d) {
        return d.name;      
    })
    .nodeWidth(12)
    .nodePadding(20)
    .extent([[margin.left,margin.top], [sankeyWidth-50, height-margin.bottom]]);

var pie = d3.pie()
            .value(function(d) { return d.value; });

var projection = d3.geoOrthographic()
			    .scale(height/2.4) 
			    .translate([mapWidth/2, height/2])
			    .clipAngle(90),

    map_path = d3.geoPath()
                 .projection(projection)
                 .pointRadius(1);


d3.queue()
  .defer(d3.csv, 'data/sample.csv')
  .defer(d3.json, 'data/world.json')
  .await(load);


function load(error, aid, world) {
  if (error) { console.log(error); }

  //Sankey
  graph = sankeyFormat(aid, group);
  plotSankey(graph);

  //Map
  byType = aggregateType(aid); 
  byCountry = aggregateCountry(aid);
  byCountryTotal = byCountry[0];
  byCountryType = byCountry[1];

  centroid = getCentroid(world.features);

  plotDonut(byType);  
  drawMap(world.features);
  drawCountryPie(centroid, byCountryType, byCountryTotal);





  
  }


//Shared Functions
function getColor(name) {
      if (type.includes(name)) {
        return colorType(name);
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

function plotSankey(graph) {
  
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
    var node_h = d.y1-d.y0
    d.y0 = Math.max(margin.top, Math.min(height-margin.bottom-node_h, d.y0+d3.event.dy))
    d.y1 = d.y0+node_h
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



//Viz 2 Functions
function drawArc(outerR, innerR) {
  return d3.arc()
            .outerRadius(outerR)
            .innerRadius(innerR);
};

function aggregateType(data) {
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

  return [byCountryTotal, byCountryType];
};

function getCentroid(countries) {
  var centroid = d3.map();
  countries.forEach(function (country) {
    centroid.set(country.properties.name, map_path.centroid(country));
    });
  return centroid;
  };


function plotDonut(data) {

  var arc = drawArc(R, innerR),
      label = drawArc(R-18, R-18);

  var arcs = svg2.selectAll(".arc")
              .data(pie(data))
              .enter()
              .append("g")
              .attr("class", "arc")
              .attr("transform", "translate(" + (mapWidth-R) + "," + height/2 + ")");

  arcs.append("path")
        .attr("fill", function(d) { return getColor(d.data.key); })
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

//Reference: https://bl.ocks.org/larsvers/f8efeabf480244d59001310f70815b4e
function drawMap(dataset) {

	var graticule = d3.geoGraticule(),
	    grid = graticule();

	    gMap.selectAll('.grid')
			.data([grid])
			.enter()
			.append('path')
	        .classed('grid', true)
	        .classed('world', true)
		    .attr('d', map_path)
		    .attr('fill', 'none')
		    .attr('stroke', '#deebf7')
		    .attr('stroke-width', 0.8);

	var country = gMap.selectAll(".country")
	                	.data(dataset)
	                  	.enter()
	                	 .append("path")
	                 	 .attr("class", "country")
	             	     .classed('world', true)
	                 	 .attr("d", map_path)
	                 	 .attr("fill", "#e5f5e0")
	                 	 .attr("opacity", 0.3)
	                 	 .attr("stroke", "#08306b");

	country.append("title")
	          .text(function(d) { return d.properties.name });
    

    var zoom = d3.zoom()
				    .scaleExtent([2, 8])
				    .on("zoom", zoomed)

  	d3.select('.map').call(zoom);

  	var previousScaleFactor = 1; 

  	function zoomed() {
	    var dx = d3.event.sourceEvent.movementX;
	    var dy = d3.event.sourceEvent.movementY;
	    var event = d3.event.sourceEvent.type;
	        
	    if (event === 'wheel') {
	      
	      scaleFactor = d3.event.transform.k; 
	      scaleChange = scaleFactor - previousScaleFactor;
	      scale = height/2.4 + scaleChange/2.4;
	      projection.scale(scale);
	      previousScaleFactor = scaleFactor;

	      d3.selectAll('.world').attr('d', map_path);

	    } else {

	      var r = projection.rotate();
	      rotation = [r[0] + dx * 0.4, r[1] - dy * 0.5, r[2]];
	      projection.rotate(rotation);

	      d3.selectAll('.world').attr('d', map_path);

    }
  
  }
};


function drawCountryPie(centroid, byCountryType, byCountryTotal){
  var points = gMap.selectAll(".centroid")
                  .data(byCountryType)
                  .enter()
                .append("g")
                  .attr("class", function(d) { return "centroid "+d.key; })
                  .attr("transform", function(d) { return "translate(" + centroid.get(d.key)[0] + "," +
                        centroid.get(d.key)[1] +")";});
  
  var pies = points.selectAll(".pie")
                      .data(function(d) { return pie(d.values); })
                      .enter()
                    .append("g")
                      .attr("class", "pie");
  
  points.append("circle")
          .attr("fill", "#a50f15")
          .attr("r", 2)
        .append("title")
          .text(function(d) { return d.key });

  var arc = drawArc(function(d){ return Math.max(4, Math.sqrt(byCountryTotal.get(d.data.mainkey)/10000));}, 3);

  pies.append("path")
        .attr("d", arc)
        .attr("fill", function(d) { return getColor(d.data.key); })
        .attr("opacity", 0.75)
        .attr("stroke", "black")
      .append("title")
        .text(function(d) { return d.data.key + ":\n"
          + d3.format(".0%")(d.data.value/byCountryTotal.get(d.data.mainkey))
          + " of US$" + d3.format(".2s")(byCountryTotal.get(d.data.mainkey));})
  };