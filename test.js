var telegraft = require('./src');

var wires = {};


	var endpoints = {
		server:'tcp://127.0.0.1:5678',
		radio:'tcp://127.0.0.1:5679'
	}

		wires.hqserver = telegraft.hq.server(endpoints);
		wires.hqclient = telegraft.hq.client(endpoints);

		wires.server = wires.hqclient.rpcserver('warehouse:/api', {
			id:'server1',
			protocol:'rpc',
			address:'tcp://127.0.0.1:5680'
		})

		wires.server.on('request', function(req, answer){
			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('REQUEST');
			answer(req + ' world');
		})

		wires.client = wires.hqclient.rpcclient('warehouse:/api');

		setTimeout(function(){
			var answer = wires.client.send('hello');

			answer.then(function(value){

				console.log('-------------------------------------------');
				console.dir(value);
				
				
			})	
		}, 10)
		

