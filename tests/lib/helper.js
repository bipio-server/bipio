process.HEADLESS = true

var bootstrap = require(__dirname + '/../../src/bootstrap'),
  assert = require('assert'),
  should = require('should');

describe('helper', function() {
  it('can get the bipio favicon', function(done) {
    app.helper.resolveFavicon('https://bip.io/docs/pods', function(err, url, suffix, hashedIco) {
      url.should.equal('https://bip.io/favicon.ico')
      done();
    });

  });

  // arbitrary - this could change at any time :D :D
  it('can get icon from link in page', function(done) {
    app.helper.resolveFavicon('https://evernote.com/', function(err, url, suffix, hashedIco) {
      url.should.equal('https://evernote.com/media/img/favicon.ico')
      done();
    });
  });
});

