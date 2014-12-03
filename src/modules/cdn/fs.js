var fs = require('fs'),
  path = require('path')
  regex = /[^\\/]+\.[^\\/]+$/,
  multer = require('multer'),
  mime = require('mime');

function FsProto(options) {
  this.dataDir = options.data_dir;

  this.tmpDir = options.data_dir + '/tmp'
  this.permDir = options.data_dir + '/perm'

  this.cdnDir = options.cdn_dir;
};

FsProto.prototype = {

  /**
   * Saves a file to data_dir
   *
   * @param string fileName
   * @param stream readStream
   * @param object options
   * @param function callback
   */
  save: function() {
    var self = this;
    if (arguments[0] && arguments[1] && typeof arguments[0] === 'string' && typeof arguments[arguments.length-1] === 'function' && self.parse_path(arguments[0], this.dataDir)) {
      var dstFileName = path.resolve(self.permDir + '/' + arguments[0]),
        next = arguments[arguments.length-1],
        readStream = ((typeof arguments[1] === 'string') ?  fs.createReadStream(arguments[1]) : arguments[1]);

      var writeStream = fs.createWriteStream(dstFileName);

      writeStream.on('error', next);

      writeStream.on('finish', function(err) {
        if (err) next(err);
        self.normalize(dstFileName, next);
      });

      readStream.pipe(writeStream);
    }
  },

  get: function() {
    var self = this;
    if (arguments[0] && typeof arguments[0] === 'object' && typeof arguments[arguments.length-1] === 'function') {
      var srcFile = arguments[0],
        next = arguments[arguments.length-1];

      var readStream = fs.createReadStream(srcFile.localpath);

      next(null, srcFile, readStream);
    }
  },

  // multipart/form-data handler middleware
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

  list: function() {
    if (arguments[0] && typeof arguments[0] === 'string' && typeof arguments[arguments.length-1] === 'function') {

      var filePath = arguments[0],
        next = arguments[arguments.length-1];

      if (filePath.match(regex)) next("list() cannot be called on files, only directories.");

      fs.exists(filePath, function(exists) {
          if (exists) {
            fs.readdir(filePath, function (err, files) {
              if (err) next(err);

              var results = [];

              files.map(function (file) {
                  return path.join(filePath, file);
              }).filter(function (file) {
                  return fs.statSync(file).isFile();
              }).forEach(function (file) {
                results.push(file.replace(filePath, ""));
              });

              next(null, results)
          });
          }
          else {
            next("Directory does not exist.");
          }
      });
    }
  },

  remove: function() {
    if (arguments[0] && typeof arguments[0] === 'string' && typeof arguments[arguments.length-1] === 'function') {
      var filePath = arguments[0],
        next = arguments[arguments.length-1];
      fs.exists(filePath, function(exists) {
          if (exists) {
            fs.unlink(filePath, next);
          }
          else {
            next("File does not exist.");
          }
      });
    }
  },

  find: function() {
    if (arguments[0] && typeof arguments[0] === 'string' && typeof arguments[arguments.length-1] === 'function') {
      var filePath = arguments[0],
        next = arguments[arguments.length-1];
      fs.exists(filePath, function(exists) {
          if (exists) {
            fs.stat(filePath, function(err, file) {
            if (err) next(err);
            next(null, file);
          });
          }
          else {
            next("File does not exist.");
          }
      });
    }
  },

  parse_path: function(path, root) {
    var directories = path.split('/'),
      directory = directories.shift(),
      root = ( root || '' ) + directory + '/',
      self = this;

    if (directory.match(regex)) return true;

    try {
      fs.mkdirSync(root);
    } catch (err) {
      if (!fs.statSync(root).isDirectory()) throw new Error(err);
    }

    return !directories.length || self.parse_path(directories.join('/'), root);
  },

  compress: function() {

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
  },

  normalize_sync: function(filePath) {
    return {
        size : fs.statSync(filePath).size,
        localpath : filePath,
        name : self.get_filename_from_path(filePath),
        type : mime.lookup(filePath),
        encoding : 'binary'
      }
  }

};

module.exports = FsProto;