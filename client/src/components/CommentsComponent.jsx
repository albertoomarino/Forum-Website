import { useParams, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Spinner, Alert, Button, Form } from "react-bootstrap";
import DOMPurify from "dompurify";
import API from "../API";

/**
 * CommentsRoute component fetches and displays the list of comments for a specific post
 *
 * - Uses the postId parameter from the URL to fetch comments via the backend API
 * - Displays a loading spinner while fetching data
 * - Passes the retrieved comments and required handlers to the CommentsTable component
 *
 * Props:
 * - post: the post object associated with the comments
 * - user: the currently authenticated user (or undefined if not logged in)
 * - loggedInTotp: true if the user completed 2FA login
 * - createComment, updateComment, deleteComment, toggleInteresting: functions for comment operations
 */
function CommentsRoute(props) {
  // List of comments associated with the selected post
  const [comments, setComments] = useState([]);

  // Indicates whether comments are currently being loaded
  const [loadingComments, setLoadingComments] = useState(true);

  // Error message to show if fetching comments fails
  const [errorMessage, setErrorMessage] = useState("");

  // Extracts the postId from the URL parameters
  const { postId } = useParams();

  /**
   * Fetches comments from the backend API when the component mounts or when
   * the user or postId changes
   */
  useEffect(() => {
    const fetchComments = async () => {
      setLoadingComments(true);
      try {
        const comments = await API.getCommentsByPostId(postId);
        setComments(comments);
      } catch {
        setErrorMessage("Failed to load comments.");
      } finally {
        setLoadingComments(false);
      }
    };
    fetchComments();
  }, [props.user, postId]);

  return loadingComments ? (
    <Spinner className="m-2" />
  ) : (
    <CommentsTable post={props.post} user={props.user} comments={comments} setComments={setComments} errorMessage={errorMessage} setErrorMessage={setErrorMessage} loggedInTotp={props.loggedInTotp} createComment={props.createComment} updateComment={props.updateComment} deleteComment={props.deleteComment} toggleInteresting={props.toggleInteresting} />
  );
}

/**
 * CommentsTable component renders the list of comments for a post, and provides
 * functionalities for creating, editing, deleting, and marking comments as interesting
 *
 * - Displays the post title and a list of comments in reverse chronological order
 * - Allows authenticated users to interact with comments according to permissions
 * - Shows error and success messages as alerts
 *
 * Props:
 * - post: the currently selected post object
 * - user: the currently authenticated user object
 * - comments: the array of comment objects associated with the post
 * - setComments: function to update the comments list
 * - errorMessage: error message string to display
 * - setErrorMessage: function to update the error message
 * - loggedInTotp: true if the user completed 2FA login (admin mode)
 * - createComment, updateComment, deleteComment, toggleInteresting: handlers for comment operations
 */
