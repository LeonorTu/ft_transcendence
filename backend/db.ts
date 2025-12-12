import sqlite3, { Database } from 'sqlite3';
import * as pathModule from 'path';
import * as fs from 'fs';

const sqlite = sqlite3.verbose();
let path: string = process.env.SQLITE_DB_PATH || '/data/test.sqlite';

// Use test database if in test environment
// Database should be initialized by running `npm run test:init` before tests
if (process.env.NODE_ENV === 'test') {
	const testDbDir = pathModule.join(process.cwd(), 'test_data');
	if (!fs.existsSync(testDbDir)) {
		fs.mkdirSync(testDbDir, { recursive: true });
	}
	path = pathModule.join(testDbDir, 'test.sqlite');
}

const db: Database = new sqlite.Database(path, (err: Error | null) => {
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

export = db;
