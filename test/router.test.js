var telegraft = require('../src');
var async = require('async');
var _ = require('lodash');

describe('router', function(){

	it('should add endpoints and then find them again', function(){

		var router = telegraft.router();

		router.add('warehouse:/hello', {
			id:10
		})

		router.add('warehouse:/hello', {
			id:11
		})

		router.add('warehouse:/', {
			id:12
		})

		var results1 = router.search('warehouse:/hello/123');
		results1.length.should.equal(2);
		results1[0].id.should.equal(10);
		results1[1].id.should.equal(11);

		var results2 = router.search('warehouse:/other');
		results2.length.should.equal(1);
		results2[0].id.should.equal(12);

	})

	it('should emit events against paths', function(){

		var counter = 0;

		var router = telegraft.router();

		router.on('added.warehouse:/hello', function(){
			counter++;
		})

		router.on('removed.warehouse:/hello', function(){
			counter++;
		})

		router.add('warehouse:/hello', {
			id:10
		})

		router.add('warehouse:/hello', {
			id:11
		})

		router.add('warehouse:/', {
			id:12
		})


		router.remove('warehouse:/hello', {
			id:11
		})

		counter.should.equal(3);
		var results = router.search('warehouse:/hello');
		results.length.should.equal(1);

	})

})