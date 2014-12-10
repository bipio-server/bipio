fs-cdn
======

An adapter between fs and pkgcloud

fs-cdn allows you to seamlessly switch between native `fs` and `pkgcloud` functionality. It abstracts the interface into an intuitive set of methods for basic file operations on either your local filesystem or a storage provider supported by `pkgcloud`. (Note: As of 11/17/2014 only Rackspace Cloudfiles is supported.)

Getting Started
---------------

There are two ways to install fs-cdn.

    npm install fs-cdn

or

    git clone git@github.com:WoTio/fs-cdn.git
    cd fs-cdn
    npm install

Next, create a file called `config.json` in your project. It should have a structure like this:

    {
	    "provider" : "rackspace", // only rackspace is supported currently.
	    "username" : "<username>",
	    "apiKey" : "<api key>",
        "region" : "<region>", // must match the region of your container. Defaults to 'IAD'
	    "container" : "<container>" // optional, but without it you must specify the container per file operation
    }

A sample script using `fs-cdn` would thus look something like this: 

    var Fs_Cdn = require('fs-cdn'),
    config = require('<path/to/config.json>');
    
    var fs_cdn_remote = new Fs_Cdn(config),
		fs_cdn_local = new Fs_Cdn();

As shown above, you can instantiate `fs-cdn` with no config and it will use only the local filesystem for its operations. 

Available Methods
-----------------

### **save(*dst*, *src*, *callback*)** ->  
Pipes ReadStream *src* to *dst*. If a string filepath is passed instead of a ReadStream, `save` creates a ReadStream from it.

***dst***: {string} Filename (remote) or full path (local) of destination file   
***src***: {object or string} ReadStream or full path of source file  
***callback***: {function} Callback  

```
fs_cdn_local.save('path/to/dest/filename.txt', ('path/to/src/filename.txt' || fs.createReadStream('path/to/src/filename.txt')), function(err, result) {
	// handle results
});
```

```
fs_cdn_remote.save('filename.txt', ('path/to/local/filename.txt' || fs.createReadStream('path/to/local/filename.txt')), function(err, result) {
	// handle results
});
```

In the callback, `result` object will be a pkgcloud [File Model](https://github.com/pkgcloud/pkgcloud/blob/master/docs/providers/rackspace/storage.md#file-model).

### **get(*src*, *dst*, *callback*)** ->  
Pipes *dst* to Writestream *src*. If a string filepath is passed instead of a WriteStream, `get` creates a WriteStream from it.

***src***: {string} Filename (remote) or full path (local) of source file   
***dst***: {object or string} WriteStream or full path of destination file  
***callback***: {function} Callback  

```
fs_cdn_local.get('path/to/src/filename.txt', ('path/to/dst/filename.txt' || fs.createWriteStream('path/to/dst/filename.txt')), function(err, result) {
	// handle results
});
```

```
fs_cdn_remote.get('filename.txt', ('path/to/local/filename.txt' || fs.createWriteStream('path/to/local/filename.txt')), function(err, result) {
	// handle results
});
```

In the callback, `result` object will be a pkgcloud [File Model](https://github.com/pkgcloud/pkgcloud/blob/master/docs/providers/rackspace/storage.md#file-model).

### **list(*dir*, *callback*)** ->  
Lists all files in *dir* or in remote container

***dir***: {string} directory path (local) or container name (remote, optional if container was specified in config)  
***callback***: {function} Callback  

```
fs_cdn_local.list('path/to/dst/dir', function(err, result) {
	// handle results
});
```

```
fs_cdn_remote.list(function(err, result) {
	// handle results
});
```

In the callback, `result` will be an array of the files in the container or folder.

### **find(*file*, *callback*)** ->  
Finds the specified file.

***file***: {string} directory path (local) or file name (remote)  
***callback***: {function} Callback  

```
fs_cdn_local.find('path/to/local/filename.txt', function(err, result) {
	// handle results
});
```

In the callback, `results` object will be an instance of [fs.Stats](http://nodejs.org/api/fs.html#fs_class_fs_stats)

```
fs_cdn_remote.find('filename.txt', function(err, result) {
	// handle results
});
```

In the callback, `result` object will be a pkgcloud [File Model](https://github.com/pkgcloud/pkgcloud/blob/master/docs/providers/rackspace/storage.md#file-model).

### **remove(*file*, *callback*)** ->  
Removes the specified file.

***file***: {string} directory path (local) or file name (remote)  
***callback***: {function} Callback  

```
fs_cdn_local.remove('path/to/local/filename.txt', function(err, result) {
	// handle results
});
```

```
fs_cdn_remote.remove('filename.txt', function(err, result) {
	// handle results
});
```