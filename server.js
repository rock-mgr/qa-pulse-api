
require("dotenv").config();

const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("qa_pulse");

// Test route
app.get("/", (req, res) => {
    res.json({
        message: "QA Pulse API is running"
    });
});

//GET
app.get("/projects/search", async (req, res) => {
    try {
        const { term } = req.query;

        if (!term || !term.trim()) {
            return res.status(400).json({
                error: "Search term is required"
            });
        }

        const projects = await db.collection("projects").find({
            name: { $regex: term, $options: "i" }
        }).toArray();

        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

//GET
app.get("/projects", async (req, res) => {
    try {
        const projects = await db.collection("projects").find({}).toArray();
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET - Search test cases by title
app.get("/test-cases/search", async (req, res) => {
    try {
        const { term } = req.query;

        if (!term || !term.trim()) {
            return res.status(400).json({
                error: "Search term is required"
            });
        }

        const testCases = await db.collection("test_cases").find({
            title: { $regex: term, $options: "i" }
        }).toArray();

        res.json(testCases);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

//GET
app.get("/test-cases", async (req, res) => {
    try {
        const testCases = await db.collection("test_cases").find({}).toArray();

        res.json(testCases);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST - Create a new test case
app.post("/test-cases", async (req, res) => {
    try {
        const { title, description, status, priority, projectId } = req.body;

        if (!title || !description || !status || !priority || !projectId) {
            return res.status(400).json({
                error: "All test case fields are required"
            });
        }

        if (!ObjectId.isValid(projectId)) {
            return res.status(400).json({
                error: "Invalid project ID"
            });
        }

        const project = await db.collection("projects").findOne({
            _id: new ObjectId(projectId)
        });

        if (!project) {
            return res.status(404).json({
                error: "Project not found"
            });
        }

        const newTestCase = {
            title,
            description,
            status,
            priority,
            projectId: new ObjectId(projectId)
        };

        const result = await db.collection("test_cases").insertOne(newTestCase);

        res.status(201).json({
            message: "Test case created successfully",
            insertedId: result.insertedId
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

//POST
app.post("/projects", async (req, res) => {
    try {
        const { name, description, status } = req.body;

        if (!name || !description || !status) {
            return res.status(400).json({
                error: "Name, description and status are required"
            });
        }

        const newProject = {
            name,
            description,
            status,
            createdAt: new Date().toISOString()
        };

        const result = await db.collection("projects").insertOne(newProject);

        res.status(201).json({
            message: "Project created successfully",
            insertedId: result.insertedId
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT - Update an existing test case
app.put("/test-cases/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, status, priority } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                error: "Invalid test case ID"
            });
        }

        if (!title || !description || !status || !priority) {
            return res.status(400).json({
                error: "All test case fields are required"
            });
        }

        const result = await db.collection("test_cases").updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    title,
                    description,
                    status,
                    priority
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                error: "Test case not found"
            });
        }

        res.json({
            message: "Test case updated successfully"
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

//PUT
app.put("/projects/:id", async (req, res) => {
    try {
        const { ObjectId } = require("mongodb");
        const { id } = req.params;
        const { name, description, status } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                error: "Invalid project ID"
            });
        }

        if (!name || !description || !status) {
            return res.status(400).json({
                error: "Name, description and status are required"
            });
        }

        const result = await db.collection("projects").updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    name,
                    description,
                    status
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                error: "Project not found"
            });
        }

        res.json({
            message: "Project updated successfully"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE
app.delete("/projects/:id", async (req, res) => {
    try {
        const { ObjectId } = require("mongodb");
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                error: "Invalid project ID"
            });
        }

        const result = await db.collection("projects").deleteOne({
            _id: new ObjectId(id)
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                error: "Project not found"
            });
        }

        res.json({
            message: "Project deleted successfully"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE - Delete a test case by ID
app.delete("/test-cases/:id", async (req, res) => {
    try {
        const { ObjectId } = require("mongodb");

        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                error: "Invalid test case ID"
            });
        }

        const result = await db.collection("test_cases").deleteOne({
            _id: new ObjectId(req.params.id)
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                error: "Test case not found"
            });
        }

        res.json({
            message: "Test case deleted successfully"
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST - Register a new user
app.post("/signup", async (req, res) => {
    try {
        const bcrypt = require("bcrypt");

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: "Email and password are required"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                error: "Password must be at least 8 characters"
            });
        }

        const existingUser = await db.collection("users").findOne({
            email: email.toLowerCase()
        });

        if (existingUser) {
            return res.status(409).json({
                error: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.collection("users").insertOne({
            email: email.toLowerCase(),
            password: hashedPassword,
            createdAt: new Date()
        });

        res.status(201).json({
            message: "User registered successfully",
            userId: result.insertedId
        });

    } catch (error) {
        console.error("Signup error:", error.message);

        res.status(500).json({
            error: "Registration failed"
        });
    }
});

// POST - Login user and generate JWT
app.post("/login", async (req, res) => {
  try {
    const bcrypt = require("bcrypt");
    const jwt = require("jsonwebtoken");

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required"
      });
    }

    // Find the registered user
    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password"
      });
    }

    // Compare entered password with stored bcrypt hash
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        error: "Invalid email or password"
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login successful",
      token: token
    });

  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({
      error: "Login failed"
    });
  }
});

// GET - Protected route using JWT
app.get("/profile", (req, res) => {
  const jwt = require("jsonwebtoken");

  // Read Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Access denied. Token required"
    });
  }

  // Extract token after "Bearer "
  const token = authHeader.split(" ")[1];

  try {
    // Verify token using our secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    res.json({
      message: "Protected route accessed successfully",
      userId: decoded.userId,
      email: decoded.email
    });

  } catch (error) {
    res.status(401).json({
      error: "Invalid or expired token"
    });
  }
});

// Connect to MongoDB before starting Express
async function startServer() {
    try {
        await client.connect();
        await db.command({ ping: 1 });

        console.log("Connected to MongoDB Atlas");

        app.listen(PORT, () => {
            console.log(`QA Pulse API running on port ${PORT}`);
        });
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
}

startServer();
