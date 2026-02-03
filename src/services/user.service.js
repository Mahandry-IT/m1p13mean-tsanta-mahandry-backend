const User = require('../models/user.model');

async function list() {
  return User.find().lean(false);
}

async function getById(id) {
  return User.findById(id).lean(false);
}

async function update(id, data) {
  const user = await User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  return user;
}

async function remove(id) {
  const res = await User.findByIdAndDelete(id);
  return !!res;
}

module.exports = { list, getById, update, remove };

