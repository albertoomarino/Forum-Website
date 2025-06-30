"use strict";

const sqlite = require("sqlite3");
const dayjs = require("dayjs");

// Open the database
const db = new sqlite.Database("forum.db", (err) => {
  if (err) throw err;
  // Enables enforcement of FOREIGN KEY constraints (required for ON DELETE CASCADE)
  db.run("PRAGMA foreign_keys = ON");
});

/**
 * Retrieves the full list of posts, including:
 * - Title, text, publication date
 * - Associated author's username
 * - Total number of comments for each post
 *
 * Posts are ordered from newest to oldest by publication date
 *
 * @returns Resolves to an array of post objects
 */
exports.listPosts = () => {
  return new Promise((resolve, reject) => {
    /**
     * - JOIN between posts and users: links each post to its author using posts.userId = users.id,
     *   allowing the username to be displayed
     * - LEFT JOIN with comments: associates each post with its comments through posts.id = comments.postId
     *   LEFT JOIN is used to include posts without comments, which would otherwise be excluded
     * - GROUP BY posts.id: groups the results by post, enabling the calculation of a single aggregated
     *   value per post, such as the number of comments
     * - COUNT(comments.id): counts how many comments each post has received. The use of comments.id
     *   ensures NULL values are ignored, so posts without comments are counted as 0
     * - ORDER BY posts.date DESC: sorts posts from the most recent to the oldest, as required by the
     *   project specifications
     */
    const sql = `
    SELECT posts.id, posts.title, posts.text, posts.maxComments, posts.date, users.username, 
    COUNT(comments.id) AS commentCount 
    FROM posts
    JOIN users ON posts.userId = users.id
    LEFT JOIN comments ON posts.id = comments.postId
    GROUP BY posts.id
    ORDER BY posts.date DESC;`;
    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      const posts = rows.map((p) => ({
        id: p.id,
        title: p.title,
        userId: p.userId,
        username: p.username,
        text: p.text,
        commentCount: p.commentCount,
        maxComments: p.maxComments,
        date: dayjs(p.date).format("YYYY-MM-DD HH:mm:ss"),
      }));
      resolve(posts);
    });
  });
};

/**
 * Retrieves the details of a specific post by its ID
 * Includes:
 * - Title, text, publication date
 * - Maximum number of allowed comments (if set)
 * - Author's username and ID
 *
 * @param {number} id - The ID of the post to retrieve
 * @returns Resolves to a post object or an error if not found
 */
exports.getPost = (id) => {
  return new Promise((resolve, reject) => {
    /**
     * - JOIN between posts and users: links the post to its author via posts.userId = users.id,
     *   enabling the retrieval of the author's username and ID
     * - LEFT JOIN with comments: ensures that posts with no comments are still included in the result
     * - COUNT(comments.id): counts how many comments are associated with the post;
     *   NULL values (from posts without comments) are excluded
     * - WHERE posts.id = ?: filters the query to return only the post with the specified ID
     * - GROUP BY posts.id: required when using aggregate functions like COUNT together with
     *   non-aggregated columns (title, text, etc.)
     */
    const sql = `
      SELECT posts.id AS postId, posts.title, posts.text, posts.date, posts.maxComments, 
        users.username, users.id AS userId,
      COUNT(comments.id) AS commentCount
      FROM posts 
      JOIN users ON posts.userId = users.id
      LEFT JOIN comments ON posts.id = comments.postId
      WHERE posts.id = ?
      GROUP BY posts.id`;
    db.get(sql, [id], (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      if (!row) {
        resolve({ error: "Post not found." });
      } else {
        const post = {
          id: row.postId,
          title: row.title,
          text: row.text,
          date: dayjs(row.date).format("YYYY-MM-DD HH:mm:ss"),
          maxComments: row.maxComments,
          username: row.username,
          userId: row.userId,
          commentCount: row.commentCount,
        };
        resolve(post);
      }
    });
  });
};

