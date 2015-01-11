fs-cdn
======

A streaming adapter between fs and pkgcloud

fs-cdn allows you to mirror basic native `fs` and `pkgcloud` functionality. It abstracts the interface into an intuitive set of methods for basic file operations on either your local filesystem and a storage provider supported by `pkgcloud`.

Getting Started
---------------

There are two ways to install fs-cdn.

    npm install fs-cdn

or

    git clone git@github.com:WoTio/fs-cdn.git
    cd fs-cdn
    npm install

Next, create a file called `config.json` in your project. It should have a structure that conforms to the pkgcloud config object, which varies per provider. Below is an example of a config using Rackspace Cloudfiles:

    {
    	"data_dir" : "/path/to/data/dir" // required - the relative root directory, all paths will be relative to this
	    "provider" : "rackspace",
	    "username" : "<username>", // provider-specific, see pkgcloud's storage docs for supported providers and their respective config requirements
	    "apiKey" : "<api key>",	// provider-specific
        "region" : "<region>", // optional
	    "container" : "<container>" // optional, but without it you must specify the container per file operation
    }

A sample script using `fs-cdn` would thus look something like this: 

```Javascript
var Fs_Cdn = require('fs-cdn'),
remoteConfig = require('<path/to/remote/config.json>'),
localConfig = require('<path/to/local/config.json>');

var fs_cdn_remote = new Fs_Cdn(remoteConfig),
	fs_cdn_local = new Fs_Cdn(localConfig);
```

Available Methods
-----------------

### **save(*dest*, *source*, *options*, *callback*)**
Pipes ReadStream *source* to *dest*. If a string filepath is passed instead of a ReadStream, `save` creates a ReadStream from it.

***dest***: {string} Full path of destination file  
***source***: {object or string} ReadStream or full path of source file  
***options***: {object} Options object  
***callback***: {function} Callback  

```Javascript
var options = {
	persist: @boolean,	// If true, stores file in /perm subfolder. If false, stores files in /tmp 
	append: @boolean,	// If true, appends the source to the dest file, instead of overwriting
	compress: @boolean,	// If true, compresses the file using gzip.
	write: @boolean		// If true, looks for an instance of Buffer as argument[1] and writes it to the file.
}

fs_cdn_local.save('path/to/dest/filename.txt', <'path/to/src/filename.txt' or fs.createReadStream('path/to/src/filename.txt')>, options, function(err, result) {
	
	// result will be a file object like this:
	//		{
	//			size : @int,
	//			localpath : @string,
	//			name : @string,
	//			type : @string,
	//			encoding : 'binary'
	//		}

});

fs_cdn_remote.save('path/to/dest/filename.txt', <'path/to/src/filename.txt' or fs.createReadStream('path/to/src/filename.txt')>, options, function(err, result) {
	
	// result will be a file object like this:
	//		{
	//			size : @int,
	//			localpath : @string,
	//			name : @string,
	//			type : @string,
	//			container: @string,
	//			encoding : 'binary'
	//		}

});
```

### **get(*source*, *callback*)**
Gets *source* and a readStream pointing to it. If a string filepath is passed instead of a File object, `get` normalizes it into a File object (after checking for its existence).

***source***: {object or string} Full path of source file or File object
***callback***: {function} Callback

```Javascript
fs_cdn_local.get(<'path/to/src/filename.txt' or { localpath : 'path/to/src/filename.txt', name: 'filename.txt', encoding: 'binary' }>, function(err, result, readStream) {
	
	// result will be a file object like this:
	//		{
	//			size : @int,
	//			localpath : @string,
	//			name : @string,
	//			type : @string,
	//			container: @string,
	//			encoding : 'binary'
	//		}
	//
	// readStream will be an instance of fs.readStream from the filesystem

});

fs_cdn_remote.get(<'path/to/src/filename.txt' or { localpath : 'path/to/src/filename.txt', name: 'filename.txt', encoding: 'binary' }>, function(err, result, readStream) {
	
	// result will be a file object like this:
	//		{
	//			size : @int,
	//			localpath : @string,
	//			name : @string,
	//			type : @string,
	//			container: @string,
	//			encoding : 'binary'
	//		}
	//
	// readStream will be an instance of fs.readStream from the CDN storage provider

});
```

### **list(*dir*, *callback*)** ->  
Lists all files in *dir* or in remote container

***dir***: {string} directory path (local) or container name (remote, optional if container was specified in config)  
***callback***: {function} Callback  

```Javascript
fs_cdn_local.list('path/to/dst/dir', function(err, result) {
	// handle results
});
```

```Javascript
fs_cdn_remote.list(function(err, result) {
	// handle results
});
```

In the callback, `result` will be an array of the files in the container or folder.

### **find(*file*, *callback*)** ->  
Finds the specified file.

***file***: {string} directory path (local) or file name (remote)  
***callback***: {function} Callback  

```Javascript
fs_cdn_local.find('path/to/local/filename.txt', function(err, result) {
	// handle results
});
```

In the callback, `results` object will be an instance of [fs.Stats](http://nodejs.org/api/fs.html#fs_class_fs_stats)

```Javascript
fs_cdn_remote.find('filename.txt', function(err, result) {
	// handle results
});
```

In the callback, `result` object will be a pkgcloud [File Model](https://github.com/pkgcloud/pkgcloud/blob/master/docs/providers/rackspace/storage.md#file-model).

### **remove(*file*, *callback*)** ->  
Removes the specified file.

***file***: {string} directory path (local) or file name (remote)  
***options***: {object} Options object  
***callback***: {function} Callback  

```Javascript
fs_cdn_local.remove('path/to/local/filename.txt', function(err, result) {
	// handle results
});
```

```Javascript
fs_cdn_remote.remove('filename.txt', function(err, result) {
	// handle results
});
```