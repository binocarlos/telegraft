var telegraft = require('../src');
var async = require('async');
var _ = require('lodash');

describe('wire', function(){


	var wires = {};

	/*
	
		clear up the wires after each test
		
	*/

	beforeEach(function(unplugged){
		_.each(wires, function(wire){
			wire.unplug();
		})
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

	it('should construct from JSON data', function(){

		var wire = telegraft.wire({
			type:'sub',
			direction:'connect'
		})

		wire.type.should.equal('sub');
		wire.direction.should.equal('connect');
			
	})

	it('should emit events', function(done) {

		var wire = telegraft.wire();

		wire.on('message', done);
		wire.emit('message');
		
	})

	it('Server should get messages', function(done) {

		var address = 'tcp://127.0.0.1:5678';

		wires.server = telegraft.wire({
			type:'router',
			direction:'bind'
		})

		wires.client = telegraft.wire({
			type:'dealer',
			direction:'connect'
		})

		wires.server.plugin(address);
		wires.client.plugin(address);

		wires.server.on('message', function(frames){
			var packet = frames[frames.length-1].toString();
			packet.should.equal('hello');
			done();
		})

		wires.client.send('hello');
		
	})

	it('Should load balance', function(done) {

		var address1 = 'tcp://127.0.0.1:5678';
		var address2 = 'tcp://127.0.0.1:5679';

		wires.server1 = telegraft.device.rpcserver('bind');
		wires.server2 = telegraft.device.rpcserver('bind');

		wires.server1.plugin(address1);
		wires.server2.plugin(address2);

		var counters = {
			total:0,
			server1:0,
			server2:0
		}

		wires.server1.on('request', function(req, answer){
			counters.server1++;
			answer('ok');
		})

		wires.server2.on('request', function(req, answer){
			counters.server2++;
			answer('ok');
		})

		wires.client = telegraft.device.rpcclient('connect');

		wires.client.plugin(address1);
		wires.client.plugin(address2);

		function finish(){
			setTimeout(function(){
				counters.server1.should.not.equal(0);
				counters.server2.should.not.equal(0);
				(counters.server1 + counters.server2).should.equal(counters.total);	
				done();
			}, 10)
		}

		function runrequest(){
			wires.client.send('hello');
			counters.total++;
			if(counters.total<10){
				setTimeout(runrequest, 1);
			}
			else{
				finish();
			}
		}
		
		runrequest();
		
	})

	it('Radio should get messages', function(done) {

		var address = 'tcp://127.0.0.1:5278';

		wires.server = telegraft.wire({
			type:'pub',
			direction:'bind'
		})

		wires.client = telegraft.wire({
			type:'sub',
			direction:'connect'
		})

		wires.server.plugin(address);
		wires.client.plugin(address);

		wires.client.on('message', function(frames){
			var packet = frames[frames.length-1].toString();
			packet.should.equal('apples hello');
			done();
		})

		wires.client.subscribe('');

		setTimeout(function(){
			wires.server.send('apples hello');	
		}, 10)
		
		
	})

})