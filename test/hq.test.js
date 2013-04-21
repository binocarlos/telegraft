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
		unplugged();
	})

	it('should auto-mount servers and clients', function(done){

		wires.hqserver = telegraft.hq.server(endpoints);
		wires.hqclient = telegraft.hq.client(endpoints);

		wires.server = wires.hqclient.rpcserver('warehouse:/api', {
			id:'server1',
			protocol:'rpc',
			address:'tcp://127.0.0.1:5680'
		})

		wires.server.on('request', function(req, answer){
			answer(req + ' world');
		})

		wires.client = wires.hqclient.rpcclient('warehouse:/api');

		setTimeout(function(){
			var answer = wires.client.send('hello');

			answer.then(function(value){
				value.should.equal('hello world');
				process.nextTick(function(){
					done();
				})
				
			})
		}, 10)
		

	})

	it('should load balance between multiple RPC servers', function(done){

		
		wires.hqserver = telegraft.hq.server(endpoints);
		wires.hqclient = telegraft.hq.client(endpoints);

		var counters = {
			server1:0,
			server2:0,
			server3:0,
			total:0
		}

		wires.server1 = wires.hqclient.rpcserver('warehouse:/api', {
			id:'server1',
			protocol:'rpc',
			address:'tcp://127.0.0.1:5668'
		})

		wires.server2 = wires.hqclient.rpcserver('warehouse:/api', {
			id:'server2',
			protocol:'rpc',
			address:'tcp://127.0.0.1:5669'
		})

		wires.server3 = wires.hqclient.rpcserver('warehouse:/api', {
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

		wires.client = wires.hqclient.rpcclient('warehouse:/api');

		var all = 0;

		function runrequest(){
			setTimeout(function(){
				var answer = wires.client.send('hello');

				answer.then(function(value){
					value.should.equal('hello world');
					all++;
					if(all<50){
						runrequest();	
					}
					else{
						counters.server1.should.not.equal(0);
						counters.server2.should.not.equal(0);
						counters.server3.should.not.equal(0);
						(counters.server1 + counters.server2 + counters.server3).should.equal(counters.total);
						done();
					}
				})	
			}, 1)
			
		}

		setTimeout(function(){
			runrequest();	
		}, 10)
		

	})

})