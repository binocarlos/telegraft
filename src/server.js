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
var _ = require('lodash');
var Router = require('./router');
var Device = require('./device');

module.exports = factory;

function factory(options){
	return new HQServer(options);
}

function HQServer(options){
	EventEmitter.call(this);

	var self = this;

	this.router = Router();

	this.server = Device.rpcserver('bind');
	this.radio = Device.radioserver('bind');

	this.server.on('request', _.bind(this.handle, this));
		
	this.server.plugin(options.server);
	this.radio.plugin(options.radio);
}

util.inherits(HQServer, EventEmitter);

HQServer.prototype.unplug = function(){
	this.server.unplug();
	this.radio.unplug();
	return this;
}

HQServer.prototype.handle = function(packet, answer){

	/*
	
		basic JSON-RPC implementation
		
	*/
	
	var method = packet.method;

	if(this[method]){
		this[method].apply(this, [packet, answer]);
	}
	else{
		answer({
			error:method + ' not found'
		})
	}

	return this;
}

/*

	get a full map of all workers
	
*/
HQServer.prototype.state = function(packet, answer){
	answer({
		result:this.state
	})
}

/*

	a worker has arrived
	
*/
HQServer.prototype.arrive = function(packet, answer){
	this.router.add(packet.route, packet.worker);
	this.radio.broadcast('worker.arrive', {
		route:packet.route,
		worker:packet.worker
	})
	answer({
		result:true
	})
}

/*

	a worker has left
	
*/
HQServer.prototype.leave = function(packet, answer){
	this.router.remove(packet.route, packet.worker);
	this.radio.broadcast('worker.leave', {
		route:packet.route,
		worker:packet.worker
	})
	answer({
		result:true
	})
}