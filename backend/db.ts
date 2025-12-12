import sqlite3 from 'sqlite3';

const sqlite = sqlite3.verbose();
let path: string = process.env.SQLITE_DB_PATH || '/data/test.sqlite';
if (process.env.NODE_ENV === 'test') {
	path = '/data/test.sqlite';
}

const db = new sqlite.Database(path, (err: Error | null) => {
	if (err) {
		console.error(`Error opening database: ${err.message}`);
		return;
	} else {
		db.run('PRAGMA foreign_keys = ON;', (err: Error | null) => {
			if (err) {
				console.error('Failed to enable foreign keys:', err.message);
			} else {
				console.log('Foreign keys enabled');
			}
		});
	}
	console.log('Connected to the SQLite database.');
});

export default db;
