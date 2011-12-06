
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
  dojo.require("dojo.data.ItemFileWriteStore");
  dojo.require("dijit.form.Button");
  dojo.require("dijit.layout.TabContainer");
  dojo.require("dijit.layout.ContentPane");
  dojo.require("dijit.layout.AccordionContainer");
  
  
  
  dojo.ready(function () {
    var cloudmadeUrl = 'http://{s}.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/997/256/{z}/{x}/{y}.png', 
    cloudmadeAttribution = '',
    cloudmade = new L.TileLayer(cloudmadeUrl, {
      maxZoom: 18, 
      attribution: cloudmadeAttribution
    }),
    map = new L.Map('map'),
    pos = new L.LatLng(40.770012,-73.973694),
    box = dojo.window.getBox(dojo.doc),
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
        var polyPoint = {
          isInside: false,
          sanitize:[]
        };
        dojo.forEach(o, function(p, k) {
          var i,points = p._latlngs,j=points.length-1
          for (i=0; i<points.length; i++) {
            if (points[i].lng<lon && points[j].lng>=lon || points[j].lng<lon && points[i].lng>=lon){
              if (points[i].lat + (lon-points[i].lng)/(points[j].lng-points[i].lng)*(points[j].lat - points[i].lat)<lat){
                polyPoint.isInside =!polyPoint.isInside;
                polyPoint.sanitize.push({"index":p._index,"isInside":polyPoint.isInside})
              }
            }
            j=i; 
          }
        })
        return polyPoint;
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
        _activeMarkers: [],
        _itemStores: [],
        _regionalText:[],
        _memoryStore:  new dojo.store.Memory({data:[]}),
        _itemStore : new dojo.data.ItemFileWriteStore({
          data: {
            identifier : 'id',
            items: []
          }
        }),
        _cpCounter: 0,
        isOpen: function(){
          return this._open
        },
        spawnItemStore: function(index){
          var store = new dojo.data.ItemFileWriteStore({
            data: {
              identifier : 'id',
              items: []
            }
          })
          var obj = {
            index: index,
            store: store
          }
          this._itemStores.push(obj)
          console.log(this._itemStores)
          return store
        },
        spawnGrid: function(id, index){
          var h = box.h - 100;
          dojo.style(dojo.byId("gridContainer"), "height", "" + h +"px" );
          var grid = new dojox.grid.DataGrid({
              store: this.spawnItemStore(index),
              structure: [
                  {name:"Name", field:"name", width: "100px"},
                  {name:"Name", field:"img", width: "85px", formatter: function(v){
                    var s = '<img src="'+v+'" style="max-width:80px" />'
                    return s
                  }},
                  {name:"Followers", field:"followers", width: "100px"},
                  {name:"Text", field:"text", width: "auto"}
              ]
          }, id);
          grid.startup();
          dojo.connect(grid, 'onRowMouseOver', this, function(e){
            var gridItem = grid.getItem(e.rowIndex),
                m = gridItem.marker[0];
            if(m){
              this.pan(m)
            }  
            
          })
        },
        spawnTab: function(){
          var h = box.h - 70,
          counter = this._cpCounter + 1,
          title = 'region ' + counter,
          accordianId = 'region'+counter+'Accordian',
          content = '<div id="'+accordianId+'"></div>';
          this._cpCounter++
          if(!this._tc){
            this._tc = new dijit.layout.TabContainer({
              style: "height: "+h+"px; width: 100%;"
            },"tc"),
            cp = new dijit.layout.ContentPane({
              title: title,
              content: content
            });
            this._tc.addChild(cp);
            this._tc.startup() 
          }else{
            var cp = new dijit.layout.ContentPane({
              title: title,
              content: content
            });
            this._tc.addChild(cp);
          }
          var aContainer = new dijit.layout.AccordionContainer({
              style: "height: "+ h - 30 +"px"
          },accordianId);
          aContainer.addChild(new dijit.layout.ContentPane({
            title: 'Tweets',
            content: '<div id="'+accordianId+'TweetGrid"></div>'
          }));
          aContainer.addChild(new dijit.layout.ContentPane({
            title: 'Keywords',
            content: '<div id="'+accordianId+'KeywordGrid"></div>'
          }));
          aContainer.addChild(new dijit.layout.ContentPane({
            title: 'Articles',
            content: '<div id="'+accordianId+'ArticlesGrid"></div>'
          }));
          aContainer.startup();
          this.spawnGrid(''+accordianId+'TweetGrid', counter)
        },
        pan: function(m){
          map.panTo(m._latlng)
        },
        clearMarkers: function(){
          dojo.forEach(this._activeMarkers, function(m){
            map.removeLayer(m)
          })
        },
        toggleView:function(w){
          if(this.isOpen()){
            dojo.animateProperty({
              node:"settings",
              duration: 100,
              properties: {
                  width: 0
              },
              beforeBegin:function(){
                var c = map.getCenter();
                dojo.style(dojo.byId("map"), "right", "0" );
                map.invalidateSize();
                map.panTo(c);
              }
            }).play();
            this._open = !this._open
          }else{
            dojo.animateProperty({
              node:"settings",
              duration: 100,
              properties: {
                  width: w
              },
              onEnd:function(){
                var c = map.getCenter();
                dojo.style(dojo.byId("map"), "right", ""+w+"px" );
                map.invalidateSize();
                map.panTo(c);
              }
            }).play();
            this._open = !this._open
          }
        },
        storeTweet: function(o,g,m,i){
          this._memoryStore.put(o)
          if(g){
            geo = true
          }else{
            geo = false
          }
          
          var obj = {
            id:o.id,
            text:o.text,
            name:o.user.screen_name,
            followers:o.user.followers_count,
            img: o.user.profile_image_url,
            geo:geo,
            marker: m
          }
          this.addTweet(obj, i)
        },
        updateText: function(text, index){
          var hasTextObj = false,
          thisRegionsText;
          dojo.forEach(this._regionalText, function(r){
            if(r.id == index){
              hasTextObj = true
              thisRegionsText = r
            }
          })
          if(hasTextObj){
            thisRegionsText.text.push(text)
            console.log(thisRegionsText.text.join(""))
          }else{

            var obj = {
              id: index, 
              text: []
            }
            obj.text.push(text)

            this._regionalText.push(obj)
          }

          console.log(this._regionalText.join(" "))
          
        },
        addTweet: function(o, i) {
          var s;
          dojo.forEach(this._itemStores,function(store){
            if(store.index === i){
              s = store.store
              console.log('found a store')
              try {
                settings.updateText(o.text, i)
                s.newItem(o)
              }catch (e) {
                console.log('error adding newItem %o', e)
              } 

            }
          })
           
       }
      }
    },
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
      polygon._index = user.getPolygons().length + 1;
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
    
    io.on('mapTweet', function ( tweet ){
      if( tweet.geo ){
        var pos = new L.LatLng(tweet.geo.coordinates[0],tweet.geo.coordinates[1]), markerLocation = pos,
        marker = new L.Marker(markerLocation);
        
        settings.storeTweet(tweet, true, marker)
        if(user.hasPolygons()){
          var point = calculate.pointInPolygon(user.getPolygons(), tweet.geo.coordinates[0], tweet.geo.coordinates[1])
          if(point.isInside){
            map.addLayer(marker);
            var realIndex = [];
            dojo.forEach(point.sanitize, function(p, j){
              if(p.isInside){
                realIndex.push(p.index)
              }
              if(j === point.sanitize.length - 1){
                settings.storeTweet(tweet, true, marker, realIndex[0])
              }
            })
          }else{
            //console.log(tweet)
          }
        }

      }else{
        settings.storeTweet(tweet, false, marker)
      }
      
    });
    
    //settings.spawnGrid()
    
    //click handlers
    dojo.connect(dojo.byId('toggle-edit'), 'click', this, function(e){
      user.toggleEdit() 
    });
    
    //click handlers
    dojo.connect(dojo.byId('clear-markers'), 'click', this, function(e){
      settings.clearMarkers() 
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
          settings.spawnTab()
        }
      });
    })
    
    dojo.connect(dojo.byId('block'), 'click', this, function(e){
    
      settings.toggleView(520)
            
    })
    
  })//end add on load

}(dojo));