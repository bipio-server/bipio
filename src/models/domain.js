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
var BipModel = require('./prototype.js').BipModel,
    Domain = Object.create(BipModel),
    dns = require('dns'),
    step = require('../lib/step');

Domain.uniqueKeys = ['name'];
Domain.entityName = 'domain';
Domain.entitySchema = {
    id: {
        type: String, 
        index : true,
        renderable: true, 
        writable: false
    },
    owner_id : {
        type: String, 
        index : true,
        renderable: false, 
        writable: false
    },
    type: {
        type: String, 
        renderable: false, 
        writable: false, 
        "default" : "custom"
    },
    _available: {
        type: Boolean, 
        renderable: true, 
        writable: false, 
        "default" : false
    },
    name: {
        type: String,
        renderable: true,
        index : true,
        writable: true,        
        validate : [
        {
            validator : function(val, next) {
                var ok = false;
                var isBipDomain = Domain.isBipDomain(val);
                    
                if (this.type == 'custom') {
                    ok = !isBipDomain;
                } else {
                    // we want to lock vanity domains as unwritable
                    ok = (!isBipDomain && this.type != 'vanity');
                }
                    
                next(ok);                   
            },
            msg : "Can not overwrite a protected Domain"
        },        
        ]
    }
};

Domain.isBipDomain = function(val) {
    return /bip.io$/ig.test(val);
}

Domain.verify = function(accountInfo, next) {
    var self = this, dao = this._dao;
    step(
        function domainVerify() {
            dns.resolveMx(
                        self.name,
                        this.parallel()
                    );
            dns.resolveCname(
                        self.name,
                        this.parallel()
                    );
        },
        function collateResults(err, MXAddr, CNAMEAddr) {
            if (!MXAddr && !CNAMEAddr && null != err) {                
                if (err.errno == 'ENOTFOUND' || err.errno == 'ENODATA') {
                    next(err, 'domain', self, 202);
                } else {
                    next(err, 'domain', self, 500);
                }
            } else {
                var acctDomain = accountInfo.getDefaultDomain().name;
                var ok = false;

                if (MXAddr && MXAddr.length > 0) {              
                    for (var i = 0; i < MXAddr.length; i++) {
                        if (MXAddr[i].exchange && MXAddr[i].exchange == acctDomain) {
                            ok = true;
                        }
                    }
                }

                if (CNAMEAddr && CNAMEAddr.length > 0) {
                    if (app.helper.inArray(CNAMEAddr, acctDomain)) {
                        ok = true;
                    }
                }
                
                if (ok) {
                    self._available = true;
                    dao.updateColumn('domain', self.id, { '_available' : true }, function(err, result) {
                        if (err) {
                            console.log(err);
                        }
                        next(err, 'domain', self, 200);
                    });
                    
                } else {
                    // accepted
                    next(err, 'domain', self, 202);                    
                }                
            }
        }    
    );    
}

// domains behave a little differently, they can have postponed availability
// after creation as we verify the domain is properly configured
Domain.postSave = function(accountInfo, next) {    
    var self = this, dao = this._dao;
    if (!this.isBipDomain(this.name)) {
        this.verify(accountInfo, next);
    } else {
        next(false, 'domain', self, 200);
    }
}

Domain.repr = function() {
    return this.name;
}

Domain.entitySetters = {
    'name' : function(name) {
        return name.toLowerCase();
        
    }
};

Domain.compoundKeyContraints = {
    name : 1
};

module.exports.Domain = Domain;
