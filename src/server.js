const mqtt = require("mqtt");
const { MongoClient } = require("mongodb");
const config = require("./config");

const mqttUri = `mqtt://${config.mqtt.hostname}:${config.mqtt.port}`;
const mqttClient = mqtt.connect(mqttUri);

const mongoUri = `mongodb://${config.mongodb.hostname}:${config.mongodb.port}`;
const client = new MongoClient(mongoUri);
const database = client.db(config.mongodb.database);
const petsCollection = database.collection('petsCollection');
const statisticsCollection = database.collection('statisticsCollection');

mqttClient.on("connect", () => {
    mqttClient.subscribe("sensor", (err) => {
        if (!err) {
            console.log("MQTT Client connected");
        }
    });
});

mqttClient.on("message", async (topic, message) => {
    try {
        const data = JSON.parse(message.toString());
        await saveData(data); // Guardar los datos en la base de datos
    } catch (err) {
        console.error(`Error: ${err}`);
    }
});

async function saveData(data) {
    try {
        if (data.Id !== undefined && data.Name !== undefined && data.ResponseTime !== undefined && data.Type !== undefined && data.DateTime !== undefined) {
            await petsCollection.insertOne({
                Id: data.Id,
                Name: data.Name,
                ResponseTime: data.ResponseTime,
                Type: data.Type,
                DateTime: new Date(data.DateTime),
            });
            console.log("Data saved in first collection");

            const count = await petsCollection.countDocuments({ Id: data.Id });

            if (count >= 3) {
                const average = await calculateAverage(data.Id);
                const score = assignScore(average);

                if (average != null) {
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

                    console.log("Data saved or updated in second collection");

                    mqttClient.publish("response", JSON.stringify({ Id: data.Id, Puntaje: score }));

                    console.log("Enviando datos:" + JSON.stringify({ Id: data.Id, Puntaje: score }))
                }
            }
        }
    } catch (error) {
        console.error(`Error saving data: ${error}`);
    }
}

async function calculateAverage(Id) {
    const results = await petsCollection.find({ Id: Id }).toArray();
    const count = results.length;

    if (count < 3) {
        return null; // No calcular la media si hay menos de 3 elementos
    }

    const sum = results.reduce((a, b) => a + b.ResponseTime, 0);
    return sum / count;
}

function assignScore(average) {
    if (average <= 10) { // Se espera que se responda a la necesidad en un tiempo menor a 10 segundos
        return 3; // Se prende led verde
    } else if (average <= 30) {
        return 2; // Se prende led amarillo si se pasa 10 segundos de lo esperado
    } else {
        return 1; // Se prende led rojo si tarda más de 30 segundos
    }
}

client.connect().then(() => {
    console.log("Connected to MongoDB");
}).catch(err => {
    console.error("Failed to connect to MongoDB", err);
});
