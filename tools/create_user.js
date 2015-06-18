#!/usr/bin/env node

process.HEADLESS = true;
if (!process.argv[3]) {
  console.log('Usage - create_user {username} {email} {password} {t=is_admin}');
  process.exit(0);
}

var  username = process.argv[2],
  email = process.argv[3],
  password = process.argv[4],
  isAdmin = process.argv[5] && 't' === process.argv[5]
  bootstrap = require(__dirname + '/../src/bootstrap'),
  dao = bootstrap.app.dao;

dao.on('ready', function(dao) {
  dao.createUser(username, email, password, function() {
    console.log(arguments);
    process.exit(0);
  }, isAdmin);
});
