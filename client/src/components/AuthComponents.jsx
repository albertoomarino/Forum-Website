import { Form, Button, Alert, Container, Row, Col } from "react-bootstrap";
import { useState } from "react";
import { useNavigate } from "react-router";
import DOMPurify from "dompurify";
import API from "../API";

/**
 * TotpForm is a component that handles TOTP authentication
 *
 * Features:
 * - Displays a form with a single input for the user to enter their 6-digit TOTP code
 * - Validates that the input is exactly 6 characters
 * - Submits the code to the backend via "API.totpVerify"
 * - On success:
 *   - Calls "props.totpSuccessful()"" to signal that 2FA verification was successful
 *   - Redirects the user to the home page ("/")
 * - On failure:
 *   - Displays an error message indicating that the code is incorrect
 * - Includes a secondary button allowing users to skip 2FA and log in without it
 *
 * Props:
 * - totpSuccessful (function): Callback function to be invoked when TOTP verification succeeds
 */

function TotpForm(props) {
  // Stores the 6-digit code entered by the user
  const [totpCode, setTotpCode] = useState("");

  // Stores any error message to be shown in the form
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();

  /**
   * Attempts to verify the TOTP code entered by the user
   *
   * - Sends the 6-digit code to the backend API for verification
   * - If the verification is successful:
   *    - Clears any existing error messages
   *    - Calls the "totpSuccessful" callback passed via props to inform the parent component
   *    - Redirects the user to the home page using React Router's "navigate"
   * - If the verification fails:
   *    - Displays a generic error message to the user
   */
  const doTotpVerify = () => {
    API.totpVerify(totpCode.trim())
      .then(() => {
        setErrorMessage("");
        props.totpSuccessful();
        navigate("/");
      })
      .catch(() => {
        setErrorMessage("Wrong code, please try again");
      });
  };

  /**
   * Handles the submission of the TOTP form by the user
   *
   * - Prevents the default HTML form submission
   * - Cleans and validates the TOTP code:
   *    - It must be exactly 6 characters (no more, no less)
   *    - If invalid, shows an appropriate error message
   * - If valid, invokes the TOTP verification function
   *
   * @param {Event} event - The submit event triggered by the form
   */
  const handleSubmit = (event) => {
    event.preventDefault();
    setErrorMessage("");

    // Trim and remove any non-digit characters (just to be safe)
    const cleanCode = totpCode.trim().replace(/\D/g, ""); // Keep only digits

    if (cleanCode === "" || cleanCode.length !== 6) {
      setErrorMessage("Invalid content in form: either empty or not 6-char long");
      return;
    }

    doTotpVerify();
  };

  return (
    <Container>
      <Row className="justify-content-center">
        <Col xs={12} md={6}>
          {/* 2FA verification form */}
          <Form onSubmit={handleSubmit} className="bg-white border rounded shadow-sm p-4 my-1">
            <h1 className="mb-3 text-center">Second Factor Authentication</h1>

            {/* Instructional message */}
            <p className="text-center mb-4" style={{ fontSize: "1rem" }}>
              Please enter the 6-digit code from your authenticator app.
            </p>

            {/* Error message (if any) */}
            {errorMessage && (
              <Alert variant="danger" className="my-1 text-center" dismissible onClose={() => setErrorMessage("")}>
                {errorMessage}
              </Alert>
            )}

            {/* Input field for the TOTP code */}
            <Form.Group controlId="totpCode" className="mb-3">
              <Form.Label>Code</Form.Label>
              <Form.Control type="text" placeholder="Enter your 2FA code here..." value={totpCode} onChange={(e) => setTotpCode(e.target.value)} />
            </Form.Group>

            {/* Submit and "Login without 2FA" action buttons */}
            <div className="d-flex justify-content-end gap-2 my-1">
              <Button type="submit" variant="success">
                Validate
              </Button>
              <Button variant="danger" onClick={() => navigate("/")}>
                Login without 2FA
              </Button>
            </div>
          </Form>
        </Col>
      </Row>
    </Container>
  );
}

/**
 * LoginForm is a component that manages standard username/password authentication
 *
 * Features:
 * - Collects user credentials (username and password)
 * - Sanitizes and validates input before submitting
 * - Submits credentials to the backend using "API.logIn"
 * - On successful login:
 *   - Calls "props.loginSuccessful(user)"" with the user info returned by the server
 * - On failure:
 *   - Displays an error message indicating that the login attempt failed
 * - Includes a cancel button that navigates the user back to the homepage
 *
 * Props:
 * - loginSuccessful (function): Callback function called with the user object upon successful login
 */
function LoginForm(props) {
  // Stores the username input field value
  const [username, setUsername] = useState("");

  // Stores the password input field value
  const [password, setPassword] = useState("");

  // Holds any error message to be shown in the login form
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();

  /**
   * Attempts to log the user in using the provided credentials
   *
   * - Sends a POST request to the backend login API with the username and password
   * - On success:
   *    - Clears any existing error message
   *    - Calls the "loginSuccessful" callback passed via props, passing the user object returned from the server
   * - On failure:
   *    - Displays a generic login error (no sensitive details about which field was wrong)
   *
   * @param {Object} credentials - An object containing username and password
   */
  const doLogIn = (credentials) => {
    API.logIn(credentials)
      .then((user) => {
        setErrorMessage("");
        props.loginSuccessful(user);
      })
      .catch(() => {
        setErrorMessage("Wrong username or password");
      });
  };

  /**
   * Handles the login form submission by the user
   *
   * - Prevents the default form submission behavior
   * - Sanitizes and validates the username field
   * - If both username and password are non-empty, calls doLogIn
   * - If validation fails, shows a generic error message
   *
   * @param {Event} event - The form submission event
   */
  const handleSubmit = (event) => {
    event.preventDefault();
    setErrorMessage("");

    // Sanitize and prepare credentials
    const cleanUsername = DOMPurify.sanitize(username.trim(), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    const cleanPassword = DOMPurify.sanitize(password.trim(), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

    const credentials = { username: cleanUsername, password: cleanPassword };

    // Basic validation
    let valid = true;
    if (cleanUsername === "" || cleanPassword === "") valid = false;

    if (valid) {
      doLogIn(credentials);
    } else {
      setErrorMessage("Invalid content in form.");
    }
  };

  return (
    <Container>
      <Row className="justify-content-center">
        <Col xs={12} md={6}>
          {/* Login form */}
          <Form onSubmit={handleSubmit} className="bg-white border rounded shadow-sm p-4 my-1">
            <h1 className="mb-3 text-center">Login</h1>

            {/* Error message if login fails */}
            {errorMessage && (
              <Alert variant="danger" className="my-1 text-center" dismissible onClose={() => setErrorMessage("")}>
                {errorMessage}
              </Alert>
            )}

            {/* Username input */}
            <Form.Group controlId="username" className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control type="text" placeholder="Write your username here..." value={username} onChange={(e) => setUsername(e.target.value)} />
            </Form.Group>

            {/* Password input */}
            <Form.Group controlId="password" className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control type="password" placeholder="Write your password here..." value={password} onChange={(e) => setPassword(e.target.value)} />
            </Form.Group>

            {/* Submit and cancel buttons */}
            <div className="d-flex justify-content-end gap-2 my-1">
              <Button type="submit" variant="success">
                Login
              </Button>
              <Button variant="danger" onClick={() => navigate("/")}>
                Cancel
              </Button>
            </div>
          </Form>
        </Col>
      </Row>
    </Container>
  );
}

export { LoginForm, TotpForm };
