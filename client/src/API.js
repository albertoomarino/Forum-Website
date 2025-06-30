"use strict";

import dayjs from "dayjs";

const URL = "http://localhost:3001/api";

/**
 * Retrieves all posts with basic info and publication date as a dayjs object
 *
 * @returns List of posts or an error object if the request fails
 */
async function getAllPosts() {
  // Send request to retrieve all posts
  const response = await fetch(`${URL}/posts`, {
    credentials: "include",
  });
  // Parse the JSON body of the response
  const posts = await response.json();
  // If request is successful, return mapped post data
  if (response.ok) {
    return posts.map((p) => ({
      id: p.id,
      title: p.title,
      userId: p.userId,
      username: p.username,
      commentCount: p.commentCount,
      text: p.text,
      maxComments: p.maxComments,
      date: dayjs(p.date).format("YYYY-MM-DD HH:mm:ss"),
    }));
  } else {
    // Otherwise, throw the error object returned from the server
    throw posts;
  }
}

/**
 * Retrieves all comments for a given post ID with metadata
 *
 * @returns List of comments or an error object if the request fails
 */
async function getCommentsByPostId(postId) {
  // Send request to retrieve comments for the specified post ID
  const response = await fetch(`${URL}/posts/${postId}/comments`, {
    credentials: "include",
  });
  // Parse the JSON body of the response
  const comments = await response.json();
  // If request is successful, return comment
  if (response.ok) {
    return comments.map((c) => ({
      id: c.id,
      text: c.text,
      username: c.username ?? "Anonymous user",
      date: dayjs(c.date).format("YYYY-MM-DD HH:mm:ss"),
      interestingCount: c.interestingCount,
      markedByMe: c.markedByMe,
    }));
  } else {
    // Otherwise, throw the error object returned from the server
    throw comments;
  }
}

/**
 * Creates a new post with the given data as an authenticated user
 *
 * @returns The full post object including id, title, text, date, author username, maxComments, and initial comment count
 */
function createPost(post) {
  return new Promise((resolve, reject) => {
    // Send request to create a new post
    fetch(`${URL}/posts`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post),
    })
      .then((response) => {
        if (response.ok) {
          // Parse and return the created post on success
          response
            .json()
            .then(resolve)
            .catch(() => reject({ error: "Cannot parse server response." }));
        } else {
          // Parse and return the error object on server-side validation error
          response
            .json()
            .then(reject)
            .catch(() => reject({ error: "Cannot parse server error." }));
        }
      })
      // Handle network-level error
      .catch(() => reject({ error: "Cannot communicate with the server." }));
  });
}

/**
 * Creates a new comment for the given post ID as an authenticated or anonymous user
 *
 * @returns The full comment object including id, text, username, formatted date,
 * interesting count, and whether it is marked by the current user
 */
