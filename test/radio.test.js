var telegraft = require('../src');
var async = require('async');
var _ = require('lodash');

describe('radio', function(){

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

	it('should broadcast and receive', function(done){

		wires.hqserver = telegraft.server(endpoints);
		wires.hqclient = telegraft.client(endpoints);

		wires.hqclient.radio.subscribe('apples', function(packet, route){
			packet.value.should.equal(10);
			route.should.equal('apples');
			done();
		})

		setTimeout(function(){
			wires.hqclient.radio.broadcast('apples', {
				value:10
			})
		}, 10)
		

	})

	it('should handle wildcard routes', function(done){

		wires.hqserver = telegraft.server(endpoints);
		wires.hqclient = telegraft.client(endpoints);

		wires.hqclient.radio.subscribe('fruit.*', function(packet, route){
			packet.value.should.equal(10);
			route.should.equal('fruit.apples');
			done();
		})

		setTimeout(function(){
			wires.hqclient.radio.broadcast('fruit.apples', {
				value:10
			})
		}, 10)

	})

})