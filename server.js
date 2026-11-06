// GEMINI CONNECTION
const { GoogleGenAI } = require("@google/genai");

// LOADING .env ENVIRONMENT
// KEEP SENSITIVE SETTINGS APART
require("dotenv").config();

// INITIALIZE GEMINI AI CLIENT
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// IMPORTS EXPRESS 
// EXPRESS IS NODEJS FRAMEWORK USED TO 
// BUILD WEB SERVERS AND APIS
// ALLOWS TO DEFINE ENDPOINTS
// EG. GET/POST /Projects
// EG. DELETE/PUT /Projects/:id
const express = require("express");

// IMPORTS MONGODB CONNECTION & DOCUMENT ID TOOLS
// MongoClient - USED TO CONNECT NODEJS APP TO MONGODB
// ObjectId - USED TO WORK WITH MONGODB DOCUMENT _id VALUES
const { MongoClient, ObjectId } = require("mongodb");

// INIT EXPRESS APPLICATION
// ALLOWS API READ JSON REQUEST BODIES
const app = express();
// MIDDLEWARE - PARSE INCOMING JSON REQUEST BODIES
// ALLOWS EXPRESS APP TO READ JSON DATA SENT BY ARC
app.use(express.json());

// USE CONFIGURED PORT OR 3000
const PORT = process.env.PORT || 3000;

// MONGODB CONNECTION - USE .env 
const client = new MongoClient(process.env.MONGODB_URI);
// MONGODB DATABASE
const db = client.db("qa_pulse");

// TEST ROUTE - HEALTH CHECK ENDPOINT
app.get("/", (req, res) => {
    res.json({ message: "QA Pulse API is running" });
});

//  GET - SEARCH PROJECTS BY NAME IN MONGODB 
//  ARC - GET /projects/search?term=Testing 
app.get("/projects/search", async (req, res) => {
    try {
        // EG. req.query = { term: "Testing" }
        const { term } = req.query;

        // VALIDATE SEARCH TERM
        if (!term || !term.trim()) {
            return res.status(400).json({ error: "Search term is required" });
        }

        // SEARCH PRODUCTS (CASE-INSENSITIVE)
        const projects = await db.collection("projects").find({
            name: { $regex: term, $options: "i" }
        }).toArray();

        // RETURN MATCHING PROJECTS
        res.json(projects);

    } catch (error) {
        // HANDLE SERVER ERRORS
        res.status(500).json({ error: error.message });
    }
});

// GET - RETRIEVE ALL PROJECTS
// ARC: GET /projects
app.get("/projects", async (req, res) => {
    try {
        // FETCH ALL PROJECTS FROM MONGODB
        const projects = await db.collection("projects").find({}).toArray();

        // RETURN PROJECTS AS JSON
        res.json(projects);

    } catch (error) {
        // HANDLE SERVER ERRORS
        res.status(500).json({ error: error.message });
    }
});

// GET - SEARCH TEST CASES BY TITLE
// ARC: GET /test-cases/search?term=Login
app.get("/test-cases/search", async (req, res) => {
    try {
        // EXTRACT SEARCH TERM FROM URL
        const { term } = req.query;

        // VALIDATE SEARCH TERM
        if (!term || !term.trim()) {
            return res.status(400).json({
                error: "Search term is required"
            });
        }

        // SEARCH TEST CASES (CASE-INSENSITIVE)
        const testCases = await db.collection("test_cases").find({
            title: { $regex: term, $options: "i" }
        }).toArray();

        // RETURN MATCHING TEST CASES
        res.json(testCases);

    } catch (error) {
        // HANDLE SERVER ERRORS
        res.status(500).json({ error: error.message });
    }
});

// GET - RETRIEVE ALL TEST CASES
// ARC: GET /test-cases
app.get("/test-cases", async (req, res) => {
    try {
        // FETCH ALL TEST CASES FROM MONGODB
        const testCases = await db.collection("test_cases").find({}).toArray();

        // RETURN TEST CASES AS JSON
        res.json(testCases);

    } catch (error) {
        // HANDLE SERVER ERRORS
        res.status(500).json({ error: error.message });
    }
});

