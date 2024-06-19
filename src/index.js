const cors = require('cors');
const express = require('express');
const { MongoClient } = require('mongodb');
const config = require('./config');

const app = express();
const port = 3000;

const mongoUri = `mongodb://${config.mongodb.hostname}:${config.mongodb.port}`;
const client = new MongoClient(mongoUri);
const database = client.db(config.mongodb.database);
const petsCollection = database.collection('petsCollection');
const statisticsCollection = database.collection('statisticsCollection');

const corsOptions = {
    origin: '*', // Allow all origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Specify allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Specify allowed headers
    credentials: true, // Enable cookies to be sent with requests
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/pets", async (req, res) => {
    try {
        await client.connect();
        const data = await petsCollection.find().toArray();
        console.log(data)
        res.json(data);
    } catch (error) {
        res.status(500).send(error.message);
    } finally {
        await client.close();
    }
});

app.get("/statistics", async (req, res) => {
    try {
        await client.connect();
        const data = await statisticsCollection.find().toArray();
        res.json(data);
    } catch (error) {
        res.status(500).send(error.message);
    } finally {
        await client.close();
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
