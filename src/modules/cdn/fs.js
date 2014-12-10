var fs = require('fs'),
  path = require('path')
  regex = /[^\\/]+\.[^\\/]+$/,
  multer = require('multer'),
  mime = require('mime');

function FsProto(options) {
  if (options && options.data_dir) {
    this.dataDir = options.data_dir;

    this.tmpDir = options.data_dir + '/tmp';
    this.permDir = options.data_dir + '/perm';
  }

  if (options && options.cdn_dir) this.cdnDir = options.cdn_dir;
};

FsProto.prototype = {

  /*
   * Saves a file from a string or readStream, and returns file object
   *
   * dest: string or object
   * source: string or readStream
   * options: object [optional]
   * next: function(string err, object file)
   */
  save: function() {
    var self = this,
      dest = arguments[0],
      source = arguments[1],
      options = (arguments[2] ? arguments[2] : null),
      next = arguments[arguments.length-1],
      destPath = ((typeof dest === 'object') ? dest.localpath : dest);

    self.utils.parse_path(
      destPath,
      (self.dataDir ? self.dataDir : null),
      function(err, localPath) {
        if (err) {
          next(err);
        } else {
          var readStream = ((typeof source === 'string') ? fs.createReadStream(source) : source),
            writeStream = fs.createWriteStream(localPath);

          writeStream.on('error', next);
          writeStream.on('finish', function(err) {
            if (err) {
              next(err)
            } else {
              self.utils.normalize(localPath, next);
            }
          });

          readStream.pipe(writeStream);
        }
      }
    );
  },

  /*
   * Gets a file from a fileStruct and returns a new fileStruct and readStream
   *
   * source: string or object
   * next: function(string err, object file, readStream)
   */

  get: function() {

    var self = this,
      source = arguments[0],
      next = arguments[arguments.length-1],
      srcPath = ((typeof source === 'object') ? source.localpath : source),
      readStream = fs.createReadStream(srcPath);

    self.utils.normalize(srcPath, function(err, struct) {
      next(err, struct, readStream);
    });
  },

  /*
   * Lists all files in directory path
   *
   * file: string or object
   * next: function(string err, array files)
   */

  list: function() {

    var file = arguments[0],
      filePath = ((typeof file === 'object') ? file.localpath : file),
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
            (self.utils.normalize(filePath, function(err, fileStruct) {
              results.push(fileStruct)
            }))(results, filePath)
          });

          next(null, results)
        });
        }
        else {
        next("Directory does not exist.");
        }
      });
  },

  /*
   * Removes file from filesystem
   *
   * file: string or object
   * next: function(string err, boolean success)
   */

  remove: function() {

    var file = arguments[0],
      filePath = ((typeof file === 'object') ? file.localpath : file),
      next = arguments[arguments.length-1];

    fs.exists(filePath, function(exists) {
      if (exists) fs.unlink(filePath, next);
      else next("File does not exist.");
    });
  },

  /*
   * Finds file in filesystem
   *
   * file: string or object
   * next: function(string err, object file)
   */

  find: function() {

    var file = arguments[0],
      filePath = ((typeof file === 'object') ? file.localpath : file),
      next = arguments[arguments.length-1];

    fs.exists(filePath, function(exists) {
      if (exists) self.utils.normalize(filePath, next);
      else next("File does not exist.");
    });
  },


  utils: require('./utils')

};

module.exports = FsProto;