// POST - CREATE A NEW TEST CASE
// ARC: POST /test-cases
app.post("/test-cases", async (req, res) => {
    try {
        // EXTRACT TEST CASE DATA FROM REQUEST BODY
        const { title, description, status, priority, projectId } = req.body;

        // VALIDATE REQUIRED FIELDS AND IDENTIFY MISSING VALUES
        const requiredFields = ["title", "description", "status", "priority", "projectId"];

        const missingFields = requiredFields.filter(field =>
            typeof req.body[field] !== "string" || !req.body[field].trim()
        );

        if (missingFields.length > 0) {
            return res.status(400).json({ error: "Missing or invalid required fields", missingFields });
        }

        // VALIDATE PROJECT ID FORMAT
        if (!ObjectId.isValid(projectId)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        // CHECK IF REFERENCED PROJECT EXISTS
        const project = await db.collection("projects").findOne({
            _id: new ObjectId(projectId)
        });

        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        // PREPARE NEW TEST CASE DOCUMENT
        const newTestCase = {
            title,
            description,
            status,
            priority,
            projectId: new ObjectId(projectId)
        };

        // INSERT TEST CASE INTO MONGODB
        const result = await db.collection("test_cases").insertOne(newTestCase);

        // RETURN SUCCESS RESPONSE
        res.status(201).json({
            message: "Test case created successfully",
            insertedId: result.insertedId
        });

    } catch (error) {
        // HANDLE SERVER ERRORS
        res.status(500).json({ error: error.message });
    }
});

// POST - CREATE A NEW PROJECT
// ARC: POST /projects
app.post("/projects", async (req, res) => {
    try {
        // EXTRACT PROJECT DATA FROM REQUEST BODY
        const { name, description, status } = req.body;

        // VALIDATE REQUIRED FIELDS AND IDENTIFY MISSING VALUES
        const requiredFields = ["name", "description", "status"];

        const missingFields = requiredFields.filter(field =>
            typeof req.body[field] !== "string" || !req.body[field].trim()
        );

        if (missingFields.length > 0) {
            return res.status(400).json({ error: "Missing or invalid required fields", missingFields });
        }

        // PREPARE NEW PROJECT DOCUMENT
        const newProject = {
            name,
            description,
            status,
            createdAt: new Date().toISOString()
        };

        // INSERT PROJECT INTO MONGODB
        const result = await db.collection("projects").insertOne(newProject);

        // RETURN SUCCESS RESPONSE
        res.status(201).json({
            message: "Project created successfully",
            insertedId: result.insertedId
        });

    } catch (error) {
        // HANDLE SERVER ERRORS
        res.status(500).json({ error: error.message });
    }
});

// PUT - UPDATE AN EXISTING TEST CASE
// ARC: PUT /test-cases/:id
app.put("/test-cases/:id", async (req, res) => {
    try {
        // EXTRACT TEST CASE ID AND UPDATED DATA
        const { id } = req.params;
        const { title, description, status, priority } = req.body;

        // VALIDATE TEST CASE ID FORMAT
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid test case ID" });
        }

        // VALIDATE REQUIRED FIELDS
        if (!title || !description || !status || !priority) {
            return res.status(400).json({ error: "All test case fields are required" });
        }

        // UPDATE TEST CASE IN MONGODB
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

        // CHECK IF TEST CASE EXISTS
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Test case not found" });
        }

        // CHECK IF ANY VALUES WERE ACTUALLY CHANGED
        if (result.modifiedCount === 0) {
            return res.status(200).json({ message: "No changes detected. Test case already has these values" });
        }

        // RETURN SUCCESS RESPONSE
        res.json({ message: "Test case updated successfully" });

    } catch (error) {
        // HANDLE SERVER ERRORS
        res.status(500).json({ error: error.message });
    }
});

// PUT - UPDATE AN EXISTING PROJECT
// ARC: PUT /projects/:id
app.put("/projects/:id", async (req, res) => {
    try {

        // EXTRACT PROJECT ID AND UPDATED DATA
        const { id } = req.params;
        const { name, description, status } = req.body;

        // VALIDATE PROJECT ID FORMAT
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        // VALIDATE REQUIRED FIELDS
        if (!name || !description || !status) {
            return res.status(400).json({ error: "Name, description and status are required" });
        }

        // UPDATE PROJECT IN MONGODB
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

        // CHECK IF PROJECT EXISTS
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Project not found" });
        }

        // CHECK IF ANY VALUES WERE ACTUALLY CHANGED
        if (result.modifiedCount === 0) {
            return res.status(200).json({ message: "No changes detected. Project already has these values" });
        }

        // RETURN SUCCESS RESPONSE
        res.json({ message: "Project updated successfully" });

    } catch (error) {
        // HANDLE SERVER ERRORS
        res.status(500).json({ error: error.message });
    }
});

