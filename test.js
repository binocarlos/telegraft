var telegraft = require('./src');
var async = require('async');

var wires = {};


	var endpoints = {
		server:'tcp://127.0.0.1:5678',
		radio:'tcp://127.0.0.1:5679'
	}


	wires.hqserver = telegraft.hq.server(endpoints);
		

		var counters = {
			server1:0,
			server2:0,
			server3:0,
			total:0
		}

		wires.hqclient = telegraft.hq.client(endpoints);

		wires.server1 = wires.hqclient.rpcserver('warehouse:/api/different', {
			id:'server1',
			protocol:'rpc',
			address:'tcp://127.0.0.1:5668'
		})

		wires.server2 = wires.hqclient.rpcserver('warehouse:/api/apples/sub', {
			id:'server2',
			protocol:'rpc',
			address:'tcp://127.0.0.1:5669'
		})

		wires.server3 = wires.hqclient.rpcserver('warehouse:/api/apples', {
			id:'server3',
			protocol:'rpc',
			address:'tcp://127.0.0.1:5667'
		})

		wires.server1.on('request', function(req, answer){
			counters.server1++;
			counters.total++;
			answer(req + ' world');
		})

		wires.server2.on('request', function(req, answer){
			counters.server2++;
			counters.total++;
			answer(req + ' world');
		})

		wires.server3.on('request', function(req, answer){
			counters.server3++;
			counters.total++;
			answer(req + ' world');
		})

		

		async.series([

			function(next){
				setTimeout(next, 50);
			},

			function(next){

				wires.proxy = wires.hqclient.rpcproxy();
				setTimeout(next, 50);
			},

			function(next){
				var answer = wires.proxy.send('warehouse:/api/apples/12334', 'pie');

				answer.then(function(result){
					console.dir(result);
					next();
				})
			},

			function(next){
				var answer = wires.proxy.send('warehouse:/api/different/12334', 'yo');

				answer.then(function(result){
					console.dir(result);
					next();
				})
			},

			function(next){
				var answer = wires.proxy.send('warehouse:/api/apples/sub/12334', 'subyo');

				answer.then(function(result){
					console.dir(result);
					next();
				})
			}
		], function(){
			console.dir(counters);
			
		})