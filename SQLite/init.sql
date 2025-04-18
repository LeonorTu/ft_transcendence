-- Users table
CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT NOT NULL UNIQUE,
	email TEXT UNIQUE,
	password TEXT NOT NULL,
	google_id TEXT UNIQUE,
	avatar TEXT,
	online_status TEXT,
	two_fa_code TEXT,
	two_fa_code_expiration INTEGER
);

CREATE TABLE IF NOT EXISTS friends (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NOT NULL,
	friend_id INTEGER NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
	FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
	UNIQUE (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS token_blacklist (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	token TEXT UNIQUE,
	expiration INTEGER
);

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	status TEXT NOT NULL
	-- name TEXT
);

-- Tournament Registrations table
CREATE TABLE IF NOT EXISTS tournament_registrations (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	tournament_id INTEGER NOT NULL,
	user_id INTEGER NOT NULL,
	registration_time DATETIME DEFAULT CURRENT_TIMESTAMP,
	status TEXT DEFAULT 'registered',
	UNIQUE(tournament_id, user_id),
	FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
	FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player1_id INTEGER NOT NULL,
    player2_id INTEGER NOT NULL,
    player1_score INTEGER DEFAULT 0,
    player2_score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'not_started',
    finished_rounds INTEGER DEFAULT 0,
    winner_id INTEGER DEFAULT NULL,
    loser_id INTEGER DEFAULT NULL,
    match_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player1_id) REFERENCES users(id),
    FOREIGN KEY (player2_id) REFERENCES users(id),
    FOREIGN KEY (winner_id) REFERENCES users(id),
    FOREIGN KEY (loser_id) REFERENCES users(id)
);
