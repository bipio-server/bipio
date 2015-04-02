var bootstrap = require(__dirname + '/../../src/bootstrap'),
dao = bootstrap.app.dao,
assert = require('assert'),
should = require('should'),
uuid = require('node-uuid'),
accountInfo;

describe('bootstrap', function() {
    it('can bootstrap', function(done) {
        this.timeout(0);
        dao.on('ready', function() {
            done();
        });
    });

    it('can copy a collection', function(done) {
    	dao.copyTo('bips', 'pod_syndication_dups', function() {
console.log(arguments);
    		done();
    	})
    });
});