// DELETE - REMOVE AN EXISTING PROJECT
// ARC: DELETE /projects/:id
app.delete("/projects/:id", async (req, res) => {
    try {

        // EXTRACT PROJECT ID FROM URL
        const { id } = req.params;

        // VALIDATE PROJECT ID FORMAT
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        // PREVENT DELETION IF TEST CASES REFERENCE THIS PROJECT
        const linkedTestCases = await db.collection("test_cases").countDocuments({
            projectId: new ObjectId(id)
        });

        if (linkedTestCases > 0) {
            return res.status(409).json({
                error: "Cannot delete project with linked test cases",
                linkedTestCases
            });
        }

        // DELETE PROJECT FROM MONGODB
        const result = await db.collection("projects").deleteOne({
            _id: new ObjectId(id)
        });

        // CHECK IF PROJECT WAS DELETED
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: "Project not found" });
        }

        // RETURN SUCCESS RESPONSE
        res.json({ message: "Project deleted successfully" });

    } catch (error) {
        // HANDLE SERVER ERRORS
        res.status(500).json({ error: error.message });
    }
});

// DELETE - REMOVE AN EXISTING TEST CASE
// ARC: DELETE /test-cases/:id
app.delete("/test-cases/:id", async (req, res) => {
    try {

        // VALIDATE TEST CASE ID FORMAT
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: "Invalid test case ID" });
        }

        // DELETE TEST CASE FROM MONGODB
        const result = await db.collection("test_cases").deleteOne({
            _id: new ObjectId(req.params.id)
        });

        // CHECK IF TEST CASE WAS DELETED
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: "Test case not found" });
        }

        // RETURN SUCCESS RESPONSE
        res.json({ message: "Test case deleted successfully" });

    } catch (error) {
        // HANDLE SERVER ERRORS
        res.status(500).json({ error: error.message });
    }
});

// POST - REGISTER A NEW USER
// ARC: POST /signup
app.post("/signup", async (req, res) => {
    try {
        const bcrypt = require("bcrypt");

        // EXTRACT USER REGISTRATION DATA
        const { email, password } = req.body;

        // VALIDATE REQUIRED FIELDS
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // VALIDATE MINIMUM PASSWORD LENGTH
        if (password.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters" });
        }

        // CHECK IF EMAIL IS ALREADY REGISTERED
        const existingUser = await db.collection("users").findOne({
            email: email.toLowerCase()
        });

        if (existingUser) {
            return res.status(409).json({ error: "Email already registered" });
        }

        // HASH PASSWORD BEFORE STORING
        const hashedPassword = await bcrypt.hash(password, 10);

        // INSERT NEW USER INTO MONGODB
        const result = await db.collection("users").insertOne({
            email: email.toLowerCase(),
            password: hashedPassword,
            createdAt: new Date()
        });

        // RETURN SUCCESS RESPONSE
        res.status(201).json({
            message: "User registered successfully",
            userId: result.insertedId
        });

    } catch (error) {
        // LOG AND HANDLE REGISTRATION ERRORS
        console.error("Signup error:", error.message);

        res.status(500).json({
            error: "Registration failed"
        });
    }
});

// POST - LOGIN USER AND GENERATE JWT
// ARC: POST /login
app.post("/login", async (req, res) => {
    try {
        const bcrypt = require("bcrypt");
        const jwt = require("jsonwebtoken");

        // EXTRACT LOGIN CREDENTIALS
        const { email, password } = req.body;

        // VALIDATE REQUIRED FIELDS
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // FIND REGISTERED USER
        const user = await db.collection("users").findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // VERIFY PASSWORD AGAINST STORED HASH
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // GENERATE JWT TOKEN (EXPIRES IN 1 HOUR)
        const token = jwt.sign(
            { userId: user._id.toString(), email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        // RETURN TOKEN AFTER SUCCESSFUL LOGIN
        res.json({
            message: "Login successful",
            token: token
        });

    } catch (error) {
        // LOG AND HANDLE LOGIN ERRORS
        console.error("Login error:", error.message);
        res.status(500).json({ error: "Login failed" });
    }
});

// GET - ACCESS PROTECTED PROFILE USING JWT
// ARC: GET /profile
app.get("/profile", (req, res) => {
    const jwt = require("jsonwebtoken");

    // READ AUTHORIZATION HEADER
    const authHeader = req.headers.authorization;

    // CHECK IF BEARER TOKEN IS PROVIDED
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Access denied. Token required" });
    }

    // EXTRACT JWT FROM AUTHORIZATION HEADER
    const token = authHeader.split(" ")[1];

    try {
        // VERIFY JWT SIGNATURE AND EXPIRATION
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // RETURN USER INFORMATION FROM VERIFIED TOKEN
        res.json({
            message: "Protected route accessed successfully",
            userId: decoded.userId,
            email: decoded.email
        });

    } catch (error) {
        // REJECT INVALID OR EXPIRED TOKENS
        res.status(401).json({ error: "Invalid or expired token" });
    }
});

// GET - TEST GEMINI AI CONNECTION
// ARC: GET /gemini/test
app.get("/gemini/test", async (req, res) => {
    try {
        // SEND TEST PROMPT TO GEMINI
        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: "Reply with: QA Pulse Gemini connection successful"
        });

        // RETURN GEMINI RESPONSE
        res.json({ message: response.text });

    } catch (error) {
        // HANDLE GEMINI API ERRORS
        console.error("Gemini error:", error.message);

        res.status(500).json({
            error: "Gemini connection failed"
        });
    }
});

