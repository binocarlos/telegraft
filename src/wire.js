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
var zmq = require('zmq');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var tools = require('./tools');

module.exports = factory;

function factory(options){
	return new Wire(options);
}

/*

	this is so the sockets close - a bit hacky
	
*/
process.on('SIGINT', function() {

	setTimeout(function(){
		process.exit();	
	}, 50)
	
})

/*

	this is otherwise node stops thinking there is no work - very hacky
	
*/
setInterval(function(){

}, 60000)


/*

	what method we call on the socket for direction
	
*/
var direction_methods = {
	bind:'bindSync',
	connect:'connect'
}

function Wire(options){
	EventEmitter.call(this);

	options = this.options = options || {};
	this.id = tools.littleid();
	this.type = options.type || 'router';
	this.direction = options.direction || 'bind';
	this._pluggedin = false;
}

util.inherits(Wire, EventEmitter);

Wire.prototype.setup = function(){
  var self = this;
	if(this._pluggedin){
		return;
	}
	var options = this.options;
	this._pluggedin = true;
	this._socket = zmq.socket(options.type);
	this._socket.identity = this.id;
	this._socket.highWaterMark = 10000;

	this._socket.on('message', function(){
    var frames = Array.prototype.slice.call(arguments, 0, arguments.length);    
    self.emit('message', frames);
	})
	return this;
}

Wire.prototype.subscribe = function(routingkey){
	if(!this._pluggedin){
		throw new Error('wire is not plugged in yet');
	}
	this._socket.subscribe(routingkey);
	return this;
}

Wire.prototype.unsubscribe = function(routingkey){
	if(!this._pluggedin){
		throw new Error('wire is not plugged in yet');
	}
	this._socket.unsubscribe(routingkey);
	return this;
}

Wire.prototype.send = function(frames){
	if(!this._pluggedin){
		throw new Error('wire is not plugged in yet');
	}

	this._socket.send(frames);
	return this;
}

Wire.prototype.plugin = function(address){
	var self = this;

	if(this.id===null || address===null){
		throw new Error('wire needs an id and port');
	}

	this.setup();
	this.emit('plugin', address);
	var pluginmethod = direction_methods[this.direction];
	this._socket[pluginmethod].apply(this._socket, [address]);
	
	return this;
}

/*

	remove the address from a combined set of endpoints
	
*/
Wire.prototype.disconnect = function(address){
	this._socket.disconnect(address);
}

Wire.prototype.unplug = function(){
	if(!this._socket){
		return;
	}

	this.emit('unplug');
	this._socket.close();
	this._socket = null;
	return this;
}