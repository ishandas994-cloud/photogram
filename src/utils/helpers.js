/**
 * Shared utilities for the Photogram API
 */

/**
 * Extract unique lowercase hashtags from a caption string.
 * @param {string} text
 * @returns {string[]}
 */
const extractHashtags = (text = '') =>
  [...new Set((text.match(/#[a-zA-Z0-9_]+/g) || []).map(t => t.slice(1).toLowerCase()))];

/**
 * Extract @mentions from a caption string.
 * @param {string} text
 * @returns {string[]}
 */
const extractMentions = (text = '') =>
  [...new Set((text.match(/@[a-zA-Z0-9._]+/g) || []).map(m => m.slice(1).toLowerCase()))];

/**
 * Build cursor-based pagination metadata.
 * @param {any[]} rows - fetched rows
 * @param {number} limit - requested limit
 * @param {string} cursorField - field to use as next cursor (e.g. 'created_at')
 * @returns {{ hasMore: boolean, nextCursor: any|null }}
 */
const buildCursor = (rows, limit, cursorField = 'created_at') => ({
  hasMore:    rows.length === limit,
  nextCursor: rows.length === limit ? rows[rows.length - 1][cursorField] : null,
});

/**
 * Strip sensitive fields from a user object before sending to client.
 * @param {object} user
 * @returns {object}
 */
const sanitizeUser = (user) => {
  const { password_hash, ...safe } = user;
  return safe;
};

/**
 * Convert MB value to bytes.
 * @param {number} mb
 * @returns {number}
 */
const mbToBytes = (mb) => mb * 1024 * 1024;

/**
 * Clamp a number between min and max.
 */
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

/**
 * Parse safe pagination params from query string.
 * @param {object} query - req.query
 * @param {{ defaultLimit?: number, maxLimit?: number }} opts
 * @returns {{ limit: number, offset: number }}
 */
const parsePagination = (query = {}, { defaultLimit = 20, maxLimit = 50 } = {}) => ({
  limit:  clamp(parseInt(query.limit  || defaultLimit), 1, maxLimit),
  offset: Math.max(parseInt(query.offset || 0), 0),
});

/**
 * Return true if a mimetype is an image type we accept.
 */
const isAllowedImage = (mimetype) =>
  ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimetype);

/**
 * Return true if a mimetype is an allowed video type.
 */
const isAllowedVideo = (mimetype) =>
  ['video/mp4', 'video/webm'].includes(mimetype);

module.exports = {
  extractHashtags,
  extractMentions,
  buildCursor,
  sanitizeUser,
  mbToBytes,
  clamp,
  parsePagination,
  isAllowedImage,
  isAllowedVideo,
};