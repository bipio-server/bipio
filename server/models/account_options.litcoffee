### Account Options	
	
	schema =
		id: 'string'
		owner_id: 'string'
		bip_hub: 'string'
		bip_domain_id: 'boolean'
		bip_end_life: 'string'
		bip_type: 'string'
		bip_expire_behaviour: 'string'
		last_session: 'number'
		timezone: 'string'
		avatar: 'string'
		default_feed_id: 'string'
		remote_settings: 'object'


	class Account_Option

		constructor: (object) ->
			super schema
			@id = ''
			@owner_id = ''

###### `saveAvatar`

This was handled as a preSave condition

		saveAvatar: (accountInfo, next) ->
			self = this
			if @avatar and 0 != @avatar.indexOf(CFG.cdn_public)
				app.modules.cdn.saveAvatar @owner_id, request.get(@avatar), '/cdn/img/av/', (err, avatarPath) ->
				if err
					next err
				else
					self.avatar = CFG.cdn_public + avatarPath.replace('/cdn', '')
					next false, self
				return
			else
				next false, this
			return

	module.exports = Account_Option
			



