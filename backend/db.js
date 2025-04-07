const sqlite3 = require('sqlite3').verbose();
const path = process.env.SQLITE_DB_PATH;

const db = new sqlite3.Database(path, (err) => {
	if (err) {
		console.error(`Error opening database: ${err.message}`);
		return;
	}
	console.log('Connected to the SQLite database.');
});

module.exports = db