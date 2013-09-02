var telegraft = require('../src');
var async = require('async');
var _ = require('lodash');

describe('router', function(){

	it('should add endpoints and then find them again', function(){

		var router = telegraft.router();

		router.add('/hello', {
			id:10
		})

		router.add('/hello', {
			id:11
		})

		router.add('/', {
			id:12
		})

		var results1 = router.search('/hello/123');
		results1.workers.length.should.equal(2);
		results1.workers[0].id.should.equal(10);
		results1.workers[1].id.should.equal(11);

		var results2 = router.search('/other');

		results2.workers.length.should.equal(1);
		results2.workers[0].id.should.equal(12);

	})

	it('should emit events against paths', function(){

		var counter = 0;

		var router = telegraft.router();

		router.on('added./hello', function(){
			counter++;
		})

		router.on('removed./hello', function(){
			counter++;
		})

		router.add('/hello', {
			id:10
		})

		router.add('/hello', {
			id:11
		})

		router.add('/', {
			id:12
		})


		router.removeworker({
			id:11
		})


		counter.should.equal(3);
		var results = router.search('/hello');
		results.workers.length.should.equal(1);

	})

})