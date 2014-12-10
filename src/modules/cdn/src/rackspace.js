var pkgcloud = require('pkgcloud'),
	fs = require('fs'),
	FsProto = require('./fs.js'),
	client = null,
	util = require('util');

function RackspaceProto(options) {
	if (options.hasOwnProperty("username") && options.hasOwnProperty("apiKey")) {
		client = pkgcloud.storage.createClient({
		    provider: options.provider, 
		    username: options.username, 
		    apiKey: options.apiKey, 
		    region: options.region || 'IAD', 
		    useInternal: options.useInternal || false
		  });
		this.opts = options;
	}
	else {
		console.warn("Credentials not found. Initializing in local fs mode...")
	}
};

util.inherits(RackspaceProto, FsProto);

RackspaceProto.prototype = {
	
	// Fs_Cdn.save(@string filename, @object stream OR @string path, [@object options OR @string container], @function callback)
	save: function() {
		var self = this;
		if (client && arguments[0] && typeof arguments[0] === 'string' && arguments[1] && typeof arguments[arguments.length-1] === 'function') {
			var dstFileName = arguments[0],
				next = arguments[arguments.length-1],
				readStream = ((typeof arguments[1] === 'string') ?  fs.createReadStream(arguments[1]) : arguments[1]);
			
			if (arguments[2]) {
				var clientOpts = ((typeof arguments[2] === 'string') ? {container: arguments[2]} : ((typeof arguments[2] === 'object' && arguments[2].hasOwnProperty("container")) ? arguments[2] : {container: self.opts.container}));
				
				clientOpts.remote = dstFileName;
				
				var writeStream = client.upload(clientOpts);

				writeStream.on('error', next);

				writeStream.on('end', function() {
					// Check three times for file's existence, else pass an error back. This is to account for latency on the remote side.
					client.getFile(clientOpts.container, clientOpts.remote, function(err, result) {
						if (err) {
							setTimeout(function() {
					    		client.getFile(clientOpts.container, clientOpts.remote, function(err, result) {
									if (err) setTimeout(function() { client.getFile(clientOpts.container, clientOpts.remote, next); }, 500);
									else next(null, result);
								});
						    }, 500);
						}
						else {
							next(null, result);
						}
					});
				});

				readStream.pipe(writeStream);
			}
		}
	},

	get: function() {
		var self = this;
		if (client && arguments[0] && typeof arguments[0] === 'string' && arguments[1] && typeof arguments[arguments.length-1] === 'function') {
			var srcFileName = arguments[0],
				next = arguments[arguments.length-1],
				writeStream = ((typeof arguments[1] === 'string') ? fs.createWriteStream(arguments[1]) : arguments[1]);
			
			if (arguments[2]) {
				var clientOpts = ((typeof arguments[2] === 'string') ? {container: arguments[2]} : ((typeof arguments[2] === 'object' && arguments[2].hasOwnProperty("container")) ? arguments[2] : {container: self.opts.container}));
				
				clientOpts.remote = srcFileName;
				if (typeof arguments[1] === 'string') clientOpts.local = arguments[1];
				else clientOpts.stream = writeStream;
				
				var readStream = client.download(clientOpts, next);

				readStream.pipe(writeStream);
			}
		}
	},

	list: function() {
		var self = this;
		if (client && typeof arguments[arguments.length-1] === 'function') {
			var next = arguments[arguments.length-1];
			client.getFiles((typeof arguments[0] === 'string' ? arguments[0] : self.opts.container), {limit: Infinity}, function(err, files) {
				if (err) next(err);
				var results = [];
				for (var index in files) {
					results.push(files[index].name);
				}
				next(null, results);
			});
		}
	},

	remove: function() {
		var self = this;
		if (client && arguments[0] && typeof arguments[0] === 'string' && typeof arguments[arguments.length-1] === 'function') {
			var container = (arguments[1] && typeof arguments[1] === 'string' ? arguments[1] : self.opts.container);
			client.removeFile(container, arguments[0], arguments[arguments.length-1]);
		}
	},

	find: function() {
		var self = this;
		if (client && arguments[0] && typeof arguments[0] === 'string' && typeof arguments[arguments.length-1] === 'function') {
			var container = (arguments[1] && typeof arguments[1] === 'string' ? arguments[1] : self.opts.container);
			client.getFile(container, arguments[0], arguments[arguments.length-1]);
		}
	},

	create_container: function() {
		var self = this;
		if (client && arguments[0] && typeof arguments[0] === 'string' && typeof arguments[arguments.length-1] === 'function') {
			var options = { name: arguments[0] };
			if (arguments[1] && typeof arguments[1] === 'object') options.metadata = arguments[1]
			client.createContainer(container, arguments[0], arguments[arguments.length-1]);
		}
	}

};

module.exports = RackspaceProto;