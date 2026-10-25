const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// In-Memory Collections
const collections = {
  users: [],
  services: [],
  escalationPolicies: [],
  incidents: [],
  webhookLogs: [],
};

// Helper for deep clone to prevent mutation bugs
const clone = (obj) => JSON.parse(JSON.stringify(obj));

class CollectionHandler {
  constructor(name) {
    this.name = name;
  }

  get data() {
    return collections[this.name];
  }

  async find(query = {}) {
    let results = clone(this.data);
    for (const [key, val] of Object.entries(query)) {
      if (val && typeof val === 'object' && val.$ne !== undefined) {
        results = results.filter((item) => item[key] !== val.$ne);
      } else if (val !== undefined) {
        results = results.filter((item) => String(item[key]) === String(val));
      }
    }
    // Return with sort/limit chainable helpers
    return {
      results,
      sort: (sortObj) => {
        const sortKeys = Object.keys(sortObj);
        if (sortKeys.length > 0) {
          const key = sortKeys[0];
          const dir = sortObj[key];
          results.sort((a, b) => {
            const valA = new Date(a[key]).getTime() || a[key];
            const valB = new Date(b[key]).getTime() || b[key];
            return dir === -1 ? (valA < valB ? 1 : -1) : (valA > valB ? 1 : -1);
          });
        }
        return results;
      },
      then: (resolve) => resolve(results),
    };
  }

  async findOne(query = {}) {
    const list = await this.find(query);
    const item = Array.isArray(list) ? list[0] : (list.results && list.results[0]) || null;
    if (!item) return null;
    return this.wrapDoc(clone(item));
  }

  async findById(id) {
    const item = this.data.find((doc) => String(doc._id) === String(id));
    if (!item) return null;
    return this.wrapDoc(clone(item));
  }

  async create(docData) {
    const newDoc = {
      _id: docData._id || uuidv4(),
      ...docData,
      createdAt: docData.createdAt || new Date(),
      updatedAt: docData.updatedAt || new Date(),
    };

    // If User, hash password if plain
    if (this.name === 'users' && newDoc.password && !newDoc.password.startsWith('$2')) {
      newDoc.password = await bcrypt.hash(newDoc.password, 10);
    }

    this.data.push(newDoc);
    return this.wrapDoc(clone(newDoc));
  }

  async findByIdAndUpdate(id, updateData, options = { new: true }) {
    const index = this.data.findIndex((doc) => String(doc._id) === String(id));
    if (index === -1) return null;

    const current = this.data[index];
    const updated = {
      ...current,
      ...(updateData.$set || updateData),
      updatedAt: new Date(),
    };

    if (updateData.$inc) {
      for (const [key, val] of Object.entries(updateData.$inc)) {
        updated[key] = (Number(updated[key]) || 0) + val;
      }
    }

    if (updateData.$push) {
      for (const [key, val] of Object.entries(updateData.$push)) {
        if (!Array.isArray(updated[key])) updated[key] = [];
        updated[key].push(val);
      }
    }

    this.data[index] = updated;
    return this.wrapDoc(clone(updated));
  }

  async deleteMany(query = {}) {
    collections[this.name] = [];
    return { acknowledged: true, deletedCount: 0 };
  }

  wrapDoc(rawDoc) {
    if (!rawDoc) return null;
    const self = this;
    const doc = { ...rawDoc };

    // Attach save() method
    doc.save = async function () {
      const idx = self.data.findIndex((d) => String(d._id) === String(this._id));
      this.updatedAt = new Date();
      if (idx !== -1) {
        self.data[idx] = clone(this);
      } else {
        self.data.push(clone(this));
      }
      return this;
    };

    // Attach comparePassword if user
    if (self.name === 'users') {
      doc.comparePassword = async function (cand) {
        return bcrypt.compare(cand, this.password);
      };
    }

    return doc;
  }
}

module.exports = {
  collections,
  UserStore: new CollectionHandler('users'),
  ServiceStore: new CollectionHandler('services'),
  EscalationPolicyStore: new CollectionHandler('escalationPolicies'),
  IncidentStore: new CollectionHandler('incidents'),
  WebhookLogStore: new CollectionHandler('webhookLogs'),
};
