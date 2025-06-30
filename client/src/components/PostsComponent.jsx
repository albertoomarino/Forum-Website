import { Table, Button, Spinner, Row, Col, Alert } from "react-bootstrap";
import { useNavigate } from "react-router";
import dayjs from "dayjs";

/**
 * PostsRoute component renders the main view displaying all forum posts
 *
 * - If data is still loading, it shows a loading spinner
 * - Otherwise, it renders a list of posts inside a table
 * - If the user is authenticated, it shows a button to add a new post
 * - It handles navigation to the comment list of a specific post when selected
 *
 * Props:
 * - posts: array of post objects
 * - loading: boolean indicating if posts are being loaded
 * - user: currently authenticated user (or undefined)
 * - setSelectedPost: function to update the selected post
 * - setPosts: function to update the posts list
 * - deletePost: function to delete a post
 * - setErrorMessage: function to set the global error message
 * - successMessage: optional message to show after successful operations
 * - setSuccessMessage: function to reset the success message
 * - loggedInTotp: boolean indicating if the user is logged in as admin via 2FA
 */
function PostsRoute(props) {
  const navigate = useNavigate();

  // Selects a post and navigates to its comment view
  const handleShowComments = (post) => {
    props.setSelectedPost(post);
    navigate(`/post/${post.id}`);
  };

  return props.loading ? (
    <Spinner className="m-2" />
  ) : (
    <>
      <Row className="mb-1 my-1">
        <Col className="text-center">
          <h1 className="text-center">List of Posts</h1>

          {/* If the user is authenticated, show the "Add new post" button */}
          {props.user && (
            <>
              <Button
                className="my-1"
                onClick={() => {
                  props.setErrorMessage("");
                  navigate("/add");
                }}
              >
                <i className="bi bi-plus-lg"></i> Add new post
              </Button>

              {/* Show the success message */}
              {props.successMessage && (
                <Alert variant="success" dismissible onClose={() => props.setSuccessMessage && props.setSuccessMessage("")} className="my-1 text-center mx-auto">
                  {props.successMessage}
                </Alert>
              )}
            </>
          )}
        </Col>
      </Row>

      <Row className="my-1">
        <Col>
          <PostsTable listOfPosts={props.posts || []} onShowComments={handleShowComments} user={props.user} onUpdatePosts={props.setPosts} deletePost={props.deletePost} setErrorMessage={props.setErrorMessage} loggedInTotp={props.loggedInTotp} />
        </Col>
      </Row>
    </>
  );
}

/**
 * PostsTable component renders a table displaying all forum posts
 *
 * - If the list is empty, it shows a message indicating that no posts are available
 * - Otherwise, it renders each post in a separate row using the PostsRow component
 *
 * Props:
 * - listOfPosts: array of post objects to display
 * - onShowComments: function to handle the navigation to the post's comments
 * - user: the currently authenticated user (or undefined)
 * - onUpdatePosts: function to update the list of posts after actions (e.g., delete)
 * - deletePost: function to delete a post
 * - setErrorMessage: function to show an error message
 * - loggedInTotp: boolean indicating if the user is logged in as an administrator
 */
function PostsTable(props) {
  return !props.listOfPosts?.length ? (
    <p className="text-center fs-5 my-1">No posts available</p>
  ) : (
    <Table striped bordered hover className="w-100 text-center my-1">
      <thead className="align-middle">
        <tr>
          <th>Title</th>
          <th>Author</th>
          <th>Text</th>
          <th>Creation Date</th>
          <th>No. of Comments</th>
          <th>Max Comments</th>
          <th>More Details</th>
          <th>Delete</th>
        </tr>
      </thead>
      <tbody>
        {props.listOfPosts.map((p) => (
          <PostsRow key={p.id} post={p} onShowComments={props.onShowComments} user={props.user} onUpdatePosts={props.onUpdatePosts} deletePost={props.deletePost} setErrorMessage={props.setErrorMessage} loggedInTotp={props.loggedInTotp} />
        ))}
      </tbody>
    </Table>
  );
}

/**
 * PostsRow component renders a single row in the posts table
 *
 * - Displays all relevant information about a post (title, author, text, timestamps, etc.)
 * - Allows navigation to the post's comments via a "More Details" button
 * - Shows a delete button only if the user is the author or an admin (2FA authenticated)
 *
 * Props:
 * - post: the post object to render
 * - onShowComments: function to navigate to the post's comment view
 * - user: the currently authenticated user (or undefined)
 * - deletePost: function to delete the post
 * - setErrorMessage: function to display an error message
 * - loggedInTotp: boolean indicating if the user is an admin
 */
function PostsRow(props) {
  // Deletes the post by calling the backend API
  const handleDelete = async () => {
    try {
      await props.deletePost(props.post.id);
    } catch (err) {
      props.setErrorMessage("Failed to delete post");
    }
  };

  // Determine if the current user is the post author
  const isAuthor = props.user?.username === props.post.username;

  // Check if the user is an administrator (2FA login)
  const isAdmin = props.loggedInTotp;

  return (
    <tr className="align-middle">
      <td>{props.post.title}</td>
      <td>{props.post.username}</td>
      {/* Preserve line breaks entered by the user while collapsing extra spaces */}
      <td style={{ whiteSpace: "pre-line" }}>{props.post.text}</td>
      <td>{dayjs(props.post.date).format("YYYY-MM-DD HH:mm:ss")}</td>
      <td>{props.post.commentCount}</td>
      <td>{props.post.maxComments !== null ? props.post.maxComments : "No limits"}</td>
      <td>
        <Button variant="primary" onClick={() => props.onShowComments(props.post)}>
          <i className="bi bi-list-ul"></i>
        </Button>
      </td>
      <td>
        <Button variant="danger" disabled={!props.user || (!isAuthor && !isAdmin)} onClick={handleDelete}>
          <i className="bi bi-trash"></i>
        </Button>
      </td>
    </tr>
  );
}

export { PostsRoute };