// POST - SEARCH TEST CASES USING NATURAL LANGUAGE
// ARC: POST /gemini/query
app.post("/gemini/query", async (req, res) => {
    try {
        // VALIDATE QUESTION
        const { question } = req.body;

        if (typeof question !== "string" || !question.trim()) {
            return res.status(400).json({ error: "Question is required" });
        }

        // ASK GEMINI TO GENERATE A SEARCH FILTER
        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: question,
            config: {
                systemInstruction: `
                    Convert the user's question into a MongoDB filter.
                    Only use the fields "status" and "priority".
                    Return a JSON object containing a "filter" property.
                    Only use exact string equality.
                    Do not generate MongoDB operators or executable code.
                    If the question cannot be answered using these fields,
                    return {"filter":{}}.
                `,
                responseMimeType: "application/json"
            }
        });

        // PARSE GEMINI RESPONSE
        const generated = JSON.parse(response.text);

        // VALIDATE GENERATED FILTER
        const filter = generated.filter;

        if (!filter || typeof filter !== "object" ||
            Array.isArray(filter)) {
            return res.status(422).json({ error: "Invalid AI-generated filter" });
        }

        const allowedFields = ["status", "priority"];

        for (const [field, value] of Object.entries(filter)) {
            if (!allowedFields.includes(field) ||
                typeof value !== "string") {
                return res.status(422).json({ error: "Unsupported AI-generated filter" });
            }
        }

        // SEARCH TEST CASES IN MONGODB
        const testCases = await db.collection("test_cases")
            .find(
                Object.fromEntries(
                    Object.entries(filter).map(([field, value]) => [
                        field,
                        { $regex: `^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }
                    ])
                )
            )
            .limit(50)
            .toArray();

        // RETURN FILTER AND MATCHING RESULTS
        res.json({
            question,
            filter,
            count: testCases.length,
            results: testCases
        });

    } catch (error) {
        // HANDLE AI OR DATABASE ERRORS
        console.error("Gemini query error:", error.message);

        res.status(500).json({ error: "AI query failed" });
    }
});


// POST - GENERATE STRUCTURED TEST CASE USING GEMINI
// ARC: POST /gemini/generate-test-case
app.post("/gemini/generate-test-case", async (req, res) => {
    try {
        // VALIDATE REQUIREMENT
        const { requirement } = req.body;

        if (typeof requirement !== "string" || !requirement.trim()) {
            return res.status(400).json({ error: "Requirement is required" });
        }

        // GENERATE STRUCTURED JSON USING SYSTEM INSTRUCTIONS
        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: requirement,
            config: {
                systemInstruction: `
                    You are a software QA test case generator.
                    Generate one test case based on the user's requirement.
                    Return only a JSON object with these fields:
                    title, description, status, priority.
                    status must always be "Not Run".
                    priority must be "Low", "Medium", or "High".
                    Do not include additional fields.
                `,
                responseMimeType: "application/json"
            }
        });

        // VALIDATE GENERATED RESPONSE
        const testCase = JSON.parse(response.text);

        if (
            !testCase ||
            typeof testCase !== "object" ||
            Array.isArray(testCase) ||
            typeof testCase.title !== "string" ||
            !testCase.title.trim() ||
            typeof testCase.description !== "string" ||
            !testCase.description.trim() ||
            testCase.status !== "Not Run" ||
            !["Low", "Medium", "High"].includes(testCase.priority) ||
            Object.keys(testCase).length !== 4
        ) {
            return res.status(422).json({ error: "Invalid AI-generated test case" });
        }

        // RETURN GENERATED TEST CASE
        res.json({
            message: "Test case generated successfully",
            testCase
        });

    } catch (error) {
        // HANDLE GEMINI ERRORS
        console.error("Gemini generation error:", error.message);

        res.status(500).json({ error: "Test case generation failed" });
    }
});

// POST - GENERATE AND SAVE MOCK TEST CASES USING GEMINI
// ARC: POST /gemini/generate-mock-data
app.post("/gemini/generate-mock-data", async (req, res) => {
    try {
        // EXTRACT PROJECT ID AND TESTING REQUIREMENT
        const { projectId, requirement } = req.body;

        // VALIDATE REQUEST FIELDS
        if (!ObjectId.isValid(projectId) ||
            typeof requirement !== "string" ||
            !requirement.trim()) {
            return res.status(400).json({ error: "Valid projectId and requirement are required" });
        }

        // CHECK THAT THE PROJECT EXISTS
        const project = await db.collection("projects").findOne({
            _id: new ObjectId(projectId)
        });

        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        // ASK GEMINI TO GENERATE THREE MOCK TEST CASES
        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: requirement,
            config: {
                systemInstruction: `
                    You are a software QA test data generator.
                    Generate exactly 3 distinct mock test cases
                    based on the user's testing requirement.

                    Return a JSON object with one property:
                    "testCases", containing an array of 3 objects.

                    Each test case must contain exactly:
                    title, description, status, priority.

                    status must always be "Not Run".
                    priority must be "Low", "Medium", or "High".
                    Use realistic and distinct test scenarios.
                    Do not include additional fields.
                `,
                responseMimeType: "application/json"
            }
        });

        // PARSE AND VALIDATE GEMINI RESPONSE
        const generated = JSON.parse(response.text);
        const testCases = generated?.testCases;

        if (!Array.isArray(testCases) || testCases.length !== 3) {
            return res.status(422).json({ error: "Gemini did not generate exactly 3 test cases" });
        }

        const valid = testCases.every(testCase =>
            testCase &&
            typeof testCase === "object" &&
            !Array.isArray(testCase) &&
            Object.keys(testCase).length === 4 &&
            typeof testCase.title === "string" &&
            testCase.title.trim() &&
            typeof testCase.description === "string" &&
            testCase.description.trim() &&
            testCase.status === "Not Run" &&
            ["Low", "Medium", "High"].includes(testCase.priority)
        );

        if (!valid) {
            return res.status(422).json({ error: "Invalid AI-generated mock test cases" });
        }

        // PREVENT DUPLICATE TITLES WITHIN THE GENERATED BATCH
        const titles = testCases.map(testCase =>
            testCase.title.trim().toLowerCase()
        );

        if (new Set(titles).size !== titles.length) {
            return res.status(422).json({ error: "Gemini generated duplicate test case titles" });
        }

        // PREVENT DUPLICATES ALREADY STORED FOR THIS PROJECT
        const existing = await db.collection("test_cases").find({
            projectId: new ObjectId(projectId)
        }).project({ title: 1 }).toArray();

        const existingTitles = new Set(
            existing.map(testCase => testCase.title.trim().toLowerCase())
        );

        if (titles.some(title => existingTitles.has(title))) {
            return res.status(409).json({ error: "One or more generated test cases already exist in this project" });
        }

        // LINK GENERATED TEST CASES TO THE EXISTING PROJECT
        const mockData = testCases.map(testCase => ({
            title: testCase.title.trim(),
            description: testCase.description.trim(),
            status: testCase.status,
            priority: testCase.priority,
            projectId: new ObjectId(projectId)
        }));

        // SAVE MOCK DATA TO MONGODB
        const result = await db.collection("test_cases").insertMany(mockData);

        // RETURN GENERATED RECORDS AND INSERTED IDS
        res.status(201).json({
            message: "AI-generated mock test cases saved successfully",
            projectId,
            insertedCount: result.insertedCount,
            insertedIds: result.insertedIds,
            testCases: mockData
        });

    } catch (error) {
        // HANDLE GEMINI OR DATABASE ERRORS
        console.error("Mock data generation error:", error.message);

        res.status(500).json({ error: "Mock data generation failed" });
    }
});

// CONNECT TO MONGODB BEFORE STARTING EXPRESS SERVER
async function startServer() {
    try {
        // ESTABLISH MONGODB CONNECTION
        await client.connect();

        // VERIFY MONGODB CONNECTION
        await db.command({ ping: 1 });

        console.log("Connected to MongoDB Atlas");

        // START EXPRESS SERVER
        app.listen(PORT, () => { console.log(`QA Pulse API running on port ${PORT}`); });

    } catch (error) {
        // HANDLE MONGODB CONNECTION FAILURE
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
}

startServer();
