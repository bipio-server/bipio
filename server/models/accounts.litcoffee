### Account

	schema =
		id: 'string'
		username: 'string'
		name: 'string'
		is_admin: 'boolean'
		email: 'string'
		created: 'number'
		last_session: 'number'


	class Account

		constructor: (object) ->
			super schema
			@id = ''
			@username = ''
			@is_admin = false

	module.exports = Account
			