function createComment(postId, text) {
  return new Promise((resolve, reject) => {
    // Send request to create a comment for the specified post
    fetch(`${URL}/posts/${postId}/comments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((response) => {
        if (response.ok) {
          // Parse and adjust the comment data on success
          response
            .json()
            .then((data) => {
              data.username = data.username ?? "Anonymous user";
              resolve(data);
            })
            .catch(() => reject({ error: "Cannot parse server response." }));
        } else {
          // Parse and return the error object on server-side validation error
          response
            .json()
            .then(reject)
            .catch(() => reject({ error: "Cannot parse server error." }));
        }
      })
      // Handle network-level error
      .catch(() => reject({ error: "Cannot communicate with the server." }));
  });
}

/**
 * Updates the text of a comment by ID (only allowed for its author or an admin)
 *
 * @returns The updated comment or an error object if the request fails
 */
function updateComment(id, text) {
  return new Promise((resolve, reject) => {
    // Send request to update the comment text by ID
    fetch(`${URL}/comments/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((response) => {
        if (response.ok) {
          // Parse and return the updated comment on success
          response
            .json()
            .then(resolve)
            .catch(() => reject({ error: "Cannot parse server response." }));
        } else {
          // Parse and return the error object on server-side validation error
          response
            .json()
            .then(reject)
            .catch(() => reject({ error: "Cannot parse server error." }));
        }
      })
      .catch(() => reject({ error: "Cannot communicate with the server." }));
  });
}

/**
 * Deletes a post by ID (only allowed for its author or an admin)
 *
 * @returns True if successful or an error object if the request fails
 */
function deletePost(id) {
  return new Promise((resolve, reject) => {
    // Send request to delete the post by ID
    fetch(`${URL}/posts/${id}`, {
      method: "DELETE",
      credentials: "include",
    })
      .then((response) => {
        if (response.ok) {
          // Parse and confirm deletion on success
          response
            .json()
            .then(resolve)
            .catch(() => reject({ error: "Cannot parse server response." }));
        } else {
          // Parse and return the error object on server-side validation error
          response
            .json()
            .then(reject)
            .catch(() => reject({ error: "Cannot parse server error." }));
        }
      })
      // Handle network-level error
      .catch(() => reject({ error: "Cannot communicate with the server." }));
  });
}

/**
 * Deletes a comment by ID (only allowed for its author or an admin)
 *
 * @returns True if successful or an error object if the request fails
 */
function deleteComment(id) {
  return new Promise((resolve, reject) => {
    // Send request to delete the comment by ID
    fetch(`${URL}/comments/${id}`, {
      method: "DELETE",
      credentials: "include",
    })
      .then((response) => {
        if (response.ok) {
          // Parse and confirm deletion on success
          response
            .json()
            .then(resolve)
            .catch(() => reject({ error: "Cannot parse server response." }));
        } else {
          // Parse and return the error object on server-side validation error
          response
            .json()
            .then(reject)
            .catch(() => reject({ error: "Cannot parse server error." }));
        }
      })
      // Handle network-level error
      .catch(() => reject({ error: "Cannot communicate with the server." }));
  });
}

/**
 * Marks a comment as interesting for the current user
 *
 * @returns Nothing if successful or an error object if the request fails
 */
function markCommentInteresting(commentId) {
  return new Promise((resolve, reject) => {
    // Send request to mark the comment as interesting
    fetch(`${URL}/comments/${commentId}/interesting`, {
      method: "POST",
      credentials: "include",
    })
      .then((response) => {
        if (response.ok)
          // Resolve without payload on success
          resolve();
        else {
          // Parse and return the error object on failure
          response
            .json()
            .then(reject)
            .catch(() => reject({ error: "Cannot parse server error." }));
        }
      })
      // Handle network-level error
      .catch(() => reject({ error: "Cannot communicate with the server." }));
  });
}

/**
 * Removes the interesting mark from a comment
 *
 * @returns Nothing if successful or an error object if the request fails
 */
function unmarkCommentInteresting(commentId) {
  return new Promise((resolve, reject) => {
    // Send request to unmark the comment as interesting
    fetch(`${URL}/comments/${commentId}/interesting`, {
      method: "DELETE",
      credentials: "include",
    })
      .then((response) => {
        if (response.ok)
          // Resolve without payload on success
          resolve();
        else {
          // Parse and return the error object on failure
          response
            .json()
            .then(reject)
            .catch(() => reject({ error: "Cannot parse server error." }));
        }
      })
      // Handle network-level error
      .catch(() => reject({ error: "Cannot communicate with the server." }));
  });
}

/*** Users APIs ***/

/**
 * Authenticates the user with the given credentials and starts a session
 *
 * @returns User info if successful or an error message if the request fails
 */
async function logIn(credentials) {
  // Send request to authenticate user and start session
  const response = await fetch(`${URL}/sessions`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });
  // Parse the JSON body of the response
  const user = await response.json();
  // If authentication is successful, return user info
  if (response.ok) return user;
  else throw user;
}

/**
 * Logs out the current user by deleting the active session
 *
 * @returns Nothing
 */
async function logOut() {
  await fetch(`${URL}/sessions/current`, {
    method: "DELETE",
    credentials: "include",
  });
}

/**
 * Retrieves information about the currently authenticated user
 *
 * @returns User info if successful or an error object if the request fails
 */
async function getUserInfo() {
  // Send request to retrieve session info of the current user
  const response = await fetch(`${URL}/sessions/current`, {
    credentials: "include",
  });
  // Parse the JSON body of the response
  const user = await response.json();
  // If request is successful, return user info
  if (response.ok) return user;
  else throw user;
}

/**
 * Verifies a TOTP code as part of 2FA authentication for an admin user
 *
 * - Sends the 6-digit code to the backend via POST /api/login-totp
 * - If the code is valid, the backend activates the second-factor session
 * - Does NOT return user data; frontend must rely on a local flag
 * - Used to enable admin-level privileges in the UI after 2FA completion
 *
 * @param {string} totpCode - The 6-digit code from the authenticator app
 * @returns Resolves if verification succeeds, rejects with an error object otherwise
 */
function totpVerify(totpCode) {
  return new Promise((resolve, reject) => {
    // Send request to verify the TOTP code
    fetch(`${URL}/login-totp`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: totpCode }),
    })
      .then((response) => {
        if (response.ok) {
          // Parse and resolve on successful verification
          response
            .json()
            .then(resolve)
            .catch(() => reject({ error: "Cannot parse server response." }));
        } else {
          // Parse and reject on invalid code or failure
          response
            .json()
            .then(reject)
            .catch(() => reject({ error: "Cannot parse server error." }));
        }
      })
      // Handle network-level error
      .catch(() => reject({ error: "Cannot communicate with the server." }));
  });
}

const API = { getAllPosts, getCommentsByPostId, createPost, createComment, updateComment, deletePost, deleteComment, markCommentInteresting, unmarkCommentInteresting, totpVerify, logIn, logOut, getUserInfo };
export default API;
