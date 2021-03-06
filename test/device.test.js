var telegraft = require('../src');
var async = require('async');
var _ = require('lodash');

describe('device', function(){

	var wires = {};

	/*
	
		clear up the wires after each test
		
	*/

	beforeEach(function(unplugged){
		_.each(wires, function(wire){
			wire.unplug();
		})
		wires = {};
		unplugged();
	})

	afterEach(function(unplugged){
		_.each(wires, function(wire){
			wire.unplug();
		})
		wires = {};

		setTimeout(function(){
			unplugged();	
		}, 100)
		
	})
	it('should do an RPC loop', function(done){

		var address = 'tcp://127.0.0.1:5678';

		wires.server = telegraft.device.rpcserver('bind');
		wires.client = telegraft.device.rpcclient('connect');

		wires.server.on('request', function(req, reply){
			reply(null, req + ' world');
		})

		wires.server.plugin(address);
		wires.client.plugin(address);

		wires.client.send('hello', function(error, value){
			value.should.equal('hello world');
			process.nextTick(function(){
				done();
			})
		});

	})

	it('should do an RPC loop with a JSON packet', function(done){

		var address = 'tcp://127.0.0.1:5678';

		wires.server = telegraft.device.rpcserver('bind');
		wires.client = telegraft.device.rpcclient('connect');

		wires.server.on('request', function(req, reply){
			reply(null, {
				testkey:req.testkey + 10
			});
		})

		wires.server.plugin(address);
		wires.client.plugin(address);

		wires.client.send({
			testkey:378
		}, function(error, value){
			value.testkey.should.equal(388);
			done();
		})

	})

	it('should do a broadcast loop', function(finish){

		var address = 'tcp://127.0.0.1:5678';

		wires.server = telegraft.device.radioserver('bind');
		wires.client = telegraft.device.radioclient('connect');

		wires.server.plugin(address);
		wires.client.plugin(address);

		var hasrun = false;
		wires.client.subscribe('', function(message){
			if(hasrun){
				return;
			}
			hasrun = true;
			message.should.equal('hello');
			finish();
		})

		setTimeout(function(){
			wires.server.broadcast('hello');	
		}, 10)
		

	})


	it('should do a wildcard subscribe', function(finish){


		var address = 'tcp://127.0.0.1:5678';

		wires.server = telegraft.device.radioserver('bind');
		wires.client = telegraft.device.radioclient('connect');

		wires.server.plugin(address);
		wires.client.plugin(address);

		var hasrun = false;
		wires.client.subscribe('dep.*', function(message){
			if(hasrun){
				return;
			}
			hasrun = true;
			message.should.equal('hello');
			finish();
		})

		setTimeout(function(){
			wires.server.broadcast('dep.abc', 'hello');	
		}, 10)
			

	})

	it('should do a raw subscribe', function(finish){


		var address = 'tcp://127.0.0.1:5678';

		wires.server = telegraft.device.radioserver('bind');
		wires.client = telegraft.device.radioclient('connect');

		wires.server.plugin(address);
		wires.client.plugin(address);

		var hasrun = false;
		wires.client.rawsubscribe('dep', function(message){
			if(hasrun){
				return;
			}
			hasrun = true;
			message.should.equal('hello');
			finish();
		})

		setTimeout(function(){
			wires.server.broadcast('dep.abc', 'hello');	
		}, 10)
			

	})

})