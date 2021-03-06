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
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var tools = require('./tools');
var Wire = require('./wire');
var EventEmitter2 = require('eventemitter2').EventEmitter2;
var async = require('async');

module.exports = {

	rpcserver:function(direction, id){

		var wire = Wire({
			direction:direction,
			type:'router'
		})

		var _send = wire.send;

		wire.on('message', function(frames){

			var socketid = frames[0].toString();
			var requestid = frames[1].toString();
			var payload = frames[2].toString();
			var packet = JSON.parse(payload);

			process.nextTick(function(){
				wire.emit('request', packet, function(error, answer){

					var sendpacket = answer;
					var payload = '';
					if(error){
						payload = '_error:' + error;
					}
					else{
						payload = JSON.stringify(sendpacket);	
					}
					// remove the ack interval - we have an answer
					//clearInterval(ackinterval);
					process.nextTick(function(){										
						wire.send([socketid, requestid, payload]);
					})
				})	
			})
			

		})

		return wire;
	},

	rpcclient:function(direction){

		var wire = Wire({
			direction:direction,
			type:'dealer'
		})

		var _send = wire.send;
		var callbacks = {};

		/*
		
			SEND
			
		*/
		wire.send = function(){
			var self = this;
			var frames = Array.prototype.slice.call(arguments, 0, arguments.length);


			var callback = null;

			if(typeof(frames[frames.length-1])==='function'){
				callback = frames.pop();
			}
			else{
				callback = function(){}
			}

			var requestid = tools.littleid();
			var packet_json = frames.pop();
			var packet = JSON.stringify(packet_json);

			callbacks[requestid] = callback;

			/*
			
				freak out after 10 seconds - until we get more sophisticated this is how we deal with gaps
				- i.e. we tell them oops

				this happens when sockets leave and join the network

				to do things gracefully - we need to tell the server that is leaving to stop heartbeating
				but remaing serving - then kill it like 10 seconds after

			*/
			setTimeout(function(){
				if(callbacks[requestid]){
					callbacks[requestid]('the server did not respond');
					delete(callbacks[requestid]);
				}
			}, 10000)

			process.nextTick(function(){
				try{
					_send.apply(wire, [[requestid, packet]]);	
				} catch (e){
					
				}	
			})
			
			return requestid;
		}


		/*
		
			RECEIVE
			
		*/
		wire.on('message', function(frames){
			var requestid = frames[0].toString();
			var payload = frames[1].toString();

			var callback = callbacks[requestid];

			// we can only assume that a non acked request actually made it through
			// we will want to know about these
			if(!callback){

				console.log('-------------------------------------------');
				console.log('*******************************************');
				console.log('-------------------------------------------');
				console.log('*******************************************');
				console.log('-------------------------------------------');
				console.log('*******************************************');

				console.log('NO CALLBACK!');
				console.dir(requestid);
				return;
			}
			else{
				clearInterval(callback.timeoutid);
			}
			
			if(payload.indexOf('_error:')==0){
				payload = payload.substr('_error:'.length);
				callback(payload);
			}
			else{
				try{
					var packet = JSON.parse(payload);
					callback(null, packet);
				} catch (e){
					console.dir(e);
					console.log(e.stack);
					console.error('There was an error parsing JSON')
					console.log(payload);
					callback('There was an error parsing JSON');
				}
				
			}
			delete(callbacks[requestid]);
		})


		return wire;
	},

	radioserver:function(direction){
		var wire = Wire({
			direction:direction,
			type:'pub'
		})

		var _send = wire.send;

		wire.broadcast = function(routingkey, message){
			if(!message){
				message = routingkey;
				routingkey = '*';
			}

			if(!_.isString(message)){
				message = JSON.stringify(message);
			}

			var packet = routingkey + ' ' + message;
			_send.apply(wire, [packet]);
		}

		return wire;
	},

	radioclient:function(direction){
		var wire = Wire({
			direction:direction,
			type:'sub'
		})

		var _subscribe = wire.subscribe;
		var _unsubscribe = wire.unsubscribe;

		var emitter = new EventEmitter2({
      wildcard: true
    })

    var rawkeys = {};

		wire.on('message', function(packetbuffer){
			var packetstring = packetbuffer.toString();
			var routingkey = packetstring.substr(0,packetstring.indexOf(' '));
			var messagestring = packetstring.substr(packetstring.indexOf(' ')+1);
			var message = messagestring.charAt(0)=='{' ? JSON.parse(messagestring) : messagestring;

			emitter.emit(routingkey, message, routingkey);
			emitter.emit('_all', message, routingkey);

			async.forEach(_.keys(rawkeys), function(rawkey){
				if(routingkey.indexOf(rawkey)===0){
					_.each(rawkeys[rawkey], function(fn){
						fn(message, routingkey);
					})
				}
			})
		})

		wire.rawsubscribe = function(routingkey, fn){
			var arr = rawkeys[routingkey] || [];
			arr.push(fn);
			rawkeys[routingkey] = arr;
			_subscribe.apply(wire, [routingkey]);
		}

		wire.rawunsubscribe = function(routingkey, fn){
			var arr = rawkeys[routingkey] || [];
			arr = _.without(arr, fn);
			rawkeys[routingkey] = arr;
			if(arr.length<=0){
				_unsubscribe.apply(wire, [routingkey]);	
			}
		}

		wire.subscribe = function(routingkey, fn){
			if(!fn){
				fn = routingkey;
				routingkey = '*';
			}
			routingkey = (routingkey===null || routingkey==='') ? '*' : routingkey;
			emitter.on(routingkey==='*' ? '_all' : routingkey, fn);
			_subscribe.apply(wire, [routingkey.replace(/\*$/, '')]);
			return this;
		}

		wire.unsubscribe = function(routingkey, fn){
			
			var emitterkey = routingkey==='*' ? '_all': routingkey;

			if(fn){
				emitter.off(emitterkey, fn);
			}
			else{
				emitter.removeAllListeners(emitterkey);	
			}
			var listeners = emitter.listeners(emitterkey);
			if(listeners.length<=0){
				_unsubscribe.apply(wire, [routingkey.replace(/\*$/, '')]);	
			}

			return this;
		}

		return wire;
	}
}