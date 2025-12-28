require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

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

// Serve Deceased Map Image from DB
app.get('/api/deceased-images/:id', (req, res) => {
  const { id } = req.params;
  const query = "SELECT image_data, mime_type FROM deceased_list WHERE id = ?";
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Database error');
    }
    if (!row || !row.image_data) {
      return res.status(404).send('Image not found');
    }

    res.setHeader('Content-Type', row.mime_type || 'image/jpeg');
    res.send(row.image_data);
  });
});

// Get Deceased Location Endpoint
app.get('/api/deceased/:name', (req, res) => {
  const { name } = req.params;
  // Exclude image_data
  const query = "SELECT id, name, location FROM deceased_list WHERE name = ?";
  db.get(query, [name], (err, row) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (!row) return res.status(404).json({ message: 'Deceased not found' });

    // Construct response
    const deceasedData = {
      ...row,
      // Since we don't know if image exists without querying, we can just provide the URL
      // OR we could check if image_data is not null. 
      // For simplicity, let's provide URL and if it 404s, client shows placeholder.
      // Actually, let's query 'CASE WHEN image_data IS NOT NULL THEN 1 ELSE 0 END as has_image'
      // But to keep it simple:
      url: `/api/deceased-images/${row.id}`
    };

    // Legacy support: if image_url was used, maybe we should unset it or keep it?
    // Client prefers 'url' (which we will add implies binary) or 'image_url' (legacy).
    // Let's set image_url to this new URL too for compatibility if client uses that.
    deceasedData.image_url = deceasedData.url;

    res.json({ deceased: deceasedData });
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

  const query = `INSERT INTO guestbook (deceased_name, author, title, content) VALUES (?, ?, ?, ?) RETURNING id`;
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

const storage = multer.memoryStorage();
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

    const insert = 'INSERT INTO photos (user_id, filename, slot_number, image_data, mime_type) VALUES (?, ?, ?, ?, ?) RETURNING id';
    db.run(insert, [userId, filename, slotNumInt, req.file.buffer, req.file.mimetype], function (err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ message: 'Failed to save photo info' });
      }
      res.json({ message: 'Photo uploaded successfully', filename: filename, id: this.lastID });
    });
  });
});

// Serve Image from DB Endpoint
app.get('/api/images/:id', (req, res) => {
  const { id } = req.params;
  const query = "SELECT image_data, mime_type FROM photos WHERE id = ?";
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Internal Server Error');
    }
    if (!row || !row.image_data) {
      return res.status(404).send('Image not found');
    }

    res.setHeader('Content-Type', row.mime_type || 'image/jpeg');
    res.send(row.image_data);
  });
});

// Get Photos Endpoint
app.get('/api/photos', (req, res) => {
  const { userId } = req.query;
  // Exclude image_data to reduce payload size
  let query = "SELECT id, user_id, filename, slot_number, created_at FROM photos ORDER BY created_at DESC";
  let params = [];

  if (userId) {
    query = "SELECT id, user_id, filename, slot_number, created_at FROM photos WHERE user_id = ? ORDER BY slot_number ASC";
    params = [userId];
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
    // Add 'url' property to match frontend expectations (using the new serving endpoint)
    const photosWithUrl = rows.map(row => ({
      ...row,
      url: `/api/images/${row.id}`
      // Note: Frontend currently uses 'url' or '/uploads/filename'. 
      // We will need to update frontend to use this 'url' property instead of building path manually.
    }));
    res.json({ photos: photosWithUrl });
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

// --- Render Deployment Configuration ---
// Serve static frontend files
app.use(express.static(path.join(__dirname, '../client/dist')));

// Handle SPA routing: return index.html for any unknown route
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});
