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


function zoomMap() {
        //Update map
        gMap.selectAll('.world')
            .transition()
            .attr('d', map_path);

        //Update pies
        gMap.selectAll(".countryPie")
            .transition()
            .attr("transform", function(d) { return "translate(" + projection(centroid.get(className(d.key))) + ")"; })
         
        gMap.selectAll(".countryPie")            
            .selectAll("circle")
            .transition()
            .attr("r", 3*map_k);
      
        gMap.selectAll(".pie")
            .transition()
            .attr("d", pieArc(map_k));
};

function zooming() {        
      if (d3.event.sourceEvent.type === 'wheel') {
        
        delta_k = d3.event.transform.k - wheel_k;
        wheel_k = d3.event.transform.k;
        if ( map_k+delta_k > 5) { 
          delta_k=5-map_k;
          map_k = 5;
        } else if (map_k+delta_k < 1) { 
          delta_k=1-map_k;
          map_k =1;
        } else { 
          map_k = map_k + delta_k; };

        scale += originalScale*delta_k;
        projection.scale(scale);
        zoomMap();
         
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


function highlightLink(cls, bool){
  if (bool) { d3.selectAll(".link."+cls)
                .attr("stroke-opacity", 1);
  } else { d3.selectAll(".link."+cls)
             .attr("stroke-opacity", 0.3);
  };
}

function highlightCategory(cls, bool){
  highlightLink(cls, bool);
  if (bool) { d3.selectAll(".donut."+cls)
                .attr("opacity", 1);
              d3.selectAll(".countryPie ."+cls)
                .attr("opacity", 1);
  } else { d3.selectAll(".donut."+cls)
             .attr("opacity", 0.6);
           d3.selectAll(".countryPie ."+cls)
             .attr("opacity", 0.6);
  };
};

function highlightCountry(cls, bool){
  highlightLink(cls, bool);
  pie = gMap.selectAll(".countryPie").filter("."+cls);
  if (bool) { d3.select(".node ."+cls)
                .attr("opacity", 1);
              pie.select("circle")
                 .attr("opacity", 0);
              pie.selectAll(".pie")
                 .attr("opacity", 1);
              gMap.selectAll(".land."+cls)
                  .attr("fill", "#e34a33")
                  .attr("opacity", 1);
  } else { d3.select(".node ."+cls)
             .attr("opacity", 0.6);
           pie.select("circle")
              .attr("opacity", 1);
           pie.selectAll(".pie")
              .attr("opacity", 0.6);
           gMap.selectAll(".land."+cls)
               .attr("fill", "#e5f5e0")
               .attr("opacity", 0.3);
  };
}

function zoomCountry(cls) {
    cen = centroid.get(cls);

    gMap.select('.land.'+cls)
        .transition()
        .duration(1500)
        .tween("rotate-scale", function(){
             var r = d3.interpolate(projection.rotate(), [-cen[0],-cen[1]]);
             scale += originalScale*(4-map_k);
             var s = d3.interpolate(projection.scale(), scale);
             var p = d3.interpolate(map_k, 4);

             return function (t) {
                                    projection.rotate(r(t));
                                    projection.scale(s(t));
                                    gMap.selectAll(".world").attr("d", map_path);
                                    gMap.selectAll('.countryPie')
                                        .attr("transform", function(d) { return "translate(" + projection(centroid.get(className(d.key))) +")"; })
                                        .attr('visibility', isVisible.front);
                                    map_k = p(t);
                                    gMap.selectAll(".countryPie")
                                        .selectAll("circle")
                                        .attr("r", 3*map_k);
                                    gMap.selectAll(".pie")
                                        .attr("d", pieArc(map_k));
                                    }; 
            });
    };

function sankeyMotion(){

  d3.selectAll(".node")
    .call(d3.drag().on("drag", dragging));

  d3.selectAll(".link")
    .on("mouseover", function() { d3.select(this).attr("stroke-opacity", 0.6); })
    .on("mouseout", function() { d3.select(this).attr("stroke-opacity", 0.3); });

  d3.selectAll(".node .donor,.group")
    .on("mouseover", function() {
          d3.select(this).attr("opacity", 1);
          cls = d3.select(this).attr("class").slice(6);
          highlightLink(cls, true); })
    .on("mouseout", function() {
          d3.select(this).attr("opacity", 0.6);
          cls = d3.select(this).attr("class").slice(6);
          highlightLink(cls, false); });

  d3.selectAll(".node .category")
    .on("mouseover", function() {
          d3.select(this).attr("opacity", 1);
          cls = d3.select(this).attr("class").slice(9);
          highlightCategory(cls, true); })
    .on("mouseout", function() {
          d3.select(this).attr("opacity", 0.6);
          cls = d3.select(this).attr("class").slice(9);
          highlightCategory(cls, false); });

  d3.selectAll(".node .recipient")
    .on("mouseover", function() {
          cls = d3.select(this).attr("class").slice(10);
          highlightCountry(cls, true); })
    .on("mouseout", function() {
          cls = d3.select(this).attr("class").slice(10);
          highlightCountry(cls, false); })
    .on("click", function() {
          cls = d3.select(this).attr("class").slice(10);
          zoomCountry(cls);});
};

function mapMotion(){
    
    gMap.call(zoom);

    gMap.select("#reset")
        .on("click", function() {
          projection.rotate([0,0])
                    .scale((scale=originalScale));
          map_k=1;
          zoomMap();
          gMap.selectAll('.countryPie')
              .transition()
              .attr("transform", function(d) { return "translate(" + projection(centroid.get(className(d.key))) +")"; })
              .attr('visibility', isVisible.front);         
        });

    d3.selectAll(".donut")
      .on("mouseover", function() {
                     d3.select(this).attr("opacity", 1);
                     cls = d3.select(this).attr("class").slice(6);
                     highlightCategory(cls, true); })
      .on("mouseout", function() {
                     d3.select(this).attr("opacity", 0.6);
                     cls = d3.select(this).attr("class").slice(6);
                     highlightCategory(cls, false); });

    d3.selectAll(".countryPie circle")
      .on("mouseover", function() {
            cls = d3.select(this).attr("class");
            highlightCountry(cls, true); })
      .on("mouseout", function() {
            cls = d3.select(this).attr("class");
            highlightCountry(cls, false); })
      .on("click", function(){
            cls = d3.select(this).attr("class");
            zoomCountry(cls);});
};