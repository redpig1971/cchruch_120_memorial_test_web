const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to SQLite database
// Will create users.db if it doesn't exist
const dbPath = path.resolve(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Initialize table and seed data
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    deceased_name TEXT
  )`, (err) => {
        if (err) {
            console.error('Error creating table:', err.message);
        } else {
            // Check if admin user exists, if not create one
            db.get("SELECT * FROM users WHERE username = ?", ['admin'], (err, row) => {
                if (err) {
                    console.error(err.message);
                }
                if (!row) {
                    // Insert default user
                    // WARNING: Storing password in plain text as explicitly requested by user.
                    const insert = 'INSERT INTO users (username, password) VALUES (?,?)';
                    db.run(insert, ['admin', 'admin'], (err) => {
                        if (err) {
                            return console.error(err.message);
                        }
                        console.log('Default admin user created (admin/admin)');
                    });
                }
            });
        }
    });

    // Create photos table
    db.run(`CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        filename TEXT,
        slot_number INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        UNIQUE(user_id, slot_number)
    )`, (err) => {
        if (err) {
            console.error('Error creating photos table:', err.message);
        }
    });

    // Create deceased_list table
    db.run(`CREATE TABLE IF NOT EXISTS deceased_list(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        location TEXT,
        image_url TEXT
    )`, (err) => {
        if (err) {
            console.error('Error creating deceased_list table:', err.message);
        }
    });

    // Create guestbook table
    db.run(`CREATE TABLE IF NOT EXISTS guestbook (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deceased_name TEXT,
        author TEXT,
        title TEXT,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating guestbook table:', err.message);
        }
    });
});

module.exports = db;
