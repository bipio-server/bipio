#!/usr/bin/env node
var dao      = require('../src/bootstrap');

// given a url, downloads the favicon for the domain into our icofactory CDN
var url = process.argv[2],
    bipid = process.argv[3];
    
if (!url) {
    console.log('Usage : node cdnfactory.js {url} {bip id optional}');
    process.exit(1);
}

console.log('fetching icon...');
dao.getBipRefererIcon(bipid, url, true, function(err, response) {
    if (!err) {
        console.log("OK!");        
        console.log(response);        
    } else {
        console.log(response);
        console.log('Error');        
    }
    process.exit(0);        
});