/**
 * Retrieves all comments associated with a specific post
 * Includes:
 * - Comment text, date, author's username (if available)
 * - Count of "interesting" flags per comment
 * - Boolean "markedByMe" indicating whether the current user flagged the comment
 *
 * Behavior:
 * - If userId is null (anonymous user), only anonymous comments are shown
 * - If userId is set, includes visibility of user's own "interesting" flags
 *
 * @param {number} postId - ID of the post whose comments are being requested
 * @param {number|null} userId - ID of the requesting user or null for anonymous
 * @returns Resolves to an array of comment objects
 */
exports.getCommentsByPostId = (postId, userId) => {
  return new Promise((resolve, reject) => {
    /**
     * - LEFT JOIN between comments and users: links each comment to its author using
     *   comments.userId = users.id, allowing the username to be displayed if the comment
     *   is not anonymous
     * - Subquery for interestingCount: counts how many users have marked the comment as
     *   interesting by querying the interesting_flags table
     * - Conditional subquery for markedByMe: returns true if the current user (if authenticated)
     *   has marked the comment as interesting; returns 0 otherwise
     * - WHERE clause with comments.postId = ?: filters comments belonging to the specified post
     * - Additional filter for unauthenticated users: if the user is not authenticated, only
     *   anonymous comments (comments.userId IS NULL) are returned
     * - ORDER BY comments.date DESC: sorts comments from the most recent to the oldest, as required
     *   by the project specifications
     */
    const sql = `
      SELECT comments.id, comments.text, comments.date, comments.userId, users.username,
      (SELECT COUNT(*) FROM interesting_flags WHERE interesting_flags.commentId = comments.id) AS interestingCount,
        ${userId !== null ? `EXISTS(SELECT 1 FROM interesting_flags WHERE commentId = comments.id AND userId = ?) AS markedByMe` : `0 AS markedByMe`}
      FROM comments
      LEFT JOIN users ON comments.userId = users.id
      WHERE comments.postId = ?
        ${userId === null ? "AND comments.userId IS NULL" : ""}
      ORDER BY comments.date DESC
    `;
    const params = userId !== null ? [userId, postId] : [postId];
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      const comments = rows.map((row) => ({
        id: row.id,
        text: row.text,
        date: row.date,
        username: row.username || null, // Comment author's username; null if the comment is anonymous
        userId: row.userId || null, // Comment author's ID; null if the comment is anonymous
        interestingCount: row.interestingCount,
        markedByMe: row.markedByMe ? true : false,
      }));
      resolve(comments);
    });
  });
};

/**
 * Creates a new post in the database
 * Automatically sets the creation date to the current timestamp
 *
 * @param {Object} post - The post object containing:
 *   - title: string
 *   - text: string
 *   - maxComments: number | null
 *   - userId: number (author ID)
 *
 * @returns Resolves to an object containing the newly created post's:
 *   - id: number
 *   - title: string
 *   - text: string
 *   - date: string (formatted as "YYYY-MM-DD HH:mm:ss")
 *   - maxComments: number | null
 *   - username: string (author's username)
 *   - commentCount: number
 */
