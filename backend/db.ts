import sqlite3, { Database } from 'sqlite3';
import * as pathModule from 'path';
import * as fs from 'fs';

const sqlite = sqlite3.verbose();
let path: string = process.env.SQLITE_DB_PATH || '/data/test.sqlite';

// Initialize test database once if needed
if (process.env.NODE_ENV === 'test') {
	const testDbDir = pathModule.join(process.cwd(), 'test_data');
	if (!fs.existsSync(testDbDir)) {
		fs.mkdirSync(testDbDir, { recursive: true });
	}
	path = pathModule.join(testDbDir, 'test.sqlite');

	// Check if database needs initialization (doesn't exist or is empty)
	const dbExists = fs.existsSync(path);
	if (!dbExists) {
		// Create and initialize database schema before any connections
		const initSqlPath = pathModule.join(process.cwd(), '../SQLite/init.sql');
		if (fs.existsSync(initSqlPath)) {
			const initSql = fs.readFileSync(initSqlPath, 'utf8');

			// Use a synchronous approach: create db, exec, wait, close
			const tempDb = new sqlite.Database(path);
			let initDone = false;
			let initError: Error | null = null;

			tempDb.exec(initSql, (err: Error | null) => {
				if (err) {
					console.error('Failed to initialize test database schema:', err.message);
					initError = err;
				}
				initDone = true;
			});

			// Wait for initialization to complete (busy-wait for sync behavior)
			const startTime = Date.now();
			while (!initDone && Date.now() - startTime < 5000) {
				// Wait up to 5 seconds
			}

			tempDb.close();

			if (initError) {
				throw initError;
			}
		}
	}
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
