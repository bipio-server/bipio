var fs = require('fs'),
  imagemagick = require('imagemagick'),
  multer = require('multer'),
  mime = require('mime'),
  path = require('path'),
  regex = /[^\\/]+\.[^\\/]+$/,
  Stream = require('stream')
  zlib = require('zlib');

function FsProto(options) {
  this.dataDir = path.resolve((0 === options.data_dir.indexOf('/') ? options.data_dir : options.basePath + '/../' + options.data_dir));
  this.tmpDir = options.data_dir + '/tmp';
  this.permDir = options.data_dir + '/perm';
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
      buffer = ((arguments[1] instanceof Buffer) ? arguments[1] : null)
      options  = (arguments[2] ? arguments[2] : null),
      next = arguments[arguments.length-1],
      compress = options && options.compress,
      append = options && options.append,
      header = options && options.header,
      write = options && options.write,
      destPath = ((typeof dest === 'object') ? dest.localpath : dest),
      rootDir = ((options && options.persist) ? self.permDir : self.tmpDir),
      writeOptions = {};

    if (compress) {
      destPath += '.zip';
    }

    if (append) {
      writeOptions.flags = 'a';
    }

    if (buffer) {
      var readStream = null
    }
    else {
      var readStream = ((typeof source === 'string') ? fs.createReadStream(source) : source);
      readStream.pause();
    }

    self.utils.parse_path(destPath, rootDir, function(err, path) {
 
 	if (err) {
        next(err);
      }

      (function(next) {
        var writeStream = fs.createWriteStream(path, writeOptions);

        if (header) {
          var headerStream = new Stream();
          headerStream.on('data', function(data) {
            writeStream.write(data);
          });

          headerStream.emit('data', options.header);
        }

        writeStream.on('error', next);
        writeStream.on('finish', function(err) {

          if (err) next(err);
          else self.utils.normalize(path, next);
          });

        if (compress) {
          var gzip = zlib.createGzip();
          readStream.pipe(gzip).pipe(writeStream);
          readStream.resume();
        }
        else if (readStream) {
          readStream.pipe(writeStream);
          readStream.resume();
        }

        if (buffer) {
          writeStream.write(buffer.toString(), null, function() {
            writeStream.end();
          });
        }
      })(next);


    });
  },


  /*
   * Saves an avatar file
   *
   * owner_id: string
   * source: string. image location | url
   * dstPath: string
   * next: function(string err, string dstFile)
   */
  saveAvatar: function() {
	var self = this,
		owner_id = arguments[0],
		source  = arguments[1],
		dstPath  = arguments[2],
		next = arguments[3];
		
		var dstFile = dstPath + owner_id + '.png';

	self.save(dstFile, source, { persist : true }, function(err, file) {

			var options = {
				srcPath : file.localpath,
				dstPath : file.localpath.replace(/\.[a-z]{0,4}$/i, '.png'),
				format: 'png',
				height: 125,
				width: 125
			};

			imagemagick.convert([options.srcPath, '-resize', '125x125', options.dstPath], function(err, result) {
				
				if (err) next(err);
				next(err, dstFile);
			});
	
	});

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
      options  = (arguments[1] ? arguments[1] : null),
      rootDir = ((options && options.persist) ? self.permDir : self.tmpDir),
      next = arguments[arguments.length-1],
      srcPath = ((typeof source === 'object') ? source.localpath : rootDir + source),
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
            (self.utils.normalize(file.name, function(err, fileStruct) {
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
   * options: object
   * next: function(string err, boolean success)
   */

  remove: function() {

    var file = arguments[0],
      filePath = ((typeof file === 'object') ? file.localpath : file),
      options  = (arguments[1] ? arguments[1] : null),
      rootDir = ((options && options.persist) ? self.permDir : self.tmpDir),
      next = arguments[arguments.length-1];

    fs.exists(rootDir + filePath, function(exists) {
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
      self = this,
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
