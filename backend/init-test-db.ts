import sqlite3 from 'sqlite3';
import * as pathModule from 'path';
import * as fs from 'fs';

const sqlite = sqlite3.verbose();
const testDbDir = pathModule.join(process.cwd(), 'test_data');

if (!fs.existsSync(testDbDir)) {
	fs.mkdirSync(testDbDir, { recursive: true });
}

const dbPath = pathModule.join(testDbDir, 'test.sqlite');

// Remove existing database to ensure clean state
if (fs.existsSync(dbPath)) {
	fs.unlinkSync(dbPath);
}

// Try multiple locations for init.sql (Docker vs local)
const possiblePaths = [
	pathModule.join(process.cwd(), 'init.sql'),           // Docker: /app/init.sql
	pathModule.join(process.cwd(), '../SQLite/init.sql'), // Local: ../SQLite/init.sql
];

const initSqlPath = possiblePaths.find(p => fs.existsSync(p));

if (!initSqlPath) {
	console.error('Could not find init.sql in any of the expected locations');
	process.exit(1);
}

const initSql = fs.readFileSync(initSqlPath, 'utf8');
const db = new sqlite.Database(dbPath);

db.exec(initSql, (err: Error | null) => {
	if (err) {
		console.error('Failed to initialize test database:', err.message);
		process.exit(1);
	}
	console.log('Test database initialized successfully');
	db.close();
});
