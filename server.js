// server.js — Artwork Scene Prompts API
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join('/app/data', 'prompts.json');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper: read data
function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { scenes: [], nextId: 100 };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

// Helper: write data
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// GET all scenes
app.get('/api/scenes', (req, res) => {
  try {
    res.json(readData());
  } catch (e) {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// POST save all scenes (full replace)
app.post('/api/scenes', (req, res) => {
  try {
    const { scenes, nextId } = req.body;
    if (!Array.isArray(scenes)) return res.status(400).json({ error: 'Invalid data' });
    writeData({ scenes, nextId: nextId || 100 });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to write data' });
  }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Artwork Prompts running on port ${PORT}`);
});
