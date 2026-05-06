// Cloudinary configuration
const CLOUDINARY_CONFIG = {
  cloudName: 'drjn5sbwz',
  apiKey: '365558283616369',
};

/**
 * Transforma una URL de Cloudinary para obtener una versión redimensionada
 * @param {string} imageUrl - URL de la imagen original
 * @param {Object} options - Opciones de transformación
 * @returns {string} URL transformada
 */
export function getCloudinaryUrl(imageUrl, options = {}) {
  if (!imageUrl) return '';

  // Si ya es una URL de Cloudinary, aplicar transformaciones
  if (imageUrl.includes('cloudinary.com')) {
    const {
      width = 100,
      height = 100,
      crop = 'fill',
      quality = 'auto',
      fetch = 'auto',
    } = options;

    // Insertar los parámetros de transformación en la URL
    const transformUrl = imageUrl.replace(
      '/upload/',
      `/upload/w_${width},h_${height},c_${crop},q_${quality},f_${fetch}/`
    );
    return transformUrl;
  }

  // Si es una URL externa, dejarla como está
  return imageUrl;
}

/**
 * Obtiene una miniatura de la imagen
 * @param {string} imageUrl - URL de la imagen
 * @returns {string} URL de la miniatura
 */
export function getThumbnail(imageUrl) {
  return getCloudinaryUrl(imageUrl, {
    width: 50,
    height: 50,
    quality: 'auto',
  });
}

/**
 * Obtiene una imagen de tamaño medio
 * @param {string} imageUrl - URL de la imagen
 * @returns {string} URL de la imagen media
 */
export function getMediumImage(imageUrl) {
  return getCloudinaryUrl(imageUrl, {
    width: 300,
    height: 300,
    crop: 'fit',
    quality: 'auto',
  });
}

/**
 * Obtiene una imagen de tamaño grande
 * @param {string} imageUrl - URL de la imagen
 * @returns {string} URL de la imagen grande
 */
export function getLargeImage(imageUrl) {
  return getCloudinaryUrl(imageUrl, {
    width: 600,
    height: 600,
    crop: 'fit',
    quality: 'auto',
  });
}

export default CLOUDINARY_CONFIG;
