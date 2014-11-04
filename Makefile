# TESTS = tests/*.js tests/managers/*.js  tests/models/*.js
# TESTS = tests/*.js tests/managers/*.js
TESTS = tests/models/channel.js
REPORTER = dot

install:
	./tools/git-setup.sh
	@SYSTEM_TZ=`/usr/bin/env date +%Z` ./tools/setup.js

test-install:
	@NODE_ENV=testing ./tools/setup.js

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

