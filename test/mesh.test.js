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

	it('should auto-mount RPC servers and clients', function(done){

		wires.hqserver = telegraft.server(endpoints);
		wires.hqclient = telegraft.client(endpoints);

		wires.server = wires.hqclient.rpcserver({
			id:'server1',
			protocol:'rpc',
			address:'tcp://127.0.0.1:5680'
		})

		wires.server.bind('warehouse:/api');

		wires.server.on('request', function(req, answer){
			answer(null, req + ' world');
		})

		wires.client = wires.hqclient.rpcclient('warehouse:/api');

		setTimeout(function(){
			wires.client.send('hello', function(error, value){
				value.should.equal('hello world');
				process.nextTick(function(){
					done();
				})
			})
		}, 100)
		

	})

	it('should load balance between multiple RPC servers', function(done){

		wires.hqserver = telegraft.server(endpoints);
		wires.hqclient = telegraft.client(endpoints);

		var counters = {
			server1:0,
			server2:0,
			server3:0,
			total:0
		}

		wires.server1 = wires.hqclient.rpcserver({
			id:'server1',
			address:'tcp://127.0.0.1:5668'
		})

		wires.server1.bind('warehouse:/api');

		wires.server2 = wires.hqclient.rpcserver({
			id:'server2',
			address:'tcp://127.0.0.1:5669'
		})

		wires.server2.bind('warehouse:/api');

		wires.server3 = wires.hqclient.rpcserver({
			id:'server3',
			address:'tcp://127.0.0.1:5667'
		})

		wires.server3.bind('warehouse:/api');

		wires.server1.on('request', function(req, answer){
			counters.server1++;
			counters.total++;
			answer(null, req + ' world');
		})

		wires.server2.on('request', function(req, answer){
			counters.server2++;
			counters.total++;
			answer(null, req + ' world');
		})

		wires.server3.on('request', function(req, answer){
			counters.server3++;
			counters.total++;
			answer(null, req + ' world');
		})

		wires.client = wires.hqclient.rpcclient('warehouse:/api');

		var all = 0;

		function runrequest(){
			setTimeout(function(){
				wires.client.send('hello', function(error, value){
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

	it('should proxy between seperate RPC servers', function(done){

		wires.hqserver = telegraft.server(endpoints);
		wires.hqclient = telegraft.client(endpoints);

		var counters = {
			server1:0,
			server2:0,
			server3:0,
			total:0
		}

		wires.server1 = wires.hqclient.rpcserver({
			id:'server1',
			protocol:'rpc',
			address:'tcp://127.0.0.1:5768'
		})

		wires.server1.bind('warehouse:/api/different');

		wires.server2 = wires.hqclient.rpcserver({
			id:'server2',
			protocol:'rpc',
			address:'tcp://127.0.0.1:5769'
		})

		wires.server2.bind('warehouse:/api/apples/sub');

		wires.server3 = wires.hqclient.rpcserver({
			id:'server3',
			protocol:'rpc',
			address:'tcp://127.0.0.1:5767'
		})

		wires.server3.bind('warehouse:/api/apples');

		wires.server1.on('request', function(req, answer){
			counters.server1++;
			counters.total++;
			answer(null, req + ' world');
		})

		wires.server2.on('request', function(req, answer){
			counters.server2++;
			counters.total++;
			answer(null, req + ' world');
		})

		wires.server3.on('request', function(req, answer){
			counters.server3++;
			counters.total++;
			answer(null, req + ' world');
		})

		wires.proxy = wires.hqclient.rpcproxy();

		async.series([

			function(next){
				setTimeout(next, 10);
			},

			function(next){
				wires.proxy.send('warehouse:/api/apples/12334', 'pie', function(error, result){
					result.should.equal('pie world');
					next();
				})
			},

			function(next){
				wires.proxy.send('warehouse:/api/different/12334', 'yo', function(error, result){
					result.should.equal('yo world');
					next();
				})
			},

			function(next){
				wires.proxy.send('warehouse:/api/apples/sub/12334/4532/fdgdg/4/dsfsf', 'subyo', function(error, result){
					result.should.equal('subyo world');
					next();
				})
			}
		], function(){
			counters.server1.should.equal(1);
			counters.server2.should.equal(1);
			counters.server3.should.equal(1);
			(counters.server1 + counters.server2 + counters.server3).should.equal(counters.total);
			done();
		})


	})




})