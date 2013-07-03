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
var deck = require('deck');

module.exports = factory;

function factory(options){
	return new Mesh(options);
}

/*

	an abstraction for either a multiplex socket (dealer)
	or a failover socket - always one of a few active

	options:

		wire
		router
		route
		mode
	
*/
function Mesh(options){
	var self = this;
	EventEmitter.call(this);
	options = options || {};

	if(!options.wire){
		throw new Error('a mesh needs a wire')
	}
	this.wire = options.wire;
	this.router = options.router;
	this.route = options.route;
	this.mode = options.mode;

	this.send = _.bind(this.wire.send, this.wire);
	this.wire.setup();

	this.connected = {};
	this.available = {};

	var initial = this.router.search(this.route);

	_.each(initial.workers, function(worker){
		self.addworker(worker);
	})

	this.router.on('added.' + this.route, function(route, worker){
		self.addworker(worker);
	})

	this.router.on('removed.' + this.route, function(route, worker){
		self.removeworker(worker);
	})
}

util.inherits(Mesh, EventEmitter);

/*

	A worker has arrived
	
*/
Mesh.prototype.addworker = function(worker){

	this.available[worker.id] = worker;

	if(this.mode=='combine'){
		this.connected[worker.id] = worker;
		this.wire.plugin(worker.address);	
	}
	else{
		var counter = _.keys(this.connected);
		if(counter<=0){
			this.wire.plugin(worker.address);
			this.connected[worker.id] = worker;
		}
	}
}

/*

	a worker has died remove the connection
	
*/
Mesh.prototype.removeworker = function(worker){

	delete(this.available[worker.id]);
	delete(this.connected[worker.id]);

	if(this.mode=='singular'){
		var counter = _.keys(this.connected);
		if(counter<=0 && _.keys(this.available).length>0){
			var newworker = this.available[deck.pick(_.keys(this.available))];
			this.wire.plugin(newworker.address);
			this.connected[newworker.id] = newworker;
		}
	}

	if(_.keys(this.available).length<=0){
		this.emit('empty');
	}
}

Mesh.prototype.unplug = function(){
	this.wire.unplug();
	return this;
}