var fs = require('fs'),
	path = require('path')
	regex = /[^\\/]+\.[^\\/]+$/;

function FsProto() {};

FsProto.prototype = {

	// Fs_Cdn.save(@string dstFileName, @string srcFileName OR @object readStream, @function next)
	save: function() {
		var self = this;
		if (arguments[0] && arguments[1] && typeof arguments[0] === 'string' && typeof arguments[arguments.length-1] === 'function' && self.parse_path(arguments[0])) {
			var dstFileName = arguments[0],
				next = arguments[arguments.length-1],
				readStream = ((typeof arguments[1] === 'string') ?  fs.createReadStream(arguments[1]) : arguments[1]);

			var writeStream = fs.createWriteStream(dstFileName);

			writeStream.on('error', next);

			writeStream.on('finish', next);

			readStream.pipe(writeStream);
		}
	},

	get: function() {
		var self = this;
		if (arguments[0] && typeof arguments[0] === 'string' && arguments[1] && typeof arguments[arguments.length-1] === 'function') {
			var srcFileName = arguments[0],
				next = arguments[arguments.length-1],
				writeStream = ((typeof arguments[1] === 'string') ? fs.createWriteStream(arguments[1]) : arguments[1]);
				
				var readStream = fs.createReadStream(srcFileName);

				writeStream.on('error', next);

				writeStream.on('finish', next);

				readStream.pipe(writeStream);
		}
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
			    	fs.stat(filePath, next);
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
	}

};

module.exports = FsProto;