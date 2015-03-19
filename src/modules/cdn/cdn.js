var pkgcloud = require('pkgcloud'),
	fs = require('fs'),
	FsProto = require('./fs.js'),
	client = null,
	util = require('util');

function CDNProto(options) {
	if (options.hasOwnProperty("provider")) {
		client = pkgcloud.storage.createClient(options);
		this.opts = options;
	}
	else {
		console.warn("Credentials not found. Initializing in local fs mode...")
	}
};

util.inherits(CDNProto, FsProto);

CDNProto.prototype = {
	
	/*
	 * Saves a file from a string or readStream, syncs to CDN, and returns file object
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
			destPath = ((typeof dest === 'object') ? dest.localpath : dest),
			next = arguments[arguments.length-1],
			clientOpts = {
				container: ((options && options.container) ? options.container : self.opts.container),
				remote: destPath
			},
			readStream = ((typeof source === 'string') ? fs.createReadStream(source) : source),
			writeStream = client.upload(clientOpts),
			local = new FsProto({data_dir: this.opts.data_dir});

		local.save(dest, source, options, function(err, file) {
			if (err) next(err);
			
			writeStream.on('error', next);
			writeStream.on('success', function() {
				file.container = clientOpts.container;
				next(null, file);
			})
		});

		readStream.pipe(writeStream);
	},

	/*
	 * Gets a file from a fileStruct, if id doesn't exist, check the CDN and return a new fileStruct and readStream from CDN
	 *
	 * source: string or object
	 * next: function(string err, object file, readStream)
	 */

	get: function() {
		var self = this,
			source = arguments[0],
			next = arguments[arguments.length-1],
			srcPath = ((typeof source === 'object') ? source.localpath : source),
			clientOpts = {
				container: (source.container ? source.container : self.opts.container),
				remote: srcPath
			},
			local = new FsProto({data_dir: this.opts.data_dir});

		if (typeof srcPath !== 'string') next("fs_cdn.get() requires either a valid path string or a File object with property 'localpath'.");

		fs.stat(srcPath, function(err, result) {
			if (err) {
				var readStream = client.download(clientOpts)
				local.save(srcPath, readStream, function(err, file) {
					if (err) next(err);
					file.container = clientOpts.container;
					next(null, result, readStream);
				});
			}
			else {
				readStream = fs.createReadStream(srcPath);

				self.utils.normalize(srcPath, function(err, file) {
					file.container = clientOpts.container;
					next(err, file, readStream);
				});
			}
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
			next = arguments[arguments.length-1],
			local = new FsProto({data_dir: this.opts.data_dir});

		local.list(file, next);
	},

	/*
	 * Removes file from filesystem and CDN
	 *
	 * file: string or object
	 * next: function(string err, boolean success)
	 */

	remove: function() {
		var self = this;
		if (client && arguments[0] && typeof arguments[0] === 'string' && typeof arguments[arguments.length-1] === 'function') {
			var container = (arguments[1] && typeof arguments[1] === 'string' ? arguments[1] : self.opts.container);
			client.removeFile(container, arguments[0], arguments[arguments.length-1]);
		}
	},

	utils: require('./utils')

};

module.exports = CDNProto;
