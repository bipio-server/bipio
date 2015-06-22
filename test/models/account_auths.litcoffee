### Model : Account Auth Functionality Test

Unit Tests for Account Authorizations

	AccountAuth = require '../../server/models/account_auths.litcoffee'
	chai = require 'chai'
	chai.should()
	colors = require 'colors'
	config = require('../../config')({})
	fs = require 'fs'
	keys = require '../../config/keys.json'
	moment = require 'moment'
	path = require 'path'
	request = require 'request'
	testConfig = require '../config.json'

	credentials = 
		type: 'token'
		username: 'testUser'
		owner_id: 'testOwnerId'
		password: '1234abcd'

	testAuth = new AccountAuth credentials
	
	testEncryptionValue = 'testtesttest'


Begin Tests.

	describe 'Account Auth', () ->
	
		it 'can encrypt using an AES key', (done) ->
			encrypted =	testAuth.AESEncrypt testEncryptionValue	
			# should have a test that confirms value is encrypted
			encrypted.length.should.not.equal testEncryptionValue.length
			done()


		it 'can decrypt using an AES key', (done) ->
			encrypted = testAuth.AESEncrypt testEncryptionValue
			decrypted = testAuth.AESDecrypt encrypted
			decrypted.should.equal testEncryptionValue
			done()


		it 'can save a properly encrypted value to a datastore', (done) ->
			credentials.username = testAuth.AESEncrypt credentials.username	
			credentials.password = testAuth.AESEncrypt credentials.password
			# TODO: test encryption->insertion, then retrieval->decryption of value(s)
			console.log credentials

			done()

	

