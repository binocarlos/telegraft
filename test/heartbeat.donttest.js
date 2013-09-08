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

	it('should detect the heartbeat has stopped and remove the server but ensure the request is delivered eventually', function(done){

		this.timeout(15000);

		wires.hqserver = telegraft.server(endpoints);
		wires.hqclient = telegraft.client(endpoints);

		var rpcclient = wires.hqclient.rpcclient('/api/apples/sub');
		var removedhit = false;

		var map = {
			hit1:0,
			hit2:0,
			added:[],
			removed:[]
		}

		rpcclient.on('added', function(route, worker){
			map.added.push({
				route:route,
				worker:worker
			})
		})

		rpcclient.on('removed', function(route, worker){
			removedhit = true;
		})

		wires.server1 = wires.hqclient.rpcserver({
			id:'server1',
			protocol:'rpc',
			address:'tcp://127.0.0.1:5468'
		})

		wires.server2 = wires.hqclient.rpcserver({
			id:'server2',
			protocol:'rpc',
			address:'tcp://127.0.0.1:5469'
		})

		wires.server1.bind('/api/apples/sub');
		wires.server2.bind('/api/apples/sub');

		wires.server1.on('request', function(req, answer){
			req.hello.should.equal('world');
			map.hit1++;
			answer(null, 10);
		})

		wires.server2.on('request', function(req, answer){
			req.hello.should.equal('world');
			map.hit2++;
			

			if(map.hit2>=10){
				wires.server2.unplug();
			}
			else{
				answer(null, 10);	
			}
			
		})

		var requesthit = 0;

		function send_req(done){
			rpcclient.send({
				hello:'world'
			}, function(error, answer){
				answer.should.equal(10);
				requesthit++;
				done();
			})
		}

		var fns = [];
		for(var i=0; i<50; i++){
			fns.push(function(next){
				send_req(next);
			})
		}

		setTimeout(function(){

			async.parallel([
				function(next){
					async.series(fns, next);
				},

				function(next){
					async.series(fns, next);
				}

			], function(){
				map.hit1.should.equal(91);
				map.hit2.should.equal(10);
				requesthit.should.equal(100);
				removedhit.should.equal(true);
				done();
			})	
		}, 10)
		


	})


})