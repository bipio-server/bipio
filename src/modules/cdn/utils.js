var mkdirp = require('mkdirp'),
  path = require('path');

module.exports = {
  HTTPFormHandler : function() {
    return multer({
      dest : this.tmpDir,
      onFileUploadComplete : function(file) {
      file.localpath = file.path;
      file.name = file.originalname;
      file.type = file.mimetype;
      }
    });
  },

  parse_path: function(relPath, root, next) {
    var relPathRegexp = /\.\./g,
      mode = null, // @todo permissions mask?
      localPath = path.resolve( (root + '/' + relPath).replace(relPathRegexp, '')),
      basePath = path.dirname(localPath);

    mkdirp(basePath, mode, function(err) {
      next(err, localPath);
    });
  },

  gzip_compress: function() {
    console.log("Hi");
  },

  get_filename_from_path: function(path) {
    return path.split('\\').pop().split('/').pop();
  },

  normalize: function(filePath, next) {
    var self = this;
    fs.stat(filePath, function(err, stats) {
      if (err) next(err);
      next(null, {
        size : stats.size,
        localpath : filePath,
        name : self.get_filename_from_path(filePath),
        type : mime.lookup(filePath),
        encoding : 'binary'
        });
    });
  }
}
