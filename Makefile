# TESTS = tests/*.js tests/managers/*.js  tests/models/*.js
# TESTS = tests/*.js tests/managers/*.js
# TESTS = tests/models/channel.js
TESTS = tests/migrations/0.3.0.js
REPORTER = dot

install:
	./tools/git-setup.sh
	mkdir -p config/credentials
	mkdir logs
	@SYSTEM_TZ=`/usr/bin/env date +%Z` ./tools/setup.js

test-install:
	@NODE_ENV=test ./tools/setup.js

clean:
	rm ./config/*.json

# node-inspector ::
# --debug
# --debug-brk
test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		--timeout 10000 \
		$(TESTS)

test-cov: lib-cov
	@CONNECT_COV=1 $(MAKE) test REPORTER=html-cov > coverage.html

