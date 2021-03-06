//Move selection to front/back; Reference:http://bl.ocks.org/eesur/4e0a69d57d3bfc8a82c2
d3.selection.prototype.moveToFront = function() {  
      return this.each(function(){
        this.parentNode.appendChild(this);
      });
    };

d3.selection.prototype.moveToBack = function() {  
        return this.each(function() { 
            var firstChild = this.parentNode.firstChild; 
            if (firstChild) { 
                this.parentNode.insertBefore(this, firstChild); 
            } 
        });
    };

//Sankey dragging
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


//Zooming functions
var zoom = d3.zoom()
             .scaleExtent([0.01,10])
             .on("zoom", zooming);


function zoomMap() {
        gMap.selectAll('.globe')
            .transition()
            .attr('d', map_path);

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
                                    gMap.selectAll(".globe").attr("d", map_path);
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

function zooming() {

      //Workaround due to the fact that event variable cannot be modified
      //Cannot completely avoid "zoom-freeze"
      if (d3.event.sourceEvent.type === 'wheel') {
         if (d3.event.transform.k <= 1) {
            var real_k = Math.log(d3.event.transform.k);
         } else {
            var real_k = d3.event.transform.k;
         };
            delta_k = real_k - wheel_k;
            wheel_k = real_k;
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

        gMap.selectAll('.globe')
            .transition()
            .attr('d', map_path);

        gMap.selectAll('.countryPie')
            .transition()
            .attr("transform", function(d) { return "translate(" + projection(centroid.get(className(d.key))) +")"; })
            .attr('visibility', isVisible.front);
    };
  };


//Highlighting functions
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
  var countryPie = gMap.selectAll(".countryPie").filter("."+cls);
  if (bool) { d3.select(".node ."+cls)
                .attr("opacity", 1);
              countryPie.select("circle")
                 .attr("opacity", 0);
              countryPie.selectAll(".pie")
                 .attr("opacity", 1);
              gMap.selectAll(".land."+cls)
                  .attr("fill", "#e34a33")
                  .attr("opacity", 1);
              gMap.select(".countryPie."+cls).moveToFront();
  } else { d3.select(".node ."+cls)
             .attr("opacity", 0.6);
           countryPie.select("circle")
              .attr("opacity", 1);
           countryPie.selectAll(".pie")
              .attr("opacity", 0.6);
           gMap.selectAll(".land."+cls)
               .attr("fill", "#e5f5e0")
               .attr("opacity", 0.3);
  };
}

//Sankey motion collection
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


//Globe motion collection
function mapMotion(){
    
    gMap.call(zoom);

    d3.select("#reset")
        .on("click", function() {
           gMap.select('.land')
                .transition()
                .duration(1500)
                .tween("rotate-scale", function(){
                     var r = d3.interpolate(projection.rotate(), [0,0]);
                     scale += originalScale*(1-map_k);
                     var s = d3.interpolate(projection.scale(), scale);
                     var p = d3.interpolate(map_k, 1);

                     return function (t) {
                                    projection.rotate(r(t));
                                    projection.scale(s(t));
                                    gMap.selectAll(".globe").attr("d", map_path);
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

    d3.selectAll(".pie")
      .on("mouseover", function() { d3.select(this).attr("opacity", 1); })
      .on("mouseout", function() { d3.select(this).attr("opacity", 0.6); });

};