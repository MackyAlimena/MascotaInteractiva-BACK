const config = {};

config.debug = process.env.DEBUG || true;

config.mqtt  = {};
config.mqtt.namespace = process.env.MQTT_NAMESPACE || '#'; //Se refiere a que temas te vas a querer suscribir
//acá va la IP privada del servidor AWS de MQTT
config.mqtt.hostname  = process.env.MQTT_HOSTNAME  || '172.31.31.191' ;//Aca se especifica el ip del broker, en mi caso es de AWS MyServidor
config.mqtt.port      = process.env.MQTT_PORT      || 1883; //Puerto por defecto del broker

config.mongodb = {};
config.mongodb.hostname   = process.env.MONGODB_HOSTNAME   || '127.0.0.1'; //Direccion Ip del servidor de base de datos
config.mongodb.port       = process.env.MONGODB_PORT       || 27017;
config.mongodb.database   = process.env.MONGODB_DATABASE   || 'myDB';//Aquí se especifica el nombre de la base de datos MongoDB a la que te estás conectando.
config.mongodb.collections = process.env.MONGODB_COLLECTION|| 'message';

module.exports = config;