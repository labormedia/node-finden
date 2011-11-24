/*

$('<div>I am new!</div>').appendTo(oldDomElement)
same as
dojo.place('<div>I am new!</div>', oldDomElement, 'last')

*/
/** Converts numeric degrees to radians */
if (typeof(Number.prototype.toRad) === "undefined") {
  Number.prototype.toRad = function () {
    return this * Math.PI / 180;
  }
}

/** Converts numeric degrees to radians */
if (typeof(Number.prototype.toDeg) === "undefined") {
  Number.prototype.toDeg = function () {
    var d = 360/(2*Math.PI);
    return this * d;
  }
} 

var io = io.connect();

(function (dojo) {
  dojo.require("dojo.fx");
  dojo.require("dojo.fx.easing");
  dojo.require("dojo.window");
  dojo.require("dojo.store.Memory");
  dojo.require("dojox.grid.DataGrid");
  dojo.require("dojo.data.ObjectStore");
  
  dojo.ready(function () {
    var cloudmadeUrl = 'http://{s}.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/997/256/{z}/{x}/{y}.png', 
    cloudmadeAttribution = '',
    cloudmade = new L.TileLayer(cloudmadeUrl, {
      maxZoom: 18, 
      attribution: cloudmadeAttribution
    }),
    calculate = {
      distance: function( point1, point2 ){
        var lat1 = point1[0], lat2 = point2[0], lon1 = point1[1], lon2 = point2[1],
            R = 6371, 
            dLat = (lat2-lat1).toRad(), dLon = (lon2-lon1).toRad(),
            lat1 = lat1.toRad(), lat2 = lat2.toRad(),
            a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
                Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2),
            c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)),
            d = R * c;
        return d
      },
      pointInPolygon: function(o,lat,lon){
        var inPoly=false;
        dojo.forEach(o, function(p, k) {
          var i,points = p._latlngs,j=points.length-1
          for (i=0; i<points.length; i++) {
            if (points[i].lng<lon && points[j].lng>=lon || points[j].lng<lon && points[i].lng>=lon){
              if (points[i].lat + (lon-points[i].lng)/(points[j].lng-points[i].lng)*(points[j].lat - points[i].lat)<lat){
                inPoly=!inPoly; 
              }
            }
            j=i; 
          }
        })
        return inPoly;
      }
    },
    user = {
      _e: false, _h: [], _p:[],
      isTraveling: function(){
       return this._h.length > 0 ? true : false
      },
      toggleEdit: function(){
        this._e = !this._e
      },
      canEdit: function(){
        return this._e
      },
      hasPolygons: function(){
        return this._p.length > 0 ? true : false
      },
      getPolygons: function(){
        return this._p
      },
      record: function( p ){
        this._h.push( p )
      },
      clearHistory: function(){
        this._h = []
      },
      getHistory: function(){
        return this._h
      },
      getHistoryByIndex: function(o){
        return this._h[o] ? this._h[o] : null
      },
      getHistoryByOffset: function( offset ){
        return this._h[this._h.length - offset] ? this._h[this._h.length - offset] : null
      },
      storePolygon: function(o){
        this._p.push(o)
        console.log(this._p)
      },
      log: function (o){
        //$('#log').text( d )
      },
      settings: {
        _open: false,
        _memoryStore:  new dojo.store.Memory({data:[]}),
        toggleView: function(){
          this._open = !this._open
        },
        isOpen: function(){
          return this._open
        },
        spawnGrid: function(){
          var m = this._memoryStore
          this._grid = new dojox.grid.DataGrid({
              store: dataStore = dojo.data.ObjectStore({objectStore: m}),
              structure: [
                  {name:'id', field: 'id', width:'60px;'},
                  {name:"Name", field:"name", width: "100px"},
                  {name:"Followers", field:"followers", width: "100px"},
                  {name:"Text", field:"text", width: "auto"},
                  
              ]
          }, "grid"); // make sure you have a target HTML element with this id
          this._grid.startup();
        },
        put: function(o){
          var obj = {
            id:o.id,
            text:o.text,
            name:o.user.screen_name,
            followers:o.user.followers_count
          }
          this._memoryStore.put(obj)
          m = this._memoryStore
          this._grid.setStore(dataStore = dojo.data.ObjectStore({objectStore: m}))
        },
      }
    },
    map = new L.Map('map'),
    pos = new L.LatLng(40.770012,-73.973694),
    settings = user.settings;
    
		map.setView(pos, 13).addLayer(cloudmade);
		
    map.spawnCircle = function( lat, lng, r ){
      var latlng = new L.LatLng(lat, lng), 
          circle = new L.CircleMarker(latlng, {
            stroke: true,
            radius: r
          });
      this.addLayer( circle );
      return circle
    }
    
    map.addPolyline = function( s, e ){
      var polyline = new L.Polyline([new L.LatLng(s.lat,s.lng),new L.LatLng(e.lat, e.lng)],{color: 'blue'});
      this.addLayer(polyline)
      return polyline
    }
    
    map.addPolygon = function( p ){
      var polygon = new L.Polygon(p, {color: 'blue'} );
      this.addLayer(polygon)
      return polygon
    };
    
    map.on('click', function (e) {
      if(user.canEdit()){
        var circle = this.spawnCircle(e.latlng.lat, e.latlng.lng, 10)
        if(user.isTraveling()){
          user.record({
            "lat" : e.latlng.lat, 
            "lng" : e.latlng.lng,
            "circle" : circle 
          })
          var polyline = this.addPolyline( user.getHistoryByOffset(2), user.getHistoryByOffset(1) )
          user.getHistoryByOffset(1).polyline = polyline
        }else{
          user.record({
            "lat" : e.latlng.lat, 
            "lng" : e.latlng.lng,
            "circle" : circle 
          })
        }
      }
    });
    
    /* connect to the server */
    io.on('mapTweet', function ( tweet ){
      settings.put(tweet)
      if( tweet.geo ){
        
        if(user.hasPolygons()){
          var isValid = calculate.pointInPolygon(user.getPolygons(), tweet.geo.coordinates[0], tweet.geo.coordinates[1])

          if(isValid){
            var pos = new L.LatLng(tweet.geo.coordinates[0],tweet.geo.coordinates[1]), markerLocation = pos,
            marker = new L.Marker(markerLocation);
            map.addLayer(marker);
          }else{
            console.log(tweet)
            
          }
          
        }

      }else{
        console.log(tweet)
        
      
      }
      
    });
    
    settings.spawnGrid()
    //click handlers
    dojo.connect(dojo.byId('toggle-edit'), 'click', this, function(e){
      user.toggleEdit() 
    });
    
    dojo.connect(dojo.byId('save-region'), 'click', this, function(e){
      var history = user.getHistory(),
          polyPoints = [];
      dojo.forEach(history, function(p, i) {
        polyPoints.push(new L.LatLng(p.lat, p.lng))
        if( i >= history.length -1 ){
          var polygon = map.addPolygon(polyPoints)
          user.clearHistory()
          user.storePolygon( polygon )
        }
      });
    })
    
    dojo.connect(dojo.byId('block'), 'click', this, function(e){
    
      var view = dojo.window.getBox(dojo.doc);

      if(settings.isOpen()){
        dojo.animateProperty({
          node:"settings",
          properties: {
              width: 40
          }
        }).play();
        settings.toggleView()
      }else{
        dojo.animateProperty({
          node:"settings",
          properties: {
              width: 800
          }
        }).play();
        settings.toggleView()
      }
      
    })
    
  })//end add on load

}(dojo));