import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { useEffect, useState } from "react";
import { Col, Container, Row, Navbar, Button } from "react-bootstrap";
import { Routes, Route, Outlet, Link, Navigate, useNavigate } from "react-router";
import "./App.css";

import { PostsRoute } from "./components/PostsComponent.jsx";
import { CommentsRoute } from "./components/CommentsComponent.jsx";
import { PostFormRoute } from "./components/FormComponents.jsx";
import { LoginForm, TotpForm } from "./components/AuthComponents.jsx";

import API from "./API.js";

/**
 * MyHeader component renders the top navigation bar of the application
 *
 * Props:
 * - user: the currently authenticated user object (or undefined if not logged in)
 * - loggedInTotp: boolean indicating if the user has completed 2FA authentication
 * - logout: function to handle logout when the button is clicked
 */
function MyHeader(props) {
  const name = props.user?.username;

  return (
    <Navbar bg="dark" variant="dark" className="d-flex justify-content-between">
      <Navbar.Brand className="mx-2 fs-5 text-white">
        <i className="bi bi-chat-quote-fill me-1" />
        Forum
      </Navbar.Brand>
      {name ? (
        <div className="d-flex align-items-center">
          <i className="bi bi-person-fill text-white me-1 fs-4"></i>
          <Navbar.Text className="fs-5 text-white me-1">{props.loggedInTotp ? `Signed in 2FA as: ${name}` : `Signed in as: ${name}`}</Navbar.Text>
          <Button className="mx-2" variant="danger" onClick={props.logout}>
            <i className="bi bi-box-arrow-in-left me-1"></i> Logout
          </Button>
        </div>
      ) : (
        <Link to="/login">
          <Button className="mx-2" variant="success">
            <i className="bi bi-box-arrow-in-right me-1"></i> Login
          </Button>
        </Link>
      )}
    </Navbar>
  );
}

/**
 * MyFooter component displays the application footer
 */
function MyFooter() {
  return (
    <footer className="text-center my-1">
      <p>&copy; Forum - Web Application Course A.Y. 2024/2025</p>
      <div id="time"></div>
    </footer>
  );
}

/**
 * Layout component defines the main page structure shared across all routes
 *
 * - Renders the top navigation bar (MyHeader), passing user info and logout handler
 * - Renders the currently active child route via the <Outlet /> placeholder
 * - Displays the footer (MyFooter) at the bottom of the page
 *
 * Props:
 * - user: the currently authenticated user object, or undefined if not logged in
 * - loggedIn: boolean indicating if the user is logged in via username/password
 * - loggedInTotp: boolean indicating if the user has completed 2FA authentication
 * - logout: function to handle logout when the user clicks the logout button
 */
function Layout(props) {
  return (
    <Container fluid>
      <Row>
        <Col>
          <MyHeader user={props.user} loggedIn={props.loggedIn} logout={props.logout} loggedInTotp={props.loggedInTotp} />
        </Col>
      </Row>
      <Outlet />
      <Row>
        <Col>
          <MyFooter />
        </Col>
      </Row>
    </Container>
  );
}

/**
 * DefaultRoute component is displayed when the user navigates to an invalid or unknown route
 *
 * - Shows a simple message indicating the page is not valid
 * - Provides a link to return to the main page ("/")
 */
function DefaultRoute() {
  return (
    <Container fluid>
      <p className="my-2">No data here: This is not a valid page!</p>
      <Link to="/">Please go back to main page</Link>
    </Container>
  );
}

/**
 * LoginWithTotp component manages the full authentication flow:
 * - Standard login (username + password)
 * - Optional two-factor authentication (TOTP) if enabled for the user
 *
 * Behavior:
 * - If the user is not logged in: show the LoginForm
 * - If the user is logged in and has 2FA enabled but hasn't verified the code yet: show the TotpForm
 * - If the user is logged in and either has no 2FA or has already completed TOTP: redirect to home
 *
 * Props:
 * - loggedIn: boolean, true if the user has completed standard login
 * - loggedInTotp: boolean, true if the user has completed TOTP verification
 * - user: the logged-in user object
 * - loginSuccessful: function to update app state after successful login
 * - setLoggedInTotp: function to update state after TOTP is completed
 */
function LoginWithTotp(props) {
  // If the user is logged in (standard login successful)
  if (props.loggedIn) {
    // If the user has TOTP enabled
    if (props.user.canDoTotp) {
      // If the user has completed TOTP, redirect to home
      if (props.loggedInTotp) {
        return <Navigate replace to="/" />;
      } else {
        // Otherwise, show the TOTP code verification form
        return <TotpForm totpSuccessful={() => props.setLoggedInTotp(true)} />;
      }
    } else {
      // User is logged in but does NOT have TOTP enabled: redirect to home
      return <Navigate replace to="/" />;
    }
  } else {
    // User is NOT logged in at all: show the login form
    return <LoginForm loginSuccessful={props.loginSuccessful} />;
  }
}

