/*
 *
 *
 */
function AccountInfo(account, dao) {
  this.user = account;
  this.dao = dao;

  this.collections = {};
  this.activeDomain = null;
}

AccountInfo.prototype = {

  _load : function(collection, next) {
    var self = this;

    if (!this.collections[collection]) {
      this.dao.findFilter(
        collection,
        {
          owner_id : this.user.id
        },
        function(err, result) {
          self.collections[collection] = result;
          if (next) {
            next(err, result);
          }

          return self.collections[collection];
        }
      );
    } else {

      if (next) {
        next(false, this.collections[collection]);
      }

      return this.collections[collection];
    }
  },

  getSettings : function(next) {
    var self = this;
    return this._load('account_option', function(err, settings) {

      if (app.helper.isArray(settings)) {
        self.settings = settings[0];

      } else {
        self.settings = settings;
      }

      next(err, self.settings.toJSON ? self.settings.toJSON() : self.settings);
    });
  },

  getSetting : function(name, next) {
    this.getSettings(function(err, settings) {
      next(err, settings[name]);
    });
  },

  getDomains : function(next) {
    return this._load('domain', next);
  },

  getDomain : function(domainId, next) {
    this.getDomains(function(err, domains) {
      next(err, _.where(domains, { id : domainId }) );
    });
  },

  testDomain : function(domainId, next) {
    this.getDomains(function(err, domains) {
      next(err, !!_.where(domains, { id : domainId}).length );
    });
  },

  getChannels : function(next) {
    this._load('channel', next);
  },

  getChannel : function(cid, next) {
    this.getChannels(function(err, channels) {
      next(err, _.findWhere(channels, { id : cid}) );
    });
  },

  testChannel : function(cid, next) {
    this.getChannels(function(err, channels) {
      next(err, !!_.where(channels, { id : cid}).length );
    });
  },

  getId : function() {
    return this.user.id;
  },

  getName : function() {
    return this.user.name;
  },

  getUserName : function() {
    return this.user.username;
  },

  getActiveDomain : function() {
    return this.activeDomain;
  },

  getDefaultDomain: function(next) {
    this.getDomains(
      function(err, domains) {
        next(err, _.findWhere(domains, { type : 'vanity'} ) );
      }
    );
  },

  getDefaultDomainStr : function(next) {
    this.getDefaultDomain(function(err, domain) {
      next(err, CFG.proto_public + domain.name)
    });
  },

  setActiveDomain : function(domainId, next) {
    var self = this;
    if (domainId) {
      this.getDomains(function(err, domains) {
        self.activeDomain = _.findWhere(domains, { id : domainId } );
        next();
      });
    } else {
      this.getDefaultDomain(function(err, domain) {
        self.activeDomain = domain;
        next();
      });
    }
  },

  getTimezone : function(next) {
    this.getSetting('timezone', next);
  }
};

module.exports = AccountInfo;