exports.createPost = (post) => {
  return new Promise((resolve, reject) => {
    const insertSql = `INSERT INTO posts (title, text, maxComments, userId, date)
                       VALUES (?, ?, ?, ?, DATETIME('now', '+2 hours'))`;
    db.run(insertSql, [post.title, post.text, post.maxComments, post.userId], function (err) {
      if (err) {
        reject(err);
      } else {
        const postId = this.lastID;
        /**
         * - JOIN between posts and users: links each post to its author using posts.userId = users.id,
         *   allowing the author's username to be retrieved
         * - LEFT JOIN with comments: includes all posts even if they have zero comments, enabling
         *   comment counting
         * - COUNT(comments.id) AS commentCount: counts how many comments (including anonymous) are
         *   associated with the post
         * - WHERE posts.id = ?: filters to retrieve only the specific post identified by its ID
         * - GROUP BY posts.id: required when using aggregate functions (e.g., COUNT) together with
         *   selected non-aggregated fields such as title, text, date, etc.
         */
        const selectSql = `
          SELECT posts.id, posts.title, posts.text, posts.date, posts.maxComments,
                 users.username, COUNT(comments.id) AS commentCount
          FROM posts
          JOIN users ON posts.userId = users.id
          LEFT JOIN comments ON posts.id = comments.postId
          WHERE posts.id = ?
          GROUP BY posts.id
        `;
        db.get(selectSql, [postId], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: row.id,
              title: row.title,
              text: row.text,
              date: dayjs(row.date).format("YYYY-MM-DD HH:mm:ss"),
              maxComments: row.maxComments,
              username: row.username,
              commentCount: row.commentCount,
            });
          }
        });
      }
    });
  });
};

/**
 * Adds a new comment to a specific post
 * Automatically sets the creation date to the current timestamp
 * The comment may be anonymous if userId is null
 *
 * @param {Object} comment - The comment object containing:
 *   - text: string
 *   - userId: number | null (null for anonymous)
 *   - postId: number (ID of the related post)
 *
 * @returns Resolves to an object containing the newly created comment's:
 *   - id: number
 *   - text: string
 *   - date: string (timestamp of creation)
 *   - userId: number | null (null if anonymous)
 *   - username: string | null
 *   - interestingCount: number (always 0 on creation)
 *   - markedByMe: boolean (always false on creation)
 */
exports.createComment = (comment) => {
  return new Promise((resolve, reject) => {
    const insertSql = `
      INSERT INTO comments (text, userId, postId, date)
      VALUES (?, ?, ?, DATETIME('now', '+2 hours'))
    `;
    db.run(insertSql, [comment.text, comment.userId, comment.postId], function (err) {
      if (err) {
        reject(err);
      } else {
        const commentId = this.lastID;
        /**
         * - LEFT JOIN between comments and users: associates each comment with its author's username
         *   if the comment is not anonymous (i.e., comments.userId is not NULL)
         * - WHERE comments.id = ?: filters the result to return only the comment with the specified ID
         * - Returns basic comment data: id, text, date, author ID (nullable), and username (nullable)
         */
        const selectSql = `
          SELECT comments.id, comments.text, comments.date, comments.userId, users.username
          FROM comments
          LEFT JOIN users ON comments.userId = users.id
          WHERE comments.id = ?
        `;
        db.get(selectSql, [commentId], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: row.id,
              text: row.text,
              date: row.date,
              userId: row.userId,
              username: row.username || null,
              interestingCount: 0,
              markedByMe: false,
            });
          }
        });
      }
    });
  });
};

/**
 * Updates the text of a specific comment
 *
 * Behavior:
 * - If the user is an admin with TOTP authentication ("isAdminTotp" = true),
 *   they can update any comment
 * - Otherwise, the update is allowed only if the comment belongs to the user
 *
 * @param {number} commentId - ID of the comment to update
 * @param {string} newText - New content to replace the existing text
 * @param {number} userId - ID of the user attempting the update
 * @param {boolean} isAdminTotp - Whether the user is an admin authenticated via TOTP
 *
 * @returns Resolves to { updated: true } or an error object
 */
exports.updateComment = (commentId, newText, userId, isAdminTotp = false) => {
  return new Promise((resolve, reject) => {
    /**
     * - If the user is an admin authenticated with TOTP, the userId check is skipped:
     *   the comment can be updated indipendently of its author
     * - If the user is not an admin, the comment can be updated only if the comments userId
     *   matches the comment's original author
     */
    const sql = isAdminTotp ? `UPDATE comments SET text = ? WHERE id = ?` : `UPDATE comments SET text = ? WHERE id = ? AND userId = ?`;
    const params = isAdminTotp ? [newText, commentId] : [newText, commentId, userId];
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else if (this.changes === 0) resolve({ error: "Comment not found or not owned by user" });
      else resolve({ updated: true });
    });
  });
};

