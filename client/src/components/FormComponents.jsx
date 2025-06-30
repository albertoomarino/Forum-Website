import { useState } from "react";
import { Button, Form, Alert, Row, Col } from "react-bootstrap";
import { useNavigate } from "react-router";
import DOMPurify from "dompurify";

/**
 * PostFormRoute component renders the route for creating a new post
 *
 * - Wraps the PostForm component
 * - Delegates the actual form rendering and submission logic to PostForm
 *
 * Props:
 * - createPost: function to call when submitting a new post
 * - setErrorMessage: function to display any error message
 * - errorMessage: optional string to display as an error in the form
 */
function PostFormRoute(props) {
  return (
    <Row>
      <Col>
        <PostForm createPost={props.createPost} setErrorMessage={props.setErrorMessage} errorMessage={props.errorMessage} />
      </Col>
    </Row>
  );
}

/**
 * PostForm component provides the form and logic for creating a new forum post
 *
 * - Renders a form with fields for title, text content, and an optional max number of comments
 * - Sanitizes and validates inputs before submission
 * - On successful post creation, redirects to the homepage
 * - Displays an error message if validation fails or the API call returns an error
 * - Includes buttons to submit, cancel, or navigate back
 *
 * Props:
 * - createPost: function to call with the new post data (title, text, maxComments)
 * - setErrorMessage: function to set an error message to be shown in the form
 * - errorMessage: optional error string displayed at the top of the form
 */
function PostForm(props) {
  // Stores the value of the "Title" input field entered by the user
  const [title, setTitle] = useState("");

  // Stores the value of the "Text" textarea field for the post content
  const [text, setText] = useState("");

  // Stores the value of the optional "Max Comments" field
  // Accepts an empty string (meaning no limit) or a number
  const [maxComments, setMaxComments] = useState("");

  const navigate = useNavigate();

  /**
   * Handles form submission for creating a new post
   *
   * - Sanitizes the title and text fields to remove any potentially harmful HTML
   * - Validates that both title and text contain non-empty values
   * - Prepares the post object, converting "maxComments" to an integer or null (No limits)
   * - Calls the "createPost" function to send data to the backend
   * - On success, navigates back to the homepage
   * - On failure, shows an error message using "setErrorMessage"
   *
   * @param {Event} event - The form submission event
   */
  const handleSubmit = (event) => {
    event.preventDefault();

    const cleanTitle = DOMPurify.sanitize(title.trim(), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    const cleanText = DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

    /**
     * - Title must not be empty
     * - Text must contain non-whitespace characters
     */
    if (!cleanTitle || !cleanText.trim()) {
      props.setErrorMessage("Title and Text are required");
      return;
    }

    const post = {
      title: cleanTitle,
      text: cleanText,
      maxComments: maxComments === "" ? null : parseInt(maxComments),
    };

    props
      .createPost(post)
      .then(() => navigate("/"))
      .catch((err) => props.setErrorMessage("Error creating post"));
  };

  return (
    <>
      {/* Back button */}
      <div className="d-flex justify-content-start ps-4 pt-3">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left" /> Back
        </Button>
      </div>

      {/* Post creation form */}
      <Form onSubmit={handleSubmit} className="mx-auto my-1 bg-white border rounded shadow-sm p-4" style={{ maxWidth: "600px" }}>
        <h1 className="mb-3 text-center">Create a New Post</h1>

        {/* Error message (if any) */}
        {props.errorMessage && (
          <Alert variant="danger" className="my-1 text-center" dismissible onClose={() => props.setErrorMessage("")}>
            {props.errorMessage}
          </Alert>
        )}

        {/* Title input */}
        <Form.Group className="mb-3">
          <Form.Label>Title</Form.Label>
          <Form.Control type="text" placeholder="Write the post title here..." value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Form.Group>

        {/* Text input (multiline) */}
        <Form.Group className="mb-3">
          <Form.Label>Text</Form.Label>
          <Form.Control as="textarea" rows={4} placeholder="Write the post text here..." value={text} onChange={(e) => setText(e.target.value)} required />
        </Form.Group>

        {/* Max comments input (optional) */}
        <Form.Group className="mb-3">
          <Form.Label>Max Comments (optional)</Form.Label>
          <Form.Control type="number" value={maxComments} onChange={(e) => setMaxComments(e.target.value)} />
        </Form.Group>

        {/* Submit and Cancel buttons */}
        <div className="d-flex justify-content-end gap-2 my-1">
          <Button type="submit" variant="success">
            Add Post
          </Button>
          <Button variant="danger" onClick={() => navigate("/")}>
            Cancel
          </Button>
        </div>
      </Form>
    </>
  );
}

export { PostFormRoute };
