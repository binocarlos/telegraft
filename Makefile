TESTS = test/*.js
REPORTER = spec
#REPORTER = dot

check: test

test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		--timeout 300 \
		--require should \
		--growl \
		$(TESTS)

browserify:
	browserify src/index.js > build/selector.js

uglify: browserify
	uglifyjs build/selector.js > build/selector.min.js

build: uglify

install:
	npm install

.PHONY: test