function App() {
  const navigate = useNavigate();

  // List of posts fetched from the server
  const [posts, setPosts] = useState([]);

  // Selected post object, used to pass the currently selected post to the comments view
  const [selectedPost, setSelectedPost] = useState(null);

  // Indicates whether the application is currently loading data
  const [loading, setLoading] = useState(true);

  // "Dirty" flag used to trigger data reloading when necessary
  const [dirty, setDirty] = useState(true);

  // Error message to be displayed to the user when an operation fails
  const [errorMessage, setErrorMessage] = useState("");

  // Success message to inform the user when an operation completes successfully
  const [successMessage, setSuccessMessage] = useState("");

  // Logged-in user object (retrieved from /api/sessions/current); undefined if not authenticated
  const [user, setUser] = useState(undefined);

  // Boolean flag indicating whether the user is authenticated via username/password
  const [loggedIn, setLoggedIn] = useState(false);

  // Boolean flag indicating whether the user has successfully completed 2FA login (required for admin privileges)
  const [loggedInTotp, setLoggedInTotp] = useState(false);

  /**
   * Handles errors returned by API calls or validations and updates the UI accordingly
   *
   * - Extracts a message from the error object
   * - Updates the error message state to notify the user via the UI
   * - If the error indicates an authentication issue ("Not authenticated"),
   *   it resets the user state and login status to force logout
   *
   * @param {Object} err - The error object received from an API call or validation failure
   */
  function handleError(err) {
    let msg = "Unknown error";

    if (err?.errors?.[0]?.msg) {
      msg = err.errors[0].msg;
    } else if (err?.error) {
      msg = err.error;
    }

    setErrorMessage(msg);

    if (msg === "Not authenticated") {
      setUser(undefined);
      setLoggedIn(false);
    }
  }

  /**
   * useEffect hook that loads the list of posts from the server when the "dirty" flag is set to true
   *
   * - Fetches all posts via the API when the data is marked as dirty
   * - On success: updates the posts state, disables the loading state, and resets the dirty flag
   * - On failure: delegates error handling to the handleError function
   */
  useEffect(() => {
    const loadPosts = async () => {
      try {
        const data = await API.getAllPosts();
        setPosts(data);
        setLoading(false);
        setDirty(false);
      } catch (err) {
        handleError(err);
      }
    };
    if (dirty) loadPosts();
  }, [dirty]);

  /**
   * useEffect hook that runs once on component mount to verify the user's authentication status
   *
   * - Calls the API to retrieve the current authenticated user session (if available)
   * - If successful: updates the user state and marks the user as logged in
   * - If the user has already completed 2FA, sets the loggedInTotp flag to true
   * - On failure: delegates error handling to the handleError function
   */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await API.getUserInfo();
        setUser(user);
        setLoggedIn(true);
        if (user.isTotp) setLoggedInTotp(true);
      } catch (err) {
        handleError(err);
      }
    };
    checkAuth();
  }, []);

  /**
   * Creates a new post by sending it to the backend API
   *
   * - On success: adds the new post to the top of the posts list and shows a temporary success message
   * - On failure: handles the error using "handleError" and rethrows it to the caller
   *
   * @param {Object} post - The post data to be created (title, text, etc.)
   * @returns The newly created post returned by the API
   */
  const createPost = async (post) => {
    try {
      const newPost = await API.createPost(post);
      setPosts((prev) => [newPost, ...prev]);
      setSuccessMessage("Post created!");
      setTimeout(() => setSuccessMessage(""), 3000); // Hide message after 3 seconds
      return newPost;
    } catch (err) {
      handleError(err);
      throw err;
    }
  };

  /**
   * Deletes a post by its ID using the backend API
   *
   * - On success: removes the post from the local state and displays a temporary success message
   * - On failure: handles the error using "handleError" and rethrows it to the caller
   *
   * @param {number} postId - The ID of the post to delete
   */
  async function deletePost(postId) {
    try {
      await API.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setSuccessMessage("Post deleted!");
      setTimeout(() => setSuccessMessage(""), 3000); // Hide message after 3 seconds
    } catch (err) {
      handleError(err);
      throw err;
    }
  }

  /**
   * Creates a new comment for a given post using the backend API
   *
   * - On success: increments the comment count of the corresponding post in local state
   * - On failure: handles the error via "handleError" and rethrows it to the caller
   *
   * @param {number} postId - The ID of the post to which the comment is added
   * @param {string} text - The content of the new comment
   * @returns The newly created comment object returned by the API
   */
  const createComment = async (postId, text) => {
    try {
      const newComment = await API.createComment(postId, text);
      setPosts((list) => list.map((p) => (Number(p.id) === Number(postId) ? { ...p, commentCount: p.commentCount + 1 } : p)));
      return newComment;
    } catch (err) {
      handleError(err);
      throw err;
    }
  };

  /**
   * Updates the text of an existing comment via the backend API
   *
   * - On success: returns the updated comment's ID and new text
   * - On failure: handles the error using "handleError" and rethrows it to the caller
   *
   * @param {number} commentId - The ID of the comment to update
   * @param {string} newText - The new text to replace the existing comment content
   * @returns An object containing the comment ID and the updated text
   */
  const updateComment = async (commentId, newText) => {
    try {
      await API.updateComment(commentId, newText);
      return { id: commentId, text: newText };
    } catch (err) {
      handleError(err);
      throw err;
    }
  };

  /**
   * Deletes a comment by its ID using the backend API
   *
   * - On success: decrements the comment count of the corresponding post in local state
   * - On failure: handles the error via "handleError" and rethrows it to the caller
   *
   * @param {number} commentId - The ID of the comment to delete
   * @param {number} postId - The ID of the post the comment belongs to (used to update comment count)
   * @returns The ID of the deleted comment
   */
  const deleteComment = async (commentId, postId) => {
    try {
      await API.deleteComment(commentId);
      setPosts((list) => list.map((p) => (Number(p.id) === Number(postId) ? { ...p, commentCount: p.commentCount - 1 } : p)));
      return commentId;
    } catch (err) {
      handleError(err);
      throw err;
    }
  };

  /**
   * Toggles the "interesting" flag on a comment for the current user
   *
   * - If the comment is already marked, it will be unmarked
   * - If not marked yet, it will be marked as interesting
   * - On failure: handles the error via "handleError" and rethrows it
   *
   * @param {number} commentId - The ID of the comment to toggle the flag on
   * @param {boolean} isMarked - Indicates whether the comment is currently marked as interesting
   * @returns An object with the comment ID and the new markedByMe status
   */
  const toggleInteresting = async (commentId, isMarked) => {
    try {
      if (isMarked) await API.unmarkCommentInteresting(commentId);
      else await API.markCommentInteresting(commentId);
      return { id: commentId, markedByMe: !isMarked };
    } catch (err) {
      handleError(err);
      throw err;
    }
  };

  /**
   * Logs out the current user by calling the backend API
   *
   * - Clears the user state and login flags (including 2FA)
   * - Redirects the user to the home page after logout
   */
  const doLogOut = async () => {
    await API.logOut();
    setUser(undefined);
    setLoggedIn(false);
    setLoggedInTotp(false);
    navigate("/");
  };

  /**
   * Handles successful login by updating the user state
   *
   * - Sets the authenticated user and marks the user as logged in
   * - Triggers a data reload by setting the "dirty" flag to true
   *
   * @param {Object} user - The authenticated user object
   */
  const loginSuccessful = (user) => {
    setUser(user);
    setLoggedIn(true);
    setDirty(true);
  };

  return (
    <Routes>
      <Route path="/" element={<Layout user={user} loggedIn={loggedIn} logout={doLogOut} loggedInTotp={loggedInTotp} />}>
        <Route index element={<PostsRoute posts={posts} setSelectedPost={setSelectedPost} loading={loading} errorMessage={errorMessage} setErrorMessage={setErrorMessage} successMessage={successMessage} user={user} setPosts={setPosts} deletePost={deletePost} loggedInTotp={loggedInTotp} />} />
        <Route path="/post/:postId" element={<CommentsRoute post={selectedPost} posts={posts} user={user} loggedInTotp={loggedInTotp} createComment={createComment} updateComment={updateComment} deleteComment={deleteComment} toggleInteresting={toggleInteresting} />} />
        <Route path="/add" element={<PostFormRoute createPost={createPost} setSelectedPost={setSelectedPost} errorMessage={errorMessage} setErrorMessage={setErrorMessage} />} />
      </Route>
      <Route path="/login" element={<LoginWithTotp loggedIn={loggedIn} loggedInTotp={loggedInTotp} user={user} loginSuccessful={loginSuccessful} setLoggedInTotp={setLoggedInTotp} />} />
      <Route path="/*" element={<DefaultRoute />} />
    </Routes>
  );
}

export default App;
