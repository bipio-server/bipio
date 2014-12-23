process.HEADLESS = true;

var path = require('path'),
	app = require(__dirname + '/../../src/bootstrap').app,
	targetConfig = path.resolve( process.env.NODE_CONFIG_DIR || path.join(__dirname, '/../../config/'), 'test.json'),
	migration = require(__dirname + '/../../migrations/0.3.0'),
	assert = require('assert'),
	should = require('should');

describe('Migration', function() {
	it('Successfully migrates to v0.3.0', function() {
		if (process.env.NODE_ENV === 'test') {
			it('Setup', function(done){
				var config = JSON.parse(fs.readFileSync(targetConfig));
				if (!config.hasOwnProperty("cdn")) config.cdn = "test/cdn/dir";
				if (!config.hasOwnProperty("datadir")) config.datadir = "test/data/dir";
				fs.writeFile(targetConfig, JSON.stringify(config, null, 2), done);
			});

			it('Creates a pod_syndication_track_subscribe entry with current timestamp', function(done) {
				app.dao.create(app.dao.modelFactory('pod_syndication_track_subscribe', {
                   owner_id : 'test',
                   channel_id : 'test',
                   created: new Date().getTime(),
                   guid : 'test',
                   bip_id : 'test',
                   last_update : 'test'
                 }),
				function(err) {
					if (err) throw new Error(err);
					done();	
				});
			});

			it('Creates a pod_syndication_track_subscribe entry with 90-day-old timestamp', function(done) {
				app.dao.create(app.dao.modelFactory('pod_syndication_track_subscribe', {
                   owner_id : 'test',
                   channel_id : 'test',
                   created: new Date().getTime() - (90 * 24 * 60 * 60 * 1000),
                   guid : 'test',
                   bip_id : 'test',
                   last_update : 'test'
                 }),
				function(err) {
					if (err) throw new Error(err);
					done();
				});
			});

			it('Creates a pod_soundcloud_track_favorite entry with current timestamp', function(done) {
				app.dao.create(app.dao.modelFactory('pod_soundcloud_track_favorite', {
                   owner_id : 'test',
                   channel_id : 'test',
                   created: new Date().getTime(),
                   track_id : 'test',
                   bip_id : 'test',
                   last_update : 'test'
                 }),
				function(err) {
					if (err) throw new Error(err);
					done();	
				});
			});

			it('Creates a pod_soundcloud_track_favorite entry with 90-day-old timestamp', function(done) {
				app.dao.create(app.dao.modelFactory('pod_soundcloud_track_favorite', {
                   owner_id : 'test',
                   channel_id : 'test',
                   created: new Date().getTime() - (90 * 24 * 60 * 60 * 1000),
                   track_id : 'test',
                   bip_id : 'test',
                   last_update : 'test'
                 }),
				function(err) {
					if (err) throw new Error(err);
					done();
				});
			});

			it('Runs the migration', function(done) {
				migration.run(app, targetConfig, function(err) {
					if (err) throw new Error(err);
					done();
				});
			});

			it('Checks for the existence of 1 pod_syndication_dup entry', function(done) {
				app.dao.findFilter('pod_syndication_dup', {}, function(err, result) {
					if (err) throw new Error(err);
					result.should.exist()
					result.should.have.length(1);
					done();
				});
			});

			it('Checks for the existence of 1 pod_soundcloud_dup entry', function(done) {
				app.dao.findFilter('pod_soundcloud_dup', {}, function(err, result) {
					if (err) throw new Error(err);
					result.should.exist()
					result.should.have.length(1);
					done();
				});
			});

			it('Checks test.json for removal of `cdn` and `datadir` properties', function(done) {
				var newConfig = JSON.parse(fs.readFileSync(targetConfig));
				newConfig.should.not.have.property("cdn");
				newConfig.should.not.have.property("datadir");
			});

			it('Cleans up test data', function(done) {
				app.dao.removeFilter('pod_syndication_dup', {}, function(err, result) {
					if (err) throw new Error(err);
					app.dao.findFilter('pod_soundcloud_dup', {}, function(err, result) {
						if (err) throw new Error(err);
						done();
					});
				});
			});
		}
		else {
			throw new Error("NODE_ENV must be set to `test` to run migration tests! Please run `export NODE_ENV=test` and then `make install`. During install, set the name of your db to something OTHER THAN `bipio` (so as not to interfere with any existing installations). Then re-run this migration test.");
		}
	});
});