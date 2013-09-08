var telegraft = require('../src');
var async = require('async');
var _ = require('lodash');

describe('HQ', function(){

	var wires = {};

	/*
	
		clear up the wires after each test
		
	*/

	var endpoints = {
		server:'tcp://127.0.0.1:5678',
		radio:'tcp://127.0.0.1:5679'
	}

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

	it('should deal with servers that take ages and not freak out sending another request', function(done){

		this.timeout(30000);

		wires.hqserver = telegraft.server(endpoints);
		wires.hqclient = telegraft.client(endpoints);

		var rpcclient = wires.hqclient.rpcclient('/api/apples/sub');
		
		wires.server1 = wires.hqclient.rpcserver({
			id:'server1',
			protocol:'rpc',
			address:'tcp://127.0.0.1:5468'
		})

		wires.server1.bind('/api/apples/sub');

		wires.server1.on('request', function(req, answer){
			req.hello.should.equal('world');

			setTimeout(function(){
				answer(null, 10);	
			}, 5000)
			
		})

		rpcclient.send({
			hello:'world'
		}, function(error, answer){
			
			answer.should.equal(10);
			done();
		})
	

	})


})