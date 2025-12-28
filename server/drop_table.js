const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath);

db.run("DROP TABLE IF EXISTS photos", function (err) {
    if (err) {
        return console.error(err.message);
    }
    console.log("Dropped photos table.");
    db.close();
});
