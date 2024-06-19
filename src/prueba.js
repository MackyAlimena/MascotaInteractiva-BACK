//Se utiliza para simular el envio de datos


const mqtt = require('mqtt');

// Configura la conexión al servidor MQTT
const mqttClient = mqtt.connect('mqtt://54.144.58.228'); // Ajusta el URL según la configuración de tu servidor MQTT

mqttClient.on('connect', () => {
    console.log('MQTT connected');

    // Publica datos de prueba en el tema 'sensor'
    for(let i = 0; i <6; i++) {
        const data = {
            Id: 10,
            Name: 'Test Pet',
            ResponseTime: 1+ i, // Aumenta el ResponseTime en cada iteración
            Type: 'Dog',
            DateTime: new Date().toISOString()
        };
        mqttClient.publish('sensor', JSON.stringify(data), () => {
            console.log('Data published');
        });
    }

    mqttClient.end(); // Cierra la conexión después de publicar
});

mqttClient.on('error', (error) => {
    console.error('MQTT error:', error);
});
mqttClient.on('error', (error) => {
    console.error('MQTT error:', error);
});
