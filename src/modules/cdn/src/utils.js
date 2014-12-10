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
