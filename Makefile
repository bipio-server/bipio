TESTS = tests/*.js tests/managers/*.js
REPORTER = dot



install:
	#npm install
	./tools/setup.js

clean:
	rm ./config/*.json

test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		--timeout 600 \
		$(TESTS)

test-cov: lib-cov
	@CONNECT_COV=1 $(MAKE) test REPORTER=html-cov > coverage.html

