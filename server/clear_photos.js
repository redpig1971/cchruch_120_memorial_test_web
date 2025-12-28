const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath);

db.run("DELETE FROM photos", function (err) {
    if (err) {
        return console.error(err.message);
    }
    console.log(`Deleted ${this.changes} rows from photos table.`);
    db.close();
});
