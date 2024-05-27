const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const watchesFilePath = path.join(__dirname, './data/watches.json');

const readWatchesFromFile = () => {
    try {
        const data = fs.readFileSync(watchesFilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading watches data:', err);
        return [];
    }
};

// Fetch all watches
router.get('/', (req, res) => {
    const watches = readWatchesFromFile();
    res.json(watches);
});

module.exports = router;
