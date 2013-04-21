/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

/*
	Module dependencies.
*/
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var Device = require('./device');
var Router = require('./router');
var Mesh = require('./mesh');
var Q = require('q');
var _ = require('lodash');

module.exports = factory;

function factory(options){
	return new HQClient(options);
}

function HQClient(options){
	EventEmitter.call(this);

	var self = this;

	this.map = {};

	this.client = Device.rpcclient('connect');
	this.radio = Device.radioclient('connect');

	this.client.plugin(options.server);
	this.radio.plugin(options.radio);

	this.router = Router();

	this.radio.subscribe('worker.arrive', function(packet, routingkey){
		self.router.add(packet.route, packet.worker);
	})

	this.radio.subscribe('worker.leave', function(packet, routingkey){
		self.router.remove(packet.route, packet.worker);
	})

	this.initializestate();
}

util.inherits(HQClient, EventEmitter);

HQClient.prototype.unplug = function(){
	this.client.unplug();
	this.radio.unplug();
	return this;
}

HQClient.prototype.initializestate = function(){
	var self = this;
	var answer = this.client.send({
		method:'state'
	})

	answer.then(function(packet){
		var state = packet.result;
		self.router.initialize(state);
	})
}

/*

	mount an RPC server on the network

	this registers the server with HQ and returns a wire
	
*/
HQClient.prototype.rpcserver = function(route, worker){
	var server = Device.rpcserver('bind');
	server.plugin(worker.address);

	this.register_service(route, worker);

	return server;
}

/*

	mount an RPC server on the network

	this registers the server with HQ and returns a wire
	
*/
HQClient.prototype.rpcclient = function(route){

	var mesh = new Mesh({
		wire:Device.rpcclient('connect'),
		router:this.router,
		route:route,
		mode:'combine'
	})

	return mesh;
}

/*

	returns a function that will accept a route, packet and return a promise with the result of the query

	the proxy will use the router to generate the socket if needed

	this gives a way to transparently communicate to any part of the network
	
*/
HQClient.prototype.rpcproxy = function(){

	var self = this;

	var meshcache = {};

	var proxy = function(){}

	proxy.send = function(route, packet){

		var deferred = Q.defer();

		function usemesh(mesh){
			mesh
				.send(packet)
				.then(function(packet){
					deferred.resolve(packet);
				}, function(reason){
					deferred.reject(reason);
				})
		}

		process.nextTick(function(){

			/*
		
				do a search for workers
				
			*/
			var result = self.router.search(route);

			/*
			
				we have no routes
				
			*/
			if(result.workers.length<=0){
				deferred.reject(new Error("no workers found"));
			}
			else{
				var matchedroute = result.matchedroute;

				/*
				
					we already have the wire for this route cached
					
				*/
				if(meshcache[matchedroute]){
					usemesh(meshcache[matchedroute]);
				}
				/*
				
					create a new mesh for this route

					get it to self delete upon emptying
					
				*/
				else{
					var mesh = new Mesh({
						wire:Device.rpcclient('connect'),
						router:self.router,
						route:matchedroute,
						mode:'combine'
					})

					meshcache[matchedroute] = mesh;

					mesh.on('empty', function(){
						delete(meshcache[matchedroute]);
					})

					setTimeout(function(){
						usemesh(mesh);
					}, 20)
				}
			}
		})

		return deferred.promise;
	}

	proxy.unplug = function(){
		_.each(meshcache, function(mesh){
			mesh.unplug();
		})
		meshcache = {};
	}

	return proxy;
	
}

/*

	a worker has arrived
	
*/
HQClient.prototype.register_service = function(route, worker){
	var self = this;
	var answer = this.client.send({
		method:'arrive',
		route:route,
		worker:worker
	})

	answer.then(function(packet){
		var result = packet.result;
		// worker has been added
	})
}