/**
 * Deletes a specific comment from the database
 *
 * Behavior:
 * - If the user is an admin authenticated via TOTP, they can delete any comment
 * - Otherwise, the comment is deleted only if it belongs to the requesting user
 *
 * @param {number} commentId - ID of the comment to delete
 * @param {number} userId - ID of the user requesting the deletion
 * @param {boolean} isAdminTotp - Whether the user is an admin authenticated via TOTP
 *
 * @returns Resolves to the number of rows deleted (0 if not found or unauthorized)
 */
exports.deleteComment = (commentId, userId, isAdminTotp = false) => {
  return new Promise((resolve, reject) => {
    /**
     * - If the user is an admin authenticated with TOTP, the userId check is skipped:
     *   the comment is deleted indipendently of its author
     * - If the user is not an admin, the comment is deleted only if the userId
     *   matches the comment's original author
     */
    const sql = isAdminTotp ? `DELETE FROM comments WHERE id = ?` : `DELETE FROM comments WHERE id = ? AND userId = ?`;
    const params = isAdminTotp ? [commentId] : [commentId, userId];
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
};

/**
 * Deletes a specific post from the database
 *
 * Behavior:
 * - If the user is an admin authenticated via TOTP, they can delete any post
 * - Otherwise, the post is deleted only if it belongs to the requesting user
 * - Associated comments are deleted automatically via ON DELETE CASCADE (setted in DB schema)
 *
 * @param {number} postId - ID of the post to delete
 * @param {number} userId - ID of the user requesting the deletion
 * @param {boolean} isAdminTotp - Whether the user is an admin authenticated via TOTP
 *
 * @returns Resolves to the number of rows deleted (0 if not found or unauthorized)
 */
exports.deletePost = (postId, userId, isAdminTotp = false) => {
  return new Promise((resolve, reject) => {
    /**
     * - If the user is an admin authenticated with TOTP, the userId check is skipped:
     *   the post is deleted indipendently of its author
     * - If the user is not an admin, the post is deleted only if the userId
     *   matches the post's original author
     */
    const sql = isAdminTotp ? `DELETE FROM posts WHERE id = ?` : `DELETE FROM posts WHERE id = ? AND userId = ?`;
    const params = isAdminTotp ? [postId] : [postId, userId];
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
};

/**
 * Marks a comment as "interesting" on behalf of a specific user
 *
 * Inserts a record into the "interesting_flags" table
 * Each user can mark a given comment only once (enforced by a UNIQUE constraint)
 *
 * @param {number} commentId - ID of the comment to mark
 * @param {number} userId - ID of the user performing the action
 *
 * @returns Resolves to true if the operation succeeds
 * @throws {Error} If the comment was already marked by this user
 */
exports.markCommentAsInteresting = (commentId, userId) => {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO interesting_flags (commentId, userId) VALUES (?, ?)`;
    db.run(sql, [commentId, userId], function (err) {
      if (err) reject(err);
      else resolve(true);
    });
  });
};

/**
 * Removes the "interesting" mark from a comment for a specific user
 *
 * Deletes the corresponding record from the "interesting_flags" table
 * If no matching record exists, the operation is silently ignored
 *
 * @param {number} commentId - ID of the comment to unmark
 * @param {number} userId - ID of the user removing the mark
 *
 * @returns Resolves to true if the operation completes successfully
 */
exports.unmarkCommentAsInteresting = (commentId, userId) => {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM interesting_flags WHERE commentId = ? AND userId = ?`;
    db.run(sql, [commentId, userId], function (err) {
      if (err) reject(err);
      else resolve(true);
    });
  });
};
