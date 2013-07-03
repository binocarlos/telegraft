telegraft
=========
Telegraft is a ZeroMQ and node.js framework which manages sockets to worker processes.

## Installation

You need to have ZeroMQ on your system:

For Ubuntu:

	sudo apt-get libzmq3 libzmq3-dev

Then:

	npm install telegraft

## Usage

First - the HQ service that runs the network:

```js

var telegraft = require('telegraft');

var endpoints = {
	server:'tcp://127.0.0.1:5678',
	radio:'tcp://127.0.0.1:5679'
}

telegraft.server(endpoints);
```

Then - a worker process somewhere else on the network:

```js

var telegraft = require('telegraft');

var endpoints = {
	server:'tcp://127.0.0.1:5678',
	radio:'tcp://127.0.0.1:5679'
}

var graft = telegraft.client(endpoints);

var timeserver = graft.rpcserver({
	id:4548,
	protocol:'rpc',
	address:'tcp://127.0.0.1:56493'
})

timeserver.on('request', function (req, answer){
	answer(new Date().getTime());
})

timeserver.bind('/api/time');
```

And a different worker process on another server and mounted on a different path:

```js

var telegraft = require('telegraft');

var endpoints = {
	server:'tcp://127.0.0.1:5678',
	radio:'tcp://127.0.0.1:5679'
}

var graft = telegraft.client(endpoints);

var pingserver = graft.rpcserver({
	id:4549,
	protocol:'rpc',
	address:'tcp://127.0.0.1:56495'
})

pingserver.on('request', function (req, answer){
	answer('hello world');
})

timeserver.bind('/api/ping');
```

Cool - we now have our network running - time to make a client and speak to it (somewhere else on the network):

```js
var telegraft = require('telegraft');

var endpoints = {
	server:'tcp://127.0.0.1:5678',
	radio:'tcp://127.0.0.1:5679'
}

var graft = telegraft.client(endpoints);

/*

	a proxy will automatically route based on the path we provide
	
*/
var proxy = graft.rpcproxy();

/*

	args are strings
	
*/
var time = proxy.send('/api/time', '{arg:838}'');
var ping = proxy.send('/api/ping', '{arg:10}'');

/*

	the answers are promises
	
*/
time.then(function(val){
	console.log('the time is: ' + val);
})

ping.then(function(val){
	console.log('the ping says: ' + val);
})

```

## Running Tests

	grunt test

## Licence
MIT
