// routes/auth.js
const express = require('express');
const router = express.Router();
const fs = require('fs');

// Route for auth.nexttolast.online
router.get('/', (req, res) => {
    res.send('Welcome to auth.nexttolast.store!');
});

// Function to read data from JSON file
function readDataFromFile(filename) {
    try {
        const data = fs.readFileSync(filename, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data from file:', error);
        return [];
    }
}

module.exports = router;