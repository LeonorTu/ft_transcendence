const cron = require('node-cron')
const db = require('./db')

if (process.env.NODE_ENV !== 'test') {
	cron.schedule('0 * * * *', () => {
		const now = Math.floor(Date.now() / 1000)

		db.run('DELETE FROM token_blacklist WHERE expiration <= ?', [now], (err) => {
			if (err) {
				console.error('Error cleaning up expired tokens:', err);
			} else {
				console.log('Expired tokens cleaned up successfully.');
			}
		})
	})
}