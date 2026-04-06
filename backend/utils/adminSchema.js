const { ensureApplicationSchema } = require('./schemaSync');

async function ensureAdminSchema() {
  await ensureApplicationSchema();
}

module.exports = { ensureAdminSchema };
