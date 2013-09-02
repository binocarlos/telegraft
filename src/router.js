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

function factory(hqmode){
	return new Router(hqmode);
}

function Router(hqmode){
	EventEmitter.call(this);

	var self = this;

	this.id = tools.littleid();

	/*
	
		keep a cache of the resolved routes

		reset upon every addition and removal
		
	*/
	this.hqmode = hqmode;
	this.cache = {};

	this.state = {
		lastseen:{},
		workers:{},
		routes:{}
	};


	this.setup_monitor();
	

}

util.inherits(Router, EventEmitter);


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

		if(workers && workers.length>0){
			var results = {
				matchedroute:finalroute,
				workers:workers
			}

			self.cache[route] = results;
			return results;	
		}
		else{
			return {
				matchedroute:null,
				workers:[]
			}
		}

		
	}

	// hit first time
	if(workerids){
		return mapids(workerids, route);
	}

	/*
	
		we did not find the route right away - work backwards splitting by '/'

		this means that:

			/my/db/subroute/123

		will match:

			/my/db/subroute

		and not match:

			/my/db
			
	*/
	var parts = route.split('/');
	while(!workerids && parts.length>0){
		parts.pop();
		workerids = self.state.routes[parts.join('/') || '/'];
	}

	var finalroute = parts.join('/') || '/';

	return mapids(workerids, finalroute);
}

Router.prototype.unplug = function(){
	for(var intervalid in this.state.intervals){
		clearInterval(intervalid);
	}
	this.cache = {};

	this.state = {
		lastseen:{},
		workers:{},
		routes:{}
	};
}

Router.prototype.refresh = function(worker){
	this.state.lastseen[worker.id] = new Date().getTime();
}

Router.prototype.setup_monitor = function(){
	var self = this;
	/*
	
		check the connections each second
		
	*/
	self.intervalid = setInterval(function(){

		/*
		
			loop each worker and check that we have had a heartbeat within the past 2 seconds
			
		*/
		_.each(self.state.workers, function(worker, id){
			var lastseen = self.state.lastseen[worker.id];
			var nowtime = new Date().getTime();
			var gap = nowtime - lastseen;

			if(gap>2000){
				self.removeworker(worker);
			}
		})

	}, 1000)
}

Router.prototype.heartbeat = function(packet){
	var self = this;
	var routes = packet.routes;
	var worker = packet.worker;

	/*
	
		we check each time if we have not see this router + worker

		this is the auto-announce
		
	*/
	_.each(routes, function(v, route){
		var seenroutes = self.state.routes[route] || {};

		var seen = seenroutes[worker.id] ? true : false;

		if(!seen){
			self.addroute(route, worker);
		}
	})

	self.state.lastseen[worker.id] = new Date().getTime();
}

Router.prototype.addroute = Router.prototype.add = function(route, worker){
	
	
	this.cache = {};
	this.state.workers[worker.id] = worker;
	
	/*
	
		the map of workers we have for the route

		{
			"/my/db":{
				1234:{},
				5678:{}
			}
		}

	*/
	var workerids = this.state.routes[route] || {};
	workerids[worker.id] = new Date().getTime();
	this.state.routes[route] = workerids;

	this.emit('added', route, worker);
	this.emit('added.' + route, route, worker);

	return this;
}

Router.prototype.removeworker = function(remworker){
	var self = this;
	this.cache = {};

	var worker = this.state.workers[remworker.id];

	_.each(this.state.routes, function(workers, route){
		if(workers[remworker.id]){
			var newworkers = {};
			for(var wid in workers){
				if(wid!=remworker.id){
					newworkers[wid] = workers[wid];
				}
			}
			self.state.routes[route] = newworkers;
			self.emit('removed', route, remworker);
			self.emit('removed.' + route, route, remworker);		
		}
	})

	delete(this.state.workers[remworker.id]);
	delete(this.state.lastseen[remworker.id]);

	
	return this;
}