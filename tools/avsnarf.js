#!/usr/bin/env node
var dao      = require('../src/bootstrap');

// given an image url and account id, attaches the account avatar
var url = process.argv[3],
    ownerId = process.argv[2];
    
if (!url || !ownerId) {
    console.log('Usage : node avsnarf.js {owner id} {url}');
    process.exit(1);
}

console.log('fetching avatar...');
dao.getAvRemote(ownerId, url, true, function(err, response) {
    if (!err) {
        console.log("OK!");        
        console.log(response);        
    } else {
        console.log(response);
        console.log('Error');        
    }
    process.exit(0);        
});
