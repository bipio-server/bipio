var RackspaceProto = require('./src/rackspace.js');
var FsProto = require('./src/fs.js');

function Fs_Cdn(options) {
	if (options && options.hasOwnProperty("provider")) {
		switch(options.provider) {
			case "rackspace":
				this.prototype = RackspaceProto.prototype;
				return new RackspaceProto(options);
		};
	}
	else {
		this.prototype = FsProto.prototype;
		return new FsProto();
	}
};

module.exports = Fs_Cdn;