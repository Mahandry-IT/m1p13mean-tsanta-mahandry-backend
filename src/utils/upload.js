const { cloudinary } = require('../config/cloudinary');
const { env } = require('../config/env');

/**
 * Upload un fichier vers Cloudinary
 * @param {Object} params
 * @param {string} params.folder - Dossier Cloudinary (ex: 'avatars')
 * @param {('image'|'video'|'raw')} params.resource_type - Type de ressource Cloudinary
 * @param {Object} params.file - Objet fichier (buffer requis)
 * @returns {Promise<{ secure_url: string }>} Résultat d'upload
 */
async function upload({ folder, resource_type = 'image', file }) {
  if (!file || !file.buffer) {
    const err = new Error('Fichier manquant');
    err.status = 400;
    throw err;
  }

  if (file.size && file.size > env.MAX_UPLOAD_SIZE) {
    const err = new Error('Fichier trop volumineux');
    err.status = 413;
    throw err;
  }

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder,
      resource_type
    }, (error, uploaded) => {
      if (error) return reject(error);
      resolve(uploaded);
    });
    stream.end(file.buffer);
  });

  return result;
}

module.exports = { upload };