function CommentsTable(props) {
  const navigate = useNavigate();

  // Text entered in the comment input field
  const [commentText, setCommentText] = useState("");

  // Boolean indicating whether a comment is currently being submitted
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // ID of the comment currently being edited (null if none)
  const [editingId, setEditingId] = useState(null);

  // Text currently being edited in the textarea
  const [editedText, setEditedText] = useState("");

  // Boolean indicating whether a comment edit is currently being saved
  const [savingEdit, setSavingEdit] = useState(false);

  // Temporary success message shown after submitting a comment
  const [successMessage, setSuccessMessage] = useState("");

  // Handles the submission of a new comment
  const handleSubmit = async (event) => {
    event.preventDefault();

    // Sanitize the comments text
    const sanitized = DOMPurify.sanitize(commentText, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

    if (!sanitized) {
      props.setErrorMessage("Comment cannot be empty.");
      return;
    }

    setCommentSubmitting(true);
    setCommentText("");
    props.setErrorMessage("");
    setSuccessMessage("");

    try {
      /**
       * Sends the comment to the backend using the createComment API
       * On success, prepends the new comment to the local comment list
       */
      const newComment = await props.createComment(props.post.id, sanitized);
      props.setComments((prev) => [newComment, ...prev]);
      setSuccessMessage("Comment submitted!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      props.setErrorMessage("Failed to submit comment.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  //  Handles saving the edited text of an existing comment
  const handleEditSave = async (id) => {
    // Sanitize the edited text
    const sanitized = DOMPurify.sanitize(editedText, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

    if (!sanitized) {
      props.setErrorMessage("Text cannot be empty.");
      return;
    }

    setSavingEdit(true);
    setEditingId(null);
    props.setErrorMessage("");

    try {
      /**
       * Calls the updateComment API to update the comment text on the backend
       * Updates the comment in the local state on success
       */
      const updated = await props.updateComment(id, sanitized);
      props.setComments((prev) => prev.map((c) => (c.id === updated.id ? { ...c, text: updated.text } : c)));
    } catch (err) {
      props.setErrorMessage("Error updating comment.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Handles the deletion of a comment
  const handleDelete = async (id) => {
    props.setErrorMessage("");

    try {
      /**
       * Calls the deleteComment API to remove the comment from the backend
       * On success, removes the comment from the local state
       */
      const deletedId = await props.deleteComment(id, props.post.id);
      props.setComments((prev) => prev.filter((c) => c.id !== deletedId));
    } catch (err) {
      props.setErrorMessage("Error deleting comment");
    }
  };

  // Toggles the "interesting" flag on a comment for the current user
  const handleToggleInteresting = async (c) => {
    props.setErrorMessage("");

    try {
      /**
       * Calls the toggleInteresting API to mark or unmark the comment
       * Updates the local state to reflect the new flag status and adjusts the count
       */
      const updated = await props.toggleInteresting(c.id, c.markedByMe);

      props.setComments((prev) =>
        prev.map((comment) =>
          comment.id === updated.id
            ? {
                ...comment,
                markedByMe: updated.markedByMe,
                interestingCount: comment.interestingCount + (updated.markedByMe ? 1 : -1),
              }
            : comment
        )
      );
    } catch (err) {
      props.setErrorMessage("Error updating flag");
    }
  };

  return (
    <>
      {/* Back button */}
      <div className="d-flex justify-content-start px-3 my-1">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left me-1"></i> Back
        </Button>
      </div>

      <h1 className="text-center">List of Comments</h1>

      {/* Title of the post to which the comments belong */}
      {props.post && (
        <h5 className="text-center mb-4">
          Post title: <span style={{ fontStyle: "italic" }}>"{props.post.title}"</span>
        </h5>
      )}

      {props.comments.length > 0 ? (
        props.comments.map((c) => (
          <div key={c.id} className="border rounded p-3 mb-3 shadow-sm bg-light">
            {/* Comment in editing phase */}
            {editingId === c.id ? (
              <>
                <Form.Group controlId={`edit-${c.id}`}>
                  <Form.Control as="textarea" rows={3} value={editedText} onChange={(e) => setEditedText(e.target.value)} disabled={savingEdit} />
                </Form.Group>
                <div className="d-flex gap-2 my-1">
                  <Button size="sm" variant="success" onClick={() => handleEditSave(c.id)} disabled={savingEdit}>
                    Save
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setEditingId(null)} disabled={savingEdit}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Comment and its metadata */}
                {/* Preserve line breaks entered by the user while collapsing extra spaces */}
                <p style={{ whiteSpace: "pre-line" }}>{c.text}</p>
                <div className="my-1">
                  <small className="d-block mb-1">
                    Comment written by <strong>{c.username}</strong> on {c.date}
                  </small>
                  <div className="d-flex align-items-center gap-3 flex-wrap">
                    {props.user && (
                      <div className="d-flex flex-wrap align-items-center gap-3">
                        {(props.user?.username === c.username || props.loggedInTotp) && (
                          <>
                            {/* Delete comment button */}
                            <Button variant="danger" size="sm" style={{ width: "150px" }} onClick={() => handleDelete(c.id)}>
                              <i className="bi bi-trash me-1"></i> Delete comment
                            </Button>

                            {/* Edit comment button */}
                            <Button
                              variant="primary"
                              size="sm"
                              style={{ width: "150px" }}
                              onClick={() => {
                                setEditingId(c.id);
                                setEditedText(c.text);
                                props.setErrorMessage("");
                              }}
                            >
                              <i className="bi bi-pencil-square me-1"></i> Edit comment
                            </Button>
                          </>
                        )}

                        {/* Interesting/ Not interesting button */}
                        <Button variant={c.markedByMe ? "outline-success" : "outline-secondary"} size="sm" style={{ width: "140px" }} onClick={() => handleToggleInteresting(c)}>
                          <i className={`bi ${c.markedByMe ? "bi-hand-thumbs-up-fill" : "bi-hand-thumbs-up"} me-1`} />
                          {c.markedByMe ? "Interesting" : "Not interesting"}
                        </Button>
                        <small className="text-secondary">{c.interestingCount} interesting</small>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ))
      ) : (
        // If there aren't comments, show this
        <p className="text-center my-3 fs-4">No comments available</p>
      )}

      {/* Show error message */}
      {props.errorMessage && (
        <Alert variant="danger" className="my-1 mx-auto text-center" dismissible>
          {props.errorMessage}
        </Alert>
      )}

      {/* Show success message */}
      {successMessage && (
        <Alert variant="success" className="my-1 text-center" dismissible>
          {successMessage}
        </Alert>
      )}

      {/* Form to create a new comment */}
      <CommentsForm commentText={commentText} onChange={(e) => setCommentText(e.target.value)} handleSubmit={handleSubmit} commentSubmitting={commentSubmitting} />
    </>
  );
}

/**
 * CommentsForm component renders a form to add a new comment
 *
 * - Contains a textarea input bound to the comment text state
 * - On submission, calls the handleSubmit function passed via props
 * - Disables input and submit button while the comment is being submitted
 *
 * Props:
 * - commentText: current value of the comment input
 * - onChange: function to update the comment text
 * - handleSubmit: function to handle form submission
 * - commentSubmitting: boolean indicating whether submission is in progress
 */
function CommentsForm(props) {
  return (
    <>
      <h3 className="text-center my-1">Add a Comment</h3>
      <Form onSubmit={props.handleSubmit} className="my-3">
        {/* Text area into write a new comment */}
        <Form.Group controlId="commentText">
          <Form.Control as="textarea" rows={3} placeholder="Write your comment here..." value={props.commentText} onChange={props.onChange} disabled={props.commentSubmitting} />
        </Form.Group>

        {/* Submit comment */}
        <Button type="submit" variant="success" className="my-1" disabled={props.commentSubmitting}>
          {props.commentSubmitting ? "Submitting..." : "Submit comment"}
        </Button>
      </Form>
    </>
  );
}

export { CommentsRoute };
