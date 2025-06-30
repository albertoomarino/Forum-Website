"use strict";

const express = require("express");
const morgan = require("morgan"); // logging middleware
const cors = require("cors");
const { check, param, validationResult } = require("express-validator"); // validation middleware

const passport = require("passport"); // auth middleware
const LocalStrategy = require("passport-local"); // username and password for login

const base32 = require("thirty-two");
const TotpStrategy = require("passport-totp").Strategy; // totp

const session = require("express-session"); // enable sessions

const validator = require("validator");
const createDOMPurify = require("dompurify");
const { JSDOM } = require("jsdom");
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

const dao = require("./dao"); // module for accessing the DB.  NB: use ./ syntax for files in the same dir
const userDao = require("./dao-user"); // module for accessing the user info in the DB

// init express
const app = express();
const port = 3001;

const corsOptions = {
  origin: "http://localhost:5173",
  credentials: true,
};
app.use(cors(corsOptions));

// set-up the middlewares
app.use(morgan("dev"));
app.use(express.json()); // To automatically decode incoming json

/*** Set up Passport ***/

// set up the "username and password" login strategy
// by setting a function to verify username and password
passport.use(
  new LocalStrategy(function (username, password, done) {
    // Sanitize inputs
    username = validator.trim(username);
    username = validator.escape(username);
    password = validator.trim(password);

    // Validate inputs
    if (!validator.isLength(username, { min: 3, max: 20 }) || !validator.isLength(password, { min: 6 })) {
      return done(null, false, { message: "Incorrect username or password." });
    }

    userDao.getUser(username, password).then((user) => {
      if (!user) return done(null, false, { message: "Incorrect username or password." });

      return done(null, user);
    });
  })
);

// serialize and de-serialize the user (user object <-> session)
// we serialize only the user id and store it in the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// starting from the data in the session, we extract the current (logged-in) user
passport.deserializeUser((id, done) => {
  userDao
    .getUserById(id)
    .then((user) => {
      done(null, user); // this will be available in req.user
    })
    .catch((err) => {
      done(err, null);
    });
});

passport.use(
  new TotpStrategy(function (user, done) {
    // In case .secret does not exist, decode() will return an empty buffer
    return done(null, base32.decode(user.secret), 30); // 30 = period of key validity
  })
);

// custom middleware: check if a given request is coming from an authenticated user
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: "Not authenticated" });
};

// set up the session
app.use(
  session({
    // by default, Passport uses a MemoryStore to keep track of the sessions
    secret: "wge8d239bwd93rkskb", // this is a secret value
    resave: false,
    saveUninitialized: false,
  })
);

// then, init passport
app.use(passport.initialize());
app.use(passport.session());

// Function to sanitize posts
function sanitizePost(post) {
  return {
    id: parseInt(post.id),
    title: DOMPurify.sanitize(validator.trim(post.title), { ALLOWED_TAGS: [] }),
    text: DOMPurify.sanitize(post.text, { ALLOWED_TAGS: [] }),
    maxComments: post.maxComments !== null ? parseInt(post.maxComments) : null,
    username: post.username ? DOMPurify.sanitize(validator.trim(post.username), { ALLOWED_TAGS: [] }) : null,
    date: DOMPurify.sanitize(post.date, { ALLOWED_TAGS: [] }),
    commentCount: post.commentCount !== undefined ? parseInt(post.commentCount) : 0,
  };
}

// Funtion to sanitize comments
function sanitizeComment(comment) {
  return {
    id: parseInt(comment.id),
    text: DOMPurify.sanitize(comment.text, { ALLOWED_TAGS: [] }),
    username: comment.username ? DOMPurify.sanitize(validator.trim(comment.username), { ALLOWED_TAGS: [] }) : null,
    date: DOMPurify.sanitize(comment.date, { ALLOWED_TAGS: [] }),
    interestingCount: parseInt(comment.interestingCount) || 0,
    markedByMe: comment.markedByMe ? true : false,
  };
}

// Function to sanitize user informations
function sanitizeUser(user) {
  return {
    id: parseInt(user.id),
    username: DOMPurify.sanitize(validator.trim(user.username), { ALLOWED_TAGS: [] }),
    admin: parseInt(user.admin),
    secret: user.secret ? DOMPurify.sanitize(user.secret, { ALLOWED_TAGS: [] }) : null,
  };
}

/*** APIs ***/

/**
 * GET /api/posts
 *
 * Returns the list of all posts
 * Authentication not required
 */
app.get("/api/posts", (req, res) => {
  dao
    .listPosts()
    .then((posts) => res.json(posts.map(sanitizePost)))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

/**
 * GET /api/posts/:id
 *
 * Returns detailed information about a specific post by ID
 * Authentication not required
 */
app.get("/api/posts/:id", [check("id").isInt({ min: 1 }).toInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    const result = await dao.getPost(req.params.id);
    if (result.error) {
      res.status(404).json(result);
    } else {
      res.json(sanitizePost(result));
    }
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

/**
 * GET /api/posts/:id/comments
 *
 * Returns the list of comments for a specific post
 * Authenticated users see all comments; unauthenticated users see only anonymous ones
 */
app.get("/api/posts/:id/comments", [check("id").isInt({ min: 1 }).toInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const postId = parseInt(req.params.id);

  /**
   * - If the user is logged in: userId = id of the user
   * - If the user isn't logged in: userId = null
   */
  const userId = req.user ? parseInt(req.user.id) : null;

  try {
    const comments = await dao.getCommentsByPostId(postId, userId);
    res.json(comments.map(sanitizeComment));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load comments" });
  }
});

/**
 * POST /api/posts
 *
 * Creates a new post
 * Authentication required
 */
app.post(
  "/api/posts",
  isLoggedIn,
  [
    check("title")
      .isString()
      .isLength({ min: 1, max: 100 })
      .custom((value) => {
        const stripped = DOMPurify.sanitize(value, { ALLOWED_TAGS: [] }).trim();
        if (stripped.length === 0) throw new Error("Title must contain visible content");
        return true;
      }),
    check("text")
      .isString()
      .isLength({ min: 1 })
      .custom((value) => {
        const stripped = DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
        if (stripped.length === 0) throw new Error("Text must contain visible content");
        return true;
      }),
    /**
     * - optional(): maxComments field not required
     * - nullable = true: allows that even if the field is present but has value null,
     *   it is considered as absence of the value, and then skips anyway the next
     *   validation isInt(...)
     * - isInt({ min: 0 }): macComments must be an integer >= 0
     */
    check("maxComments").optional({ nullable: true }).isInt({ min: 0 }).toInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    // Verify that the user exists
    const userId = parseInt(req.user.id);
    const user = await userDao.getUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const post = {
      title: DOMPurify.sanitize(validator.trim(req.body.title), { ALLOWED_TAGS: [] }),
      text: DOMPurify.sanitize(req.body.text, { ALLOWED_TAGS: [] }),
      maxComments: req.body.maxComments ?? null,
      userId,
    };

    try {
      const result = await dao.createPost(post);
      res.status(201).json(sanitizePost(result));
    } catch (err) {
      if (err.message.includes("UNIQUE constraint failed: posts.title")) {
        res.status(409).json({ error: "Title already used" });
      } else {
        console.error(err);
        res.status(503).json({ error: "Database error during post creation" });
      }
    }
  }
);

/**
 * POST /api/posts/:id/comments
 *
 * Creates a new comment for the specified post
 * Authenticated users are set as authors; anonymous users are allowed
 */
app.post(
  "/api/posts/:id/comments",
  [
    check("id").isInt({ min: 1 }).toInt(),
    check("text")
      .isString()
      .isLength({ min: 1 })
      .custom((value) => {
        const stripped = DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
        if (stripped.length === 0) throw new Error("Comment must contain visible content");
        return true;
      }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const postId = parseInt(req.params.id);
    const userId = req.user ? parseInt(req.user.id) : null;

    try {
      const post = await dao.getPost(postId);
      if (post.error) return res.status(404).json(post);

      const currentComments = await dao.getCommentsByPostId(postId);
      if (post.maxComments !== null && currentComments.length >= post.maxComments) {
        return res.status(403).json({ error: "Maximum number of comments reached for this post" });
      }

      const comment = {
        text: DOMPurify.sanitize(req.body.text, { ALLOWED_TAGS: [] }),
        postId,
        userId,
      };

      const result = await dao.createComment(comment);
      res.status(201).json(sanitizeComment(result));
    } catch (err) {
      console.error(err);
      res.status(503).json({ error: "Database error during comment creation" });
    }
  }
);

/**
 * PUT /api/comments/:id
 *
 * Updates the text of a specific comment
 * Only the original author or an admin with 2FA can perform this operation
 * Authentication required
 */
app.put(
  "/api/comments/:id",
  isLoggedIn,
  [
    check("id").isInt({ min: 1 }).toInt(),
    check("text")
      .isString()
      .isLength({ min: 1 })
      .custom((value) => {
        const stripped = DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
        if (stripped.length === 0) throw new Error("Text must contain visible content");
        return true;
      }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const commentId = parseInt(req.params.id);
    const userId = parseInt(req.user.id);

    // Verify that the user exists
    const user = await userDao.getUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const isAdminWithTotp = req.session.method === "totp" && req.user.admin;

    const newText = DOMPurify.sanitize(req.body.text, { ALLOWED_TAGS: [] });

    try {
      const result = await dao.updateComment(commentId, newText, userId, isAdminWithTotp);
      if (result.error) return res.status(403).json({ error: result.error });
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(503).json({ error: "Database error during comment update" });
    }
  }
);

/**
 * DELETE /api/comments/:id
 *
 * Deletes a specific comment
 * Only the comment's author or an admin with 2FA can perform this operation
 * Authentication required
 */
app.delete("/api/comments/:id", isLoggedIn, [check("id").isInt({ min: 1 }).toInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const commentId = parseInt(req.params.id);
  const userId = parseInt(req.user.id);

  // Verify that the user exists
  const user = await userDao.getUserById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const isAdminWithTotp = req.session.method === "totp" && req.user.admin;

  try {
    const changes = await dao.deleteComment(commentId, userId, isAdminWithTotp);
    if (changes === 0) {
      return res.status(403).json({ error: "Not allowed or comment not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(503).json({ error: "Error deleting comment" });
  }
});

/**
 * DELETE /api/posts/:id
 *
 * Deletes a specific post along with all its comments
 * Only the post's author or an admin with 2FA can perform this operation
 * Authentication required
 */
app.delete("/api/posts/:id", isLoggedIn, [check("id").isInt({ min: 1 }).toInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const postId = parseInt(req.params.id);
  const userId = parseInt(req.user.id);

  // Verify that the user exists
  const user = await userDao.getUserById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const isAdminWithTotp = req.session.method === "totp" && req.user.admin;

  try {
    const changes = await dao.deletePost(postId, userId, isAdminWithTotp);
    if (changes === 0) {
      return res.status(403).json({ error: "Not allowed or post not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(503).json({ error: "Error deleting post" });
  }
});

/**
 * POST /api/comments/:id/interesting
 *
 * Marks a comment as "interesting" for the currently authenticated user
 * Authentication required
 */
app.post("/api/comments/:id/interesting", isLoggedIn, [check("id").isInt({ min: 1 }).toInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const commentId = parseInt(req.params.id);
  const userId = parseInt(req.user.id);

  // Verify that the user exists
  const user = await userDao.getUserById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  try {
    await dao.markCommentAsInteresting(commentId, userId);
    res.status(200).json({ success: true });
  } catch (err) {
    if (err.message === "Already marked") {
      res.status(409).json({ error: "Comment already marked as interesting by this user" });
    } else {
      console.error(err);
      res.status(503).json({ error: "Database error while marking comment as interesting" });
    }
  }
});

/**
 * DELETE /api/comments/:id/interesting
 *
 * Removes the "interesting" mark from a comment for the current user
 * Authentication required
 */
app.delete("/api/comments/:id/interesting", isLoggedIn, [check("id").isInt({ min: 1 }).toInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const commentId = parseInt(req.params.id);
  const userId = parseInt(req.user.id);

  // Verify that the user exists
  const user = await userDao.getUserById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  try {
    await dao.unmarkCommentAsInteresting(commentId, userId);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(503).json({ error: "Database error while unmarking comment as interesting" });
  }
});

/*** Users APIs ***/

/**
 * Extracts and returns relevant user information to be sent to the client
 *
 * @param {Request} req - The Express request object containing user and session data
 * @returns An object with essential user information for the client
 */
function clientUserInfo(req) {
  const user = sanitizeUser(req.user);
  return {
    id: user.id,
    username: user.username,
    admin: user.admin,
    canDoTotp: user.secret ? true : false,
    isTotp: req.session.method === "totp",
  };
}

/**
 * POST /api/sessions
 *
 * Authenticates a user using the local strategy (username and password)
 * On success, creates a session and returns user information including 2FA status
 * Authentication method: username + password
 */
app.post("/api/sessions", function (req, res, next) {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      // Display wrong login messages
      return res.status(401).json(info);
    }
    // Success, perform the login
    req.login(user, (err) => {
      if (err) return next(err);

      return res.json(clientUserInfo(req));
    });
  })(req, res, next);
});

/**
 * POST /api/login-totp
 *
 * Completes two-factor authentication (2FA) using a TOTP code
 * Requires user to be already authenticated via username/password
 * On success, marks the session as TOTP-authenticated
 */
app.post(
  "/api/login-totp",
  isLoggedIn,
  (req, res, next) => {
    const userId = parseInt(req.user.id);
    userDao
      .getUserById(userId)
      .then((user) => {
        if (!user) return res.status(404).json({ error: "User not found" });

        // Verify that the user is an admin
        if (!req.user?.admin) {
          return res.status(403).json({ error: "Only admin can use 2FA login" });
        }

        // Verify that the user has a secret (i.e., enabled 2FA)
        if (!req.user?.secret) {
          return res.status(403).json({ error: "2FA not enabled for this user" });
        }

        // Verify TOTP code (if it's present and numeric)
        if (!req.body.code || !validator.isNumeric(req.body.code.trim())) {
          return res.status(422).json({ error: "Missing or invalid TOTP code" });
        }

        req.body.code = validator.trim(req.body.code);
        next();
      })
      .catch((err) => {
        console.error(err);
        res.status(503).json({ error: "Error validating user" });
      });
  },
  passport.authenticate("totp"),
  function (req, res) {
    req.session.method = "totp";
    res.json({ otp: "authorized" });
  }
);

/**
 * DELETE /api/sessions/current
 *
 * Logs out the currently authenticated user by destroying the session
 * Authentication required
 */
app.delete("/api/sessions/current", isLoggedIn, (req, res) => {
  req.logout(() => {
    res.end();
  });
});

/**
 * GET /api/sessions/current
 *
 * Returns information about the currently authenticated user
 * Used to verify if a user is already logged in (e.g., on page refresh)
 */
app.get("/api/sessions/current", (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).json(clientUserInfo(req));
  } else res.status(401).json({ error: "Unauthenticated user!" });
});

/*** Other express-related instructions ***/

// Activate the server
app.listen(port, (err) => {
  if (err) console.log(err);
  else console.log(`forum-server listening at http://localhost:${port}`);
});
