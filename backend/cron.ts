import cron from 'node-cron';
import db from './db';
import { User } from './types';

if (process.env.NODE_ENV !== 'test') {
	cron.schedule('0 * * * *', () => {
		const now = Math.floor(Date.now() / 1000);

		db.run('DELETE FROM token_blacklist WHERE expiration <= ?', [now], (err: Error | null) => {
			if (err) {
				console.error('Error cleaning up expired tokens:', err);
			} else {
				console.log('Expired tokens cleaned up successfully.');
			}
		});
	});

	cron.schedule('* * * * *', () => {
		const now = Math.floor(Date.now() / 1000);
		db.all('SELECT id, last_seen, online_status FROM users', (err: Error | null, users: User[]) => {
			if (err) {
				return console.error('Error fetching users for status update:', err);
			}
			users.forEach((user: User) => {
				const lastSeen = user.last_seen || 0;
				const delta = now - lastSeen;
				let newStatus: 'online' | 'offline' | 'away' = 'offline';
				if (delta < 5 * 60) {
					newStatus = 'online';
				} else if (delta < 15 * 60) {
					newStatus = 'away';
				}
				if (newStatus !== user.online_status) {
					db.run('UPDATE users SET online_status = ? WHERE id = ?',
						[newStatus, user.id],
						(err: Error | null) => {
							if (err) {
								console.error(`Failed to update status for user ${user.id}:`, err);
							} else {
								console.log(`User ${user.id} is now ${newStatus}`);
							}
						}
					);
				}
			});
		});
	});
}
