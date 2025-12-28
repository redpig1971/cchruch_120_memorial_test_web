const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath);

db.run("ALTER TABLE users ADD COLUMN deceased_name TEXT", function (err) {
    if (err) {
        // Ignore if error is "duplicate column name" meaning it already exists
        if (err.message.includes("duplicate column name")) {
            console.log("Column 'deceased_name' already exists.");
        } else {
            console.error("Error adding column:", err.message);
        }
    } else {
        console.log("Successfully added 'deceased_name' column to users table.");
    }
    db.close();
});
