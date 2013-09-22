#TESTS = tests/*.js tests/managers/*.js  tests/models/*.js
TESTS = tests/*.js tests/managers/*.js  tests/models/bip.js
REPORTER = dot

install:
	npm install
	mkdir -p data/channels
	mkdir -p data/cdn/img/av
	mkdir -p data/cdn/img/icofactory
	mkdir -p data/cdn/img/pods	
	./tools/setup.js

clean:
	rm ./config/*.json

# node-inspector ::
# --debug
# --debug-brk
test:
	@NODE_ENV=testing ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		--timeout 600 \
		$(TESTS)

test-cov: lib-cov
	@CONNECT_COV=1 $(MAKE) test REPORTER=html-cov > coverage.html

