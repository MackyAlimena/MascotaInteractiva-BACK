const mqtt = require("mqtt");
const { MongoClient } = require("mongodb");
const config = require("./config");
const crypto = require('crypto');
const algorithm = 'aes-256-ctr';
const secretKey = 'vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3'; // replace with your own secret key

const mqttUri = `mqtt://${config.mqtt.hostname}:${config.mqtt.port}`;
const mqttClient = mqtt.connect(mqttUri);

const mongoUri = `mongodb://${config.mongodb.hostname}:${config.mongodb.port}`;
const client = new MongoClient(mongoUri);
const database = client.db(config.mongodb.database);
const petsCollection = database.collection('petsCollection');
const statisticsCollection = database.collection('statisticsCollection');
const usersCollection = database.collection('users');

const newUser = {
    username: "Refugio Patitas",
    password: "electro2024"
};

usersCollection.insertOne(newUser)
    .then(result => console.log(`Successfully inserted item with _id: ${result.insertedId}`))
    .catch(err => console.error(`Failed to insert item: ${err}`));

mqttClient.on("connect", () => {
    mqttClient.subscribe("sensor", (err) => {
        if (!err) {
            console.log("Subscribed to sensor topic");
        }
    });
    mqttClient.subscribe("request", (err) => {
        if (!err) {
            console.log("Subscribed to request topic");
        }
    });
    mqttClient.subscribe("login", (err) => {
        if (!err) {
            console.log("Subscribed to login topic");
        }
    });
});

function decrypt(hash) {
    const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(hash.iv, 'hex'));
    const decrpyted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()]);
    return decrpyted.toString();
}

mqttClient.on("message", async (topic, message) => {
    console.log(`Received message on topic ${topic}`);
    try {
        const data = JSON.parse(message.toString());
        console.log(`Parsed message data: ${JSON.stringify(data)}`);
        if (topic === "sensor") {
            console.log("Saving sensor data");
            await saveData(data);
        } else if (topic === "request") {
            console.log("Processing request");
            if (data.type === "pets") {
                console.log("Fetching pets data");
                const petsData = await petsCollection.find().toArray();
                console.log(`Publishing pets data: ${JSON.stringify(petsData)}`);
                mqttClient.publish("petsResponse", JSON.stringify(petsData));
            } else if (data.type === "statistics") {
                console.log("Fetching statistics data");
                const statisticsData = await statisticsCollection.find().toArray();
                console.log(`Publishing statistics data: ${JSON.stringify(statisticsData)}`);
                mqttClient.publish("statsResponse", JSON.stringify(statisticsData));
            }
        }
        if (topic === "login") {
            console.log("Processing login");
            const decrypted = decrypt(data);
            console.log("Decrypted data: ", decrypted);
            const [username, password] = decrypted.split(':');
            const user = await usersCollection.findOne({ username: username });
            console.log("User from database: ", user);
            if (user && user.password === password) {
                console.log("Login Successful");
                mqttClient.publish("loginResponse", JSON.stringify({ success: true }));
            } else {
                console.log("Login Failed");
                mqttClient.publish("loginResponse", JSON.stringify({ success: false }));
            }
        }
    } catch (err) {
        console.error(`Error: ${err}`);
    }
});

async function saveData(data) {
    console.log("Saving data");
    try {
        if (data.Id !== undefined && data.Name !== undefined && data.ResponseTime !== undefined && data.Type !== undefined && data.DateTime !== undefined) {
            console.log("Data is valid, saving to petsCollection");
            await petsCollection.insertOne({
                Id: data.Id,
                Name: data.Name,
                ResponseTime: data.ResponseTime,
                Type: data.Type,
                DateTime: new Date(data.DateTime),
            });
            console.log("Data saved in petsCollection");

            const count = await petsCollection.countDocuments({ Id: data.Id });
            console.log(`Count of documents with Id ${data.Id}: ${count}`);

            if (count >= 3) {
                console.log("Count is greater than or equal to 3, calculating average");
                const average = await calculateAverage(data.Id);
                const score = assignScore(average);

                if (average != null) {
                    console.log("Average is not null, saving or updating data in statisticsCollection");
                    await statisticsCollection.updateOne(
                        { Id: data.Id },
                        {
                            $set: {
                                Media: average,
                                Puntaje: score,
                            },
                        },
                        { upsert: true }
                    );

                    console.log("Data saved or updated in statisticsCollection");

                    mqttClient.publish("response", JSON.stringify({ Id: data.Id, Puntaje: score }));

                    console.log("Published data: " + JSON.stringify({ Id: data.Id, Puntaje: score }))
                }
            }
        }
    } catch (error) {
        console.error(`Error saving data: ${error}`);
    }
}

async function calculateAverage(Id) {
    console.log(`Calculating average for Id ${Id}`);
    const results = await petsCollection.find({ Id: Id }).toArray();
    const count = results.length;

    if (count < 3) {
        console.log("Count is less than 3, returning null");
        return null; // No calcular la media si hay menos de 3 elementos
    }

    const sum = results.reduce((a, b) => a + b.ResponseTime, 0);
    const average = sum / count;
    console.log(`Calculated average: ${average}`);
    return average;
}

function assignScore(average) {
    console.log(`Assigning score for average ${average}`);
    if (average <= 10) { // Se espera que se responda a la necesidad en un tiempo menor a 10 segundos
        console.log("Score is 3");
        return 3; // Se prende led verde
    } else if (average <= 30) {
        console.log("Score is 2");
        return 2; // Se prende led amarillo si se pasa 10 segundos de lo esperado
    } else {
        console.log("Score is 1");
        return 1; // Se prende led rojo si tarda más de 30 segundos
    }
}

client.connect().then(() => {
    console.log("Connected to MongoDB");
}).catch(err => {
    console.error("Failed to connect to MongoDB", err);
});