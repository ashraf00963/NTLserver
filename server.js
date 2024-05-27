const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const authRoutes = require('./auth');
const watchesRoutes = require('./watches');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(bodyParser.json());
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true,
}));

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
        checkPeriod: 86400000, // Check for expired sessions every 24 hours
    }),
}));

app.use(express.static(path.join(__dirname, 'public')));

// Include routes from auth.js
app.use('/auth', authRoutes);

// Include routes from watches.js
app.use('/watches', watchesRoutes);

let basket = []; 

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'public'));
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

// Read data from users.json
function readUsersFromFile() {
    try {
        const data = fs.readFileSync('data/users.json', 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading users data from file:', error);
        return []; // Return an empty array if reading fails
    }
}

// Write data to users.json
function writeUsersToFile(users) {
    try {
        fs.writeFileSync('data/users.json', JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error writing users data to file:', error);
        // Handle error response here (e.g., send 500 status code)
    }
}


// Read data from watches.json
function readWatchesFromFile() {
    try {
        const data = fs.readFileSync('data/watches.json', 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading watches data from file:', error);
        return []; // Return an empty array if reading fails
    }
}

// Write data to watches.json
function writeWatchesToFile(watches) {
    try {
        fs.writeFileSync('data/watches.json', JSON.stringify(watches, null, 2));
    } catch (error) {
        console.error('Error writing watches data to file:', error);
        // Handle error response here (e.g., send 500 status code)
    }
}

app.post('/admin/upload-image', upload.single('image'), (req, res) => {
    res.status(200).json({ message: 'Image uploaded successfully' });
});


// Route for root
app.get('/', (req, res) => {
    res.send('Welcome to the server!');
});

const readAdminsFromFile = () => {
    const adminsData = fs.readFileSync(path.join(__dirname, 'data/admins.json'));
    return JSON.parse(adminsData);
};

app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    const admins = readAdminsFromFile();

    const admin = admins.find(a => a.username === username && a.password === password);

    if (admin) {
        // For simplicity, we're not using JWT or session, just sending success
        res.status(200).json({ message: 'Login successful' });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

app.get('/admin', (req, res) => {
    res.send('Welcome to the admin section.');
});


// endpoint to get details of a specific watch by ID
app.get('/admin/watches/:id', (req, res) => {
    const watches = readWatchesFromFile();
    const id = parseInt(req.params.id);
    const watch = watches.find(w => w.id === id);
    if (!watch) {
        return res.status(404).json({ message: 'Watch not found' });
    }
    res.json(watch);
});

// endpoint to update the details of an existing watch
app.put('/admin/watches/:id', (req, res) => {
    const watches = readWatchesFromFile();
    const id = parseInt(req.params.id);
    const { img, name, collection, price, description } = req.body;
    const index = watches.findIndex(w => w.id === id);
    if (index === -1) {
        return res.status(404).json({ message: 'Watch not found' });
    }
    // Update watch details
    watches[index] = { id, img, name, collection, price, description };
    writeWatchesToFile(watches);
    res.status(200).json({ message: 'Watch updated successfully' });
});

// Endpoint to delete a watch
app.delete('/admin/watches/:id', (req, res) => {
    const watches = readWatchesFromFile();
    const id = parseInt(req.params.id);
    const index = watches.findIndex(w => w.id === id);
    if (index === -1) {
        return res.status(404).json({ message: 'Watch not found' });
    }
    // Remove the watch from the array
    watches.splice(index, 1);
    writeWatchesToFile(watches);
    res.status(200).json({ message: 'Watch deleted successfully' });
});


// Get all watches
app.get('/watches', (req, res) => {
    const watches = readWatchesFromFile(); // Read watches data from file
    res.json(watches);
});

// Get a specific watch by id
app.get('/watches/:id', (req, res) => {
    const watches = readWatchesFromFile(); // Read watches data from file
    const id = parseInt(req.params.id);
    const watch = watches.find(w => w.id === id);
    if (!watch) {
        return res.status(404).json({ message: 'Watch not found' });
    }
    res.json(watch);
});



// Add a new watch (admin only)
app.post('/admin/watches', (req, res) => {
    const watches = readWatchesFromFile(); // Read watches data from file
    const { img, name, collection, price, description } = req.body;
    const id = watches.length + 1;
    const newWatch = { id, img, name, collection, price, description };
    watches.push(newWatch);
    writeWatchesToFile(watches); // Write updated watches data to file
    res.status(201).json(newWatch);
});


// Register a new user
app.post('/register', (req, res) => {
    const users = readUsersFromFile(); // Read users data from file
    const { username, password, street, postalcode, city, country, isAdmin } = req.body;
    const normalizedUsername = username.toLowerCase();

    // Check if the username is already taken
    if (users.some(user => user.username.toLowerCase() === normalizedUsername)) {
        return res.status(400).json({ error: 'Username already exists' });
    }

    // Create a new user
    const newUser = {
        id: users.length + 1,
        username: normalizedUsername,
        password,
        isAdmin: isAdmin || false, // Default to false if not provided
        street,
        postalcode,
        city,
        country
    };
    users.push(newUser);
    writeUsersToFile(users); // Write updated users data to file
    res.status(201).json({ message: 'User registered successfully', user: newUser });
});



// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const users = readUsersFromFile();
    const normalizedUsername = username.toLowerCase();

    // Find user by username and validate password
    const user = users.find(user => user.username === normalizedUsername && user.password === password);
    if (!user) {
        console.log('Login failed: Incorrect username or password');
        return res.status(401).json({ error: 'Incorrect username or password' });
    }

    req.session.user = user;
    res.json({ message: 'Login successful', userId: user.id });
});

// Session check
app.get('/auth-check', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

// Logout
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to log out' });
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.json({ message: 'Logout successful' });
    });
});

// Get user email by ID
app.get('/account/email/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const users = readUsersFromFile(); // Read users data from file

    const user = users.find(u => u.id === userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json({ email: user.username }); // Assuming the username is the email
});

// Get user address by ID
app.get('/account/address/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const users = readUsersFromFile(); // Read users data from file

    const user = users.find(u => u.id === userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const { street, postalcode, city, country, region } = user;
    res.json({ street, postalcode, city, country, region });
});

// Update user email
app.put('/account/email/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    // Check if user is logged in
    if (!req.session.user || req.session.user.id !== userId) {
        return res.status(401).json({            
            error: 'Unauthorized: User not logged in or does not have permission to perform this action'
        });
    }

    console.log('Attempting to update email...');
    const { email } = req.body;

    // Find user by ID
    const user = users.find(u => u.id === userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    user.username = email.toLowerCase(); // Assuming email is the username
    writeDataToFile('users.json', users);

    res.json({ message: 'Email updated successfully', user });
});

// Update user password
app.put('/account/password/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    // Check if user is logged in
    if (!req.session.user || req.session.user.id !== userId) {
        return res.status(401).json({
            error: 'Unauthorized: User not logged in or does not have permission to perform this action'
        });
    }

    console.log('Attempting to update password...');
    const { password } = req.body;

    // Find user by ID
    const user = users.find(u => u.id === userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    user.password = password;
    writeDataToFile('users.json', users);

    res.json({ message: 'Password updated successfully', user });
});

// Update user address
app.put('/account/address/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    // Check if user is logged in
    if (!req.session.user || req.session.user.id !== userId) {
        return res.status(401).json({
            error: 'Unauthorized: User not logged in or does not have permission to perform this action'
        });
    }

    console.log('Attempting to add/update address...');
    const { street, postalcode, city, country, region } = req.body;

    // Find user by ID
    const user = users.find(u => u.id === userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    user.street = street;
    user.postalcode = postalcode;
    user.city = city;
    user.country = country;
    user.region = region; // Add region if applicable
    writeDataToFile('users.json', users);

    res.json({ message: 'Address added/updated successfully', user });
});

// Remove user account
app.delete('/account/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    // Check if user is logged in
    if (!req.session.user || req.session.user.id !== userId) {
        return res.status(401).json({
            error: 'Unauthorized: User not logged in or does not have permission to perform this action'
        });
    }

    console.log('Attempting to remove account...');
    // Find index of user by ID
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Remove user from array
    users.splice(userIndex, 1);
    writeDataToFile('users.json', users);

    // Destroy session and send response
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to remove account' });
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.json({ message: 'Account removed successfully' });
    });
});

app.get('/basket/items', (req, res) => {
    res.json(basket);
});

app.post('/basket/add', (req, res) => {
    const watches = readWatchesFromFile();
    const { id } = req.body;
    const watch = watches.find(w => w.id === id);
    if (!watch) {
        return res.status(404).json({ message: 'Watch not found' });
    }

    const basketItemIndex = basket.findIndex(item => item.id === id);
    if (basketItemIndex !== -1) {
        basket[basketItemIndex].quantity++;
    } else {
        basket.push({ ...watch, quantity: 1 });
    }

    res.status(201).json({ message: 'Watch added to basket', watch });
});

app.post('/basket/update', (req, res) => {
    const { id, quantity } = req.body;
    const itemIndex = basket.findIndex(item => item.id === id);
    if (itemIndex !== -1) {
        basket[itemIndex].quantity = quantity;
        res.status(200).json({ message: 'Item quantity updated successfully' });
    } else {
        res.status(404).json({ message: 'Item not found in basket' });
    }
});

app.delete('/basket/remove', (req, res) => {
    const { id } = req.body;
    const basketItemIndex = basket.findIndex(item => item.id === id);
    if (basketItemIndex !== -1) {
        if (basket[basketItemIndex].quantity > 1) {
            basket[basketItemIndex].quantity--;
        } else {
            basket.splice(basketItemIndex, 1);
        }
        res.status(200).json({ message: 'Watch removed from basket', id });
    } else {
        res.status(404).json({ message: 'Watch not found in basket' });
    }
});

app.post('/basket/clear', (req, res) => {
    basket = [];
    res.status(200).json({ message: 'Basket cleared successfully' });
});

app.post('/basket/removeWatch', (req, res) => {
    const { id } = req.body;
    const basketItemIndex = basket.findIndex(item => item.id === id);
    if (basketItemIndex !== -1) {
        basket.splice(basketItemIndex, 1);
        res.status(200).json({ message: 'Watch completely removed from basket', id });
    } else {
        res.status(404).json({ message: 'Watch not found in basket' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});