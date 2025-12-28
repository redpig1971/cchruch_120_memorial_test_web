const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Create deceased_list table
    db.run(`CREATE TABLE IF NOT EXISTS deceased_list (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        location TEXT,
        image_url TEXT
    )`, (err) => {
        if (err) {
            console.error("Error creating deceased_list table:", err.message);
        } else {
            console.log("deceased_list table created/verified.");
        }
    });

    // Seed data
    const seedName = '고인';
    const seedLocation = 'D-9';
    const seedImage = '/location_maps/d9.png'; // Placeholder path

    db.run(`INSERT OR IGNORE INTO deceased_list (name, location, image_url) VALUES (?, ?, ?)`,
        [seedName, seedLocation, seedImage],
        (err) => {
            if (err) {
                console.error("Error seeding data:", err.message);
            } else {
                console.log(`Seeded '${seedName}' at '${seedLocation}'.`);
            }
        }
    );
});

db.close();
