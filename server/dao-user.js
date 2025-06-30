"use strict";
/* Data Access Object (DAO) module for accessing users */

const sqlite = require("sqlite3");
const crypto = require("crypto");

// open the database
const db = new sqlite.Database("forum.db", (err) => {
  if (err) throw err;
});

/**
 * Retrieves a user by their ID
 *
 * Returns all relevant user fields including 2FA secret (if present)
 * Used internally for authorization, session, or admin checks
 *
 * @param {number} id - ID of the user to retrieve
 * @returns Resolves to the user object or an error if not found
 */
exports.getUserById = (id) => {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM users WHERE id = ?";
    db.get(sql, [id], (err, row) => {
      if (err) reject(err);
      else if (row === undefined) resolve({ error: "User not found." });
      else {
        const user = { id: row.id, username: row.username, admin: row.admin, secret: row.secret };
        resolve(user);
      }
    });
  });
};

/**
 * Authenticates a user by verifying their username and password
 *
 * - Retrieves the stored password hash and salt for the given username
 * - If authentication succeeds, returns user data (including 2FA secret if present)
 *
 * @param {string} username - The user's username
 * @param {string} password - The plain text password to verify
 * @returns Resolves to user object if credentials are valid, otherwise false
 */
exports.getUser = (username, password) => {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM users WHERE username = ?";
    db.get(sql, [username], (err, row) => {
      if (err) {
        reject(err);
      } else if (row === undefined) {
        resolve(false);
      } else {
        const user = { id: row.id, username: row.username, admin: row.admin, secret: row.secret };

        // Retrieve the salt from the DB
        const salt = row.salt;

        // Generate hash of password entered by user
        crypto.scrypt(password, salt, 32, (err, hashedPassword) => {
          if (err) reject(err);

          // Retrieve the hashed password from the DB
          const passwordHex = Buffer.from(row.password, "hex");

          // If the password entered and the one in the DB match, returns user
          if (!crypto.timingSafeEqual(passwordHex, hashedPassword)) resolve(false);
          else resolve(user);
        });
      }
    });
  });
};
