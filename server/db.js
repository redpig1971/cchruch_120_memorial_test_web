const { Pool } = require('pg');

// Create a new pool using the connection string from environment variables
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Helper function to convert SQLite style '?' placeholders to Postgres '$n'
const convertQuery = (sql) => {
    let i = 1;
    return sql.replace(/\?/g, () => `$${i++}`);
};

const db = {
    // Wrapper for db.run (Execute query)
    run: (sql, params, callback) => {
        // If params is callback, shift arguments
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }

        const pgSql = convertQuery(sql);

        pool.query(pgSql, params, (err, res) => {
            if (callback) {
                // If RETURNING id is used, use it as lastID
                const lastID = (res && res.rows && res.rows.length > 0) ? res.rows[0].id : 0;
                callback.call({ lastID: lastID }, err);
            }
        });
    },

    // Wrapper for db.get (Get single row)
    get: (sql, params, callback) => {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        const pgSql = convertQuery(sql);
        pool.query(pgSql, params, (err, res) => {
            if (err) return callback(err);
            callback(null, res.rows[0]);
        });
    },

    // Wrapper for db.all (Get all rows)
    all: (sql, params, callback) => {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        const pgSql = convertQuery(sql);
        pool.query(pgSql, params, (err, res) => {
            if (err) return callback(err);
            callback(null, res.rows);
        });
    },

    // No-op for serialize as PG pool handles concurrency
    serialize: (callback) => {
        callback();
    }
};

// Initialize Tables
const initDB = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Users Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE,
                password VARCHAR(255),
                deceased_name VARCHAR(255)
            );
        `);

        // Check Admin
        const adminRes = await client.query("SELECT * FROM users WHERE username = $1", ['admin']);
        if (adminRes.rows.length === 0) {
            await client.query("INSERT INTO users (username, password, deceased_name) VALUES ($1, $2, $3)", ['admin', 'admin', '고인1']);
            console.log('Default admin user created (admin/admin/고인1)');
        } else {
            // Force update deceased_name for existing admin as per user request
            await client.query("UPDATE users SET deceased_name = $1 WHERE username = $2", ['고인1', 'admin']);
            console.log('Admin user updated with default deceased_name (고인1)');
        }

        // Photos Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS photos (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                filename VARCHAR(255),
                slot_number INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id),
                UNIQUE(user_id, slot_number)
            );
        `);

        // Schema Migration for Binary Storage (Safe to run multiple times)
        await client.query(`ALTER TABLE photos ADD COLUMN IF NOT EXISTS image_data BYTEA; `);
        await client.query(`ALTER TABLE photos ADD COLUMN IF NOT EXISTS mime_type VARCHAR(50); `);

        // Deceased List Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS deceased_list(
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE,
            location VARCHAR(255),
            image_url VARCHAR(255)
        );
        `);

        await client.query(`ALTER TABLE deceased_list ADD COLUMN IF NOT EXISTS image_data BYTEA;`);
        await client.query(`ALTER TABLE deceased_list ADD COLUMN IF NOT EXISTS mime_type VARCHAR(50);`);

        // Seed Deceased List if empty
        const deceasedRes = await client.query("SELECT * FROM deceased_list WHERE name = $1", ['고인1']);
        if (deceasedRes.rows.length === 0) {
            await client.query("INSERT INTO deceased_list (name, location) VALUES ($1, $2)", ['고인1', '천국 1열 1번']);
            console.log('Seeded deceased_list with 고인1');
        }

        // Guestbook Table
        await client.query(`
             CREATE TABLE IF NOT EXISTS guestbook(
            id SERIAL PRIMARY KEY,
            deceased_name VARCHAR(255),
            author VARCHAR(255),
            title VARCHAR(255),
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `);

        await client.query('COMMIT');
        console.log("PostgreSQL Tables Initialized");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Error initializing tables", e);
    } finally {
        client.release();
    }
};

initDB();

module.exports = db;
