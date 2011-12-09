var twitter = require('ntwitter');
var express = require('express');
var http = require('http');  
  
var app = module.exports = express.createServer(), 
    io = require('socket.io').listen(app);

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(app.router)
  app.use(express.static(__dirname + '/public'));
});

// Routes
app.get('/', function(req, res){
  console.log('user connected')
  res.render('index', {locals: {
    title: 'nfinden'
  }});
});

app.listen(1337);
  
console.log('Express server listening on port %d', app.address().port);


var t = new twitter({
    consumer_key: 'your_consumer_key',
    consumer_secret: 'your_consumer_secret',
    access_token_key: 'your_access_token_key',
    access_token_secret: 'your_access_token_secret'
});


t.stream('statuses/filter', {'locations':'-74,40,-73,41'} , function( stream ) {

    io.sockets.on('connection', function ( socket ) {

      stream.on('data', function ( data ) {
    
          socket.emit( 'mapTweet', data );
        
      });

    })
})


