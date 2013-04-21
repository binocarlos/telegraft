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
var tools = require('./tools');

var Device = require('./device');

module.exports = factory;

function factory(){
	return new Router();
}

function Router(){
	EventEmitter.call(this);

	var self = this;

	/*
	
		keep a cache of the resolved routes

		reset upon every addition and removal
		
	*/
	this.cache = {};

	this.state = {
		workers:{},
		routes:{}
	};
}

util.inherits(Router, EventEmitter);

Router.prototype.addroute = function(route, worker){
	var workerids = this.state.routes[route] || {};
	workerids[worker.id] = new Date().getTime();
	var routes = worker.routes || {};
	routes[route] = true;
	worker.routes = routes;
	this.state.routes[route] = workerids;
	this.emit('added', route, worker);
	this.emit('added.' + route, route, worker);
	return this;
}

Router.prototype.removeroute = function(route, worker){
	var workerids = this.state.routes[route] || {};
	delete(workerids[worker.id]);
	var routes = worker.routes || {};
	delete(routes[route]);
	worker.routes = routes;
	this.state.routes[route] = workerids;
	this.emit('removed', route, worker);
	this.emit('removed.' + route, route, worker);
	return this;
}

Router.prototype.initialize = function(state){

	if(!state){
		return;
	}

	this.state = state;
}

Router.prototype.processroute = function(route){
	if(route.charAt(route.length-1)===':'){
		route += '/';
	}

	return route;
}

Router.prototype.search = function(route){
	var self = this;

	if(this.cache[route]){
		return this.cache[route];
	}

	var workerids = this.state.routes[route];

	function mapids(ids, finalroute){
		var workers = _.map(_.keys(ids || {}), function(id){
			return self.state.workers[id];
		})

		var results = {
			matchedroute:finalroute,
			workers:workers
		}

		self.cache[route] = results;
		return results;
	}

	if(workerids){
		return mapids(workerids);
	}

	var parts = route.split('/');
	while(!workerids && parts.length>0){
		parts.pop();
		workerids = self.state.routes[self.processroute(parts.join('/'))];
	}

	var finalroute = parts.join('/');

	return mapids(workerids, finalroute);
}

Router.prototype.add = function(route, worker){
	this.cache = {};
	this.state.workers[worker.id] = worker;
	this.addroute(route, worker);
	return this;
}

Router.prototype.remove = function(route, worker){
	this.cache = {};
	this.removeroute(route, worker);
	return this;
}