require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const db = require('./db');

// Login Endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const query = "SELECT * FROM users WHERE username = ? AND password = ?";
  db.get(query, [username, password], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (row) {
      // Login success
      res.json({
        message: 'Login successful',
        user: {
          id: row.id,
          username: row.username,
          deceased_name: row.deceased_name // Return deceased_name
        }
      });
    } else {
      // Login failed
      res.status(401).json({ message: 'Invalid username or password' });
    }
  });
});

// Update Deceased Name Endpoint
// Update Deceased Name Endpoint
app.post('/api/users/deceased', (req, res) => {
  const { userId, deceasedName } = req.body;
  if (!userId || !deceasedName) {
    return res.status(400).json({ message: 'User ID and Deceased Name are required' });
  }

  // First validate name existence
  const checkQuery = "SELECT * FROM deceased_list WHERE name = ?";
  db.get(checkQuery, [deceasedName], (err, row) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (!row) return res.status(404).json({ message: '등록되지 않은 고인입니다. 관리실에 문의해주세요.' });

    // If exists, proceed to update user
    const query = "UPDATE users SET deceased_name = ? WHERE id = ?";
    db.run(query, [deceasedName, userId], function (err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json({ message: 'Updated successfully', deceased_name: deceasedName });
    });
  });
});

// Get Deceased Location Endpoint
app.get('/api/deceased/:name', (req, res) => {
  const { name } = req.params;
  const query = "SELECT * FROM deceased_list WHERE name = ?";
  db.get(query, [name], (err, row) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (!row) return res.status(404).json({ message: 'Deceased not found' });
    res.json({ deceased: row });
  });
});

// Guestbook Routes
app.get('/api/guestbook', (req, res) => {
  const { deceasedName } = req.query;
  if (!deceasedName) return res.status(400).json({ message: 'Missing deceasedName' });

  const query = "SELECT * FROM guestbook WHERE deceased_name = ? ORDER BY created_at DESC";
  db.all(query, [deceasedName], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json({ posts: rows });
  });
});

app.post('/api/guestbook', (req, res) => {
  const { deceasedName, author, title, content } = req.body;
  if (!deceasedName || !author || !title || !content) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const query = `INSERT INTO guestbook (deceased_name, author, title, content) VALUES (?, ?, ?, ?)`;
  db.run(query, [deceasedName, author, title, content], function (err) {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json({ message: 'Post created', id: this.lastID });
  });
});

// Configure Multer for file uploads
const multer = require('multer');
const path = require('path');

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Upload Photo Endpoint
app.post('/api/photos', upload.single('photo'), (req, res) => {
  console.log('--- POST /api/photos Request ---');
  console.log('Body:', req.body);
  console.log('File:', req.file);

  // Check body first, then query for fallback
  const userId = req.body.userId || req.query.userId;
  const slotNumber = req.body.slotNumber || req.query.slotNumber;

  console.log('Processed Params - UserId:', userId, 'SlotNumber:', slotNumber);

  if (!req.file || !userId || !slotNumber) {
    console.error('Missing required fields');
    return res.status(400).json({ message: 'Photo, User ID, and Slot Number are required' });
  }

  const filename = req.file.filename;
  const slotNumInt = parseInt(slotNumber, 10);

  // Transaction: Delete existing photo in slot -> Insert new one
  db.serialize(() => {
    db.run("DELETE FROM photos WHERE user_id = ? AND slot_number = ?", [userId, slotNumInt], (err) => {
      if (err) console.error("Error clearing slot:", err);
    });

    const insert = 'INSERT INTO photos (user_id, filename, slot_number) VALUES (?, ?, ?)';
    db.run(insert, [userId, filename, slotNumInt], function (err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ message: 'Failed to save photo info' });
      }
      res.json({ message: 'Photo uploaded successfully', filename: filename, id: this.lastID });
    });
  });
});

// Get Photos Endpoint
app.get('/api/photos', (req, res) => {
  const { userId } = req.query;
  let query = "SELECT * FROM photos ORDER BY created_at DESC";
  let params = [];

  if (userId) {
    query = "SELECT * FROM photos WHERE user_id = ? ORDER BY slot_number ASC";
    params = [userId];
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.json({ photos: rows });
  });
});

// Delete Photo Endpoint
app.delete('/api/photos/:id', (req, res) => {
  const { id } = req.params;

  const deleteQuery = "DELETE FROM photos WHERE id = ?";
  db.run(deleteQuery, [id], function (err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: 'Failed to delete photo' });
    }
    res.json({ message: 'Photo deleted successfully' });
  });
});

// Delete Guestbook Post Endpoint
app.delete('/api/guestbook/:id', (req, res) => {
  const { id } = req.params;

  const deleteQuery = "DELETE FROM guestbook WHERE id = ?";
  db.run(deleteQuery, [id], function (err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: 'Failed to delete post' });
    }
    res.json({ message: 'Post deleted successfully' });
  });
});
