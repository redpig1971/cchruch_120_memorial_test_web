const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath);
const uploadsDir = path.join(__dirname, 'uploads');

console.log("--- Checking Database Content ---");
db.all("SELECT * FROM photos", (err, rows) => {
    if (err) {
        console.error("DB Error:", err.message);
    } else {
        console.log("Photos Table:", JSON.stringify(rows, null, 2));
    }
    db.close();
});

console.log("\n--- Checking Uploads Directory ---");
fs.readdir(uploadsDir, (err, files) => {
    if (err) {
        console.error("FS Error:", err.message);
    } else {
        console.log("Files:", files);
    }
});
