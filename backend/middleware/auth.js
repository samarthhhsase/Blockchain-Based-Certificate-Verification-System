const { authenticate } = require('./authMiddleware');
const { authorizeRoles } = require('./roleMiddleware');

function authorize(...roles) {
  return authorizeRoles(...roles);
}

module.exports = { authenticate, authorize, authorizeRoles };
