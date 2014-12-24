var CDNProto = require('./src/cdn.js');
var FsProto = require('./src/fs.js');

function Fs_Cdn(options) {
	if (options && options.hasOwnProperty("provider") && options.hasOwnProperty("data_dir")) {
		this.prototype = CDNProto.prototype;
		return new CDNProto(options);
	}
	else if (options && options.hasOwnProperty("data_dir")) {
		this.prototype = FsProto.prototype;
		return new FsProto(options);
	}
	else throw new Error("Required options not specified in config.")
};

module.exports = Fs_Cdn;