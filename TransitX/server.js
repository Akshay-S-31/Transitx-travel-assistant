// --- Existing Imports ---
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");

// --- New Imports for Child Process ---
const { spawn } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- Python Process Configuration ---
const pythonExecutable = 'python3'; // <--- IMPORTANT: Use 'python' or 'python3' depending on your system setup
const pythonScriptName = 'crowd_analyzer.py';
const pythonScriptPath = path.join(__dirname, pythonScriptName); // Assumes script is in the same directory

// --- Global State for Crowd Data ---
let currentCrowdData = {
    density: "Unknown",
    count: 0,
    timestamp: null,
    status: "Initializing" // Add a status field (Initializing, Starting, Running, Error, Exited, Stopped)
};
let pythonProcess = null;

// --- Python Process Management Functions ---

function startPythonProcess() {
    if (pythonProcess) {
        console.log('[Crowd Analyzer] Python process already running.');
        return;
    }

    console.log(`[Crowd Analyzer] Spawning Python script: ${pythonExecutable} ${pythonScriptPath}`);
    currentCrowdData = { ...currentCrowdData, status: "Starting" }; // Keep previous data but update status

    try {
        pythonProcess = spawn(pythonExecutable, [pythonScriptPath], {
            // stdio: ['pipe', 'pipe', 'pipe'] // Usually default, but can be explicit
        });

        // Handle data from Python's stdout
        pythonProcess.stdout.on('data', (data) => {
            const rawData = data.toString().trim();
            // Handle potential multiple JSON objects received in one chunk
            const jsonStrings = rawData.split('\n').filter(s => s.trim() !== '');

            jsonStrings.forEach(jsonString => {
                try {
                    const jsonData = JSON.parse(jsonString);
                    if (jsonData && jsonData.density) {
                        console.log('[Crowd Analyzer] Received data:', jsonData);
                        // Update server state - merge new data with existing, add status
                        currentCrowdData = { ...currentCrowdData, ...jsonData, status: "Running" };
                    } else {
                        console.warn('[Crowd Analyzer] Received non-JSON or invalid JSON data from stdout:', jsonString);
                    }
                } catch (error) {
                    console.error('[Crowd Analyzer] Error parsing JSON from stdout:', error);
                    console.error('[Crowd Analyzer] Raw data chunk:', rawData);
                }
            });
        });

        // Handle errors from Python's stderr (useful for debugging python script)
        pythonProcess.stderr.on('data', (data) => {
            console.error(`[Crowd Analyzer] Python stderr: ${data.toString().trim()}`);
            // Optionally update status on error
            // currentCrowdData.status = "Error";
        });

        // Handle process exit
        pythonProcess.on('close', (code) => {
            console.log(`[Crowd Analyzer] Python process exited with code ${code}`);
            pythonProcess = null; // Reset the process variable
            currentCrowdData.status = `Exited (Code: ${code})`;
            // Optional: Implement retry logic here if needed
            // setTimeout(startPythonProcess, 5000); // Restart after 5 seconds
        });

        // Handle spawn errors (e.g., python command not found)
        pythonProcess.on('error', (err) => {
            console.error('[Crowd Analyzer] Failed to start Python process:', err);
            pythonProcess = null;
            currentCrowdData.status = "Failed to start";
            currentCrowdData.error = err.message; // Store error message
        });

    } catch (spawnError) {
         console.error('[Crowd Analyzer] Error spawning Python process:', spawnError);
         currentCrowdData.status = "Spawn Error";
         currentCrowdData.error = spawnError.message;
    }
}

function stopPythonProcess() {
    if (pythonProcess) {
        console.log('[Crowd Analyzer] Stopping Python process...');
        pythonProcess.kill('SIGTERM'); // Send termination signal (more graceful than SIGKILL)
        // You could add a timeout and then send SIGKILL if it doesn't terminate
        pythonProcess = null;
        currentCrowdData.status = "Stopped";
    } else {
        console.log('[Crowd Analyzer] Python process not running.');
    }
}


// --- MySQL Connection --- (Keep as is)
const db = mysql.createConnection({
    host: "localhost",
    user: "root", // Make sure these credentials are secure in production
    password: "NewPassword", // Consider using environment variables
    database: "transitx"
});

db.connect(err => {
    if (err) {
        console.error("Database connection failed: " + err.stack);
        // Potentially stop the server from starting fully if DB is essential
        process.exit(1); // Exit if DB connection fails
    }
    console.log("Connected to MySQL Database");
});

// --- Existing API Routes --- (Keep as is)

// API Route to Handle User Registration
app.post("/register", (req, res) => {
    const { username, mobile, email, password } = req.body;
    const sql = "INSERT INTO users (username, mobile, email, password) VALUES (?, ?, ?, ?)";
    db.query(sql, [username, mobile, email, password], (err, result) => {
        if (err) {
            console.error("Registration DB Error:", err); // Log specific error
            return res.status(500).json({ message: "Database Error during registration" });
        }
        res.json({ message: "Registration Successful!" });
    });
});

// API Route to Handle User Login
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
    }
    const sql = "SELECT * FROM users WHERE username = ?";
    db.query(sql, [username], (err, results) => {
        if (err) {
            console.error("Login DB error:", err);
            return res.status(500).json({ message: "Internal server error during login" });
        }
        // IMPORTANT: Plain text password comparison is insecure! Use hashing (e.g., bcrypt) in production.
        if (results.length === 0 || results[0].password !== password) {
            return res.status(401).json({ message: "Invalid username or password" });
        }
        res.json({
            message: "Login successful",
            user: { id: results[0].id, username: results[0].username } // Avoid sending password back
        });
    });
});

// API to Fetch Trains Between Selected Stations
app.get("/trains", (req, res) => {
    const { from, to } = req.query;
    if (!from || !to) {
        return res.status(400).json({ message: "Missing FROM or TO station parameter" });
    }
    const sql = "SELECT * FROM trains WHERE source = ? AND destination = ?";
    db.query(sql, [from, to], (err, results) => {
        if (err) {
            console.error("Fetch trains DB error:", err);
            return res.status(500).json({ message: "Internal server error fetching trains" });
        }
        res.json(results);
    });
});

// API to Fetch Buses Between Selected Stations
app.get("/buses", (req, res) => {
    const { from, to } = req.query;
    if (!from || !to) {
        return res.status(400).json({ message: "Missing FROM or TO location parameter" });
    }
    const sql = "SELECT * FROM buses WHERE source = ? AND destination = ?";
    db.query(sql, [from, to], (err, results) => {
        if (err) {
            console.error("Fetch buses DB error:", err);
            return res.status(500).json({ message: "Internal server error fetching buses" });
        }
        res.json(results);
    });
});

// --- New API Route to Get Crowd Density Data ---
app.get("/crowd-density", (req, res) => {
    // Simply return the latest data received from the python script
    res.json(currentCrowdData);
});


// --- Start the Server & Python Process ---
const PORT = 5510; // Use process.env.PORT for flexibility
const server = app.listen(PORT, () => { // Store server instance
    console.log(`Server running on http://localhost:${PORT}`);
    // Start the Python crowd analyzer process AFTER the server is listening
    startPythonProcess();
});

// --- Graceful Shutdown Handling ---
function gracefulShutdown(signal) {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    // 1. Stop the Python process
    stopPythonProcess();

    // 2. Close the HTTP server
    server.close(() => {
        console.log('HTTP server closed.');

        // 3. Close the Database connection
        db.end(err => {
            if (err) {
                console.error('Error closing MySQL connection:', err.message);
            } else {
                console.log('MySQL connection closed.');
            }
            // 4. Exit the process
            process.exit(0);
        });
    });

    // Force shutdown if server doesn't close promptly
    setTimeout(() => {
        console.error('Could not close connections in time, forcing shutdown.');
        process.exit(1);
    }, 10000); // 10 seconds timeout
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // For `kill` command
process.on('SIGINT', () => gracefulShutdown('SIGINT'));   // For Ctrl+C
