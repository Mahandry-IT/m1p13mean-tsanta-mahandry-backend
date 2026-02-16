const User = require('../models/user.model');
const { upload } = require('../utils/upload');
const { env } = require('../config/env');

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
  const res = await User.findById(id);
  res.status = 'inactive';
  await res.save();
  return true;
}

async function create(userId, profileData, file) {
  const user = await User.findById(userId);
  if (!user) return null;

  let avatarUrl = user.profile?.avatarUrl || null;

  if (file && file.buffer) {
    const result = await upload({ folder: 'avatars', resource_type: 'image', file });
    avatarUrl = result.secure_url;
  }

  user.profile = {
    ...user.profile?.toObject?.() || {},
    firstName: profileData.firstName,
    lastName: profileData.lastName,
    phone: profileData.phone,
    gender: profileData.gender,
    birthday: profileData.birthday,
    avatarUrl
  };

  await user.save();
  return user;
}

module.exports = { list, getById, create, update, remove };
