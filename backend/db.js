const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('../SQLite/data/database.sqlite', (err) => {
	if (err) {
		console.error(`Error opening database: ${err.message}`);
		return;
	}
	console.log('Connected to the SQLite database.');
});

module.exports = db