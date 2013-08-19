/**
 *
 * The Bipio API Server
 *
 * @author Michael Pearson <michael@cloudspark.com.au>
 * Copyright (c) 2010-2013 CloudSpark pty ltd http://www.cloudspark.com.au
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * A Bipio Commercial OEM License may be obtained via enquiries@cloudspark.com.au
 */
var    tldtools    = require('tldtools'),
       url = require('url'),
       fs = require('fs'),
       path = require('path'),
       http    = require('http'),
       https    = require('https'),
       temp = require('temp'),
       imagemagick = require('imagemagick');

// -----------------------------------------------------------------------------
function ProcFile() {
    this.txId = txId;
    this.size = '';
    this.localpath = '';
    this.name = '';
    this.type = '';
    this.encoding = '';
}

/**
 * pipes the contained file into a stream
 */
ProcFile.prototype.read = function(pipeStream) {
    var rs = fs.createReadStream(this.localpath);    
    rs
        .on('open', function() {
            rs.pipe(pipeStream);
        })
        .on('error', function(err) {
            pipeStream.end(err);
        });
}

// -----------------------------------------------------------------------------

var cdn = {
    httpSnarfResponseHandler : function(res, srcUrl, dstFile, next, hops) {        
        if (hops > 3) {
            next(true, 'too many redirects');
        } else if (res.statusCode == 200) {                    
            var outFile = fs.createWriteStream(dstFile);
            res.pipe(outFile);
            outFile
                .on('close', function() {
                    next(false, {
                        'url' : srcUrl,
                        'file' : dstFile
                    });
                })
                .on('error', function(e) {
                    next(true, e);
                    console.log(e);                    
                });                   
        } else if (res.statusCode == 301) {
            srcUrl = res.headers.location;
            hops++;
            this.httpFileSnarf(srcUrl, dstFile, next, hops);
        } else {
            next(true, res);
        }
    },
    
    /**
     * Given a http(s) url, retrieves a file, follows 301's etc. and
     * streams to dstFile
     */
    httpFileSnarf : function(srcUrl, dstFile, next, hops) {
        var urlTokens = tldtools.extract(srcUrl),
            self = this,
            proto = urlTokens.url_tokens.protocol;
        
        if (undefined === hops) {
            hops = 1;
        }
            
        if (proto == 'http:') {
            http.get(srcUrl, function(res) {                                
                self.httpSnarfResponseHandler(res, srcUrl, dstFile, next, hops);
            }).on('error', function(e) {
                console.log(e);
                next(true, e);
            });       
        } else if (proto == 'https:') {
            https.get(srcUrl, function(res) {                                
                self.httpSnarfResponseHandler(res, srcUrl, dstFile, next, hops);
            }).on('error', function(e) {
                console.log(e);
                next(true, e);
            });   
        } else {
            next(true, 'Bad Protocol : ' + proto);
        }        
    },
       
    /**
     * Given a file creation strategy we know about, takes the meta data payload
     * and renormalizes it for internal use
     * 
     */
    normedMeta: function(strategy, txId, payload) {
        var normFiles = [],
            struct, f;
        
        if (strategy == 'express') {
            for (file in payload) {
                f = payload[file];
                struct = {
                    txId : txId,
                    size : f.size,
                    localpath : f.path,
                    name : f.name,
                    type : f.type,
                    encoding : f._writeStream.encoding
                }
                //normFiles.push(Object.create(ProcFile, struct));
                normFiles.push(struct);
            }
        } else if (strategy == 'haraka') {
            normFiles = payload;
            normFiles.txId = txId;
        } else {
            normFiles = payload;
        }
        
        return normFiles;
    },
    
    
    /**
     * Creates a temporary file based on an incoming readStream
     * 
     * @param inStream ReadStream
     */
    tmpStream : function(inStream, prefix, contentType, fileName, cb) {       
        if (undefined == prefix) {
            prefix = 'tmp';
        }
        prefix += '-';

        var writeStream = temp.createWriteStream({ prefix : prefix });
        fs.chmod(writeStream.path, 0644);
        inStream.pipe(writeStream);
        inStream.resume();
        writeStream.on('close', function(err) {
            if (!err && cb) {
                
                cb(false, writeStream.path, contentType, fileName, {
                    size : writeStream.bytesWritten
                });
            }
        });
        
        return writeStream.path;
    },
    
    convert : function(args, next) {
        imagemagick.convert(args, next);
    }
}

module.exports = cdn;