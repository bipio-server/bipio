var BipModel = require('./prototype.js').BipModel;

var Account = Object.create(BipModel);

Account.id = '';
Account.name = '';
Account.email_account = '';
Account.is_admin = false;

// @todo what is uniqueKeys?>
Account.uniqueKeys = ['name', 'email_account'];

Account.compoundKeyContraints = {
    name : 1,
    email_account : 1
};

Account.entityName = 'account';
Account.entitySchema = {
    id: { type: String, renderable: true, writable: false },
    name: { type: String, renderable: true, writable: true },
    is_admin: { type: Boolean, renderable: false, writable: false },
    email_account: { type: String, renderable: true, writable: false }
};

module.exports.Account = Account;