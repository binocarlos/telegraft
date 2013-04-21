var telegraft = require('./src');

var wires = {};


		var address = 'tcp://127.0.0.1:5678';

		wires.server = telegraft.device.radioserver('bind');
		wires.client = telegraft.device.radioclient('connect');

		wires.server.plugin(address);
		wires.client.plugin(address);

		var hasrun = false;
		wires.client.rawsubscribe('def', function(message, routingkey){
			if(hasrun){
				return;
			}
			hasrun = true;
			console.log('-------------------------------------------');
			console.log('callback');
			console.dir(message);
			console.dir(routingkey);
		})

		setTimeout(function(){
			wires.server.broadcast('dep.abc', 'hello');	
		}, 10)
			