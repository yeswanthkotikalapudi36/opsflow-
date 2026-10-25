const db = require('../db');
const inMemory = require('../db/inMemoryStore');

const MongooseUser = require('./User');
const MongooseService = require('./Service');
const MongooseEscalationPolicy = require('./EscalationPolicy');
const MongooseIncident = require('./Incident');
const MongooseWebhookLog = require('./WebhookLog');

const createModelProxy = (mongooseModel, memoryStore) => {
  return new Proxy(mongooseModel, {
    get(target, prop) {
      if (db.dbMode === 'embedded') {
        if (typeof memoryStore[prop] === 'function') {
          return memoryStore[prop].bind(memoryStore);
        }
        return memoryStore[prop];
      }
      return target[prop];
    },
  });
};

module.exports = {
  User: createModelProxy(MongooseUser, inMemory.UserStore),
  Service: createModelProxy(MongooseService, inMemory.ServiceStore),
  EscalationPolicy: createModelProxy(MongooseEscalationPolicy, inMemory.EscalationPolicyStore),
  Incident: createModelProxy(MongooseIncident, inMemory.IncidentStore),
  WebhookLog: createModelProxy(MongooseWebhookLog, inMemory.WebhookLogStore),
  inMemory,
};
