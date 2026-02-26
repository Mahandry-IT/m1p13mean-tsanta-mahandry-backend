const User = require('../models/user.model');
const { upload } = require('../utils/upload');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

async function list() {
  return User.find().lean(false);
}

async function listPaginated(filters = {}) {
  const query = {};

  // filtres optionnels
  if (filters.status) query.status = filters.status;
  if (filters.roleId) query.roleId = filters.roleId;

  // recherche simple (username/email)
  if (filters.q) {
    const q = String(filters.q).trim();
    if (q) {
      query.$or = [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }
  }

  const { page, limit, skip } = getPagination(filters, { defaultPage: 1, defaultLimit: 20, maxLimit: 100 });

  const [users, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(false),
    User.countDocuments(query)
  ]);

  return {
    users,
    pagination: buildPaginationMeta({ total, page, limit })
  };
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

async function checkProfile({email}) {
  const user = await User.findOne({email});
  const value = (!user && !user.profile);
  return { hasProfile: value}
}

module.exports = { list, listPaginated, getById, create, update, remove, checkProfile };
