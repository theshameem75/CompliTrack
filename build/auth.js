import { blocks, setSession } from "./blocks-client.js";
import { apiErrorMessage, apiResponseMessage } from "./api-response.js";

const content = document.querySelector("#authContent");
const message = document.querySelector("#authMessage");
const query = new URLSearchParams(location.search);

function resolveMode() {
  if (location.pathname === "/activate") return "activate";
  if (location.pathname === "/recover") return "recover";
  if (location.pathname === "/reset-password") return "reset";
  return query.get("mode") || "login";
}

function fields(mode) {
  if (mode === "activate") return `<input name="code" type="hidden" value="${escapeAttribute(query.get("code") || "")}"><label>First name</label><input name="firstName" autocomplete="given-name" required placeholder="Your first name"><label>Last name</label><input name="lastName" autocomplete="family-name" required placeholder="Your last name"><label>New password</label><input name="password" type="password" autocomplete="new-password" minlength="8" required placeholder="At least 8 characters"><label>Confirm password</label><input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required placeholder="Enter the password again">`;
  if (mode === "signup") return '<label>Full name</label><input name="name" required placeholder="Jordan Davis"><label>Work email</label><input name="email" type="email" required placeholder="you@company.com"><label>Password</label><input name="password" type="password" required minlength="8" placeholder="At least 8 characters">';
  if (mode === "reset") return `<label>Email</label><input name="email" type="email" required placeholder="you@company.com"><label>Reset token</label><input name="token" required value="${escapeAttribute(query.get("token") || query.get("code") || "")}" placeholder="Token from your email"><label>New password</label><input name="password" type="password" required minlength="8" placeholder="At least 8 characters">`;
  if (mode === "recover") return '<label>Email</label><input name="email" type="email" required placeholder="you@company.com">';
  return '<label>Email</label><input name="username" type="email" required placeholder="you@company.com"><label>Password</label><input name="password" type="password" required placeholder="Your password">';
}

function copy(mode) {
  return {
    activate: ["Activate your account", "Confirm your invitation to continue.", "Activate account"],
    signup: ["Create your account", "Set up your CompliTrack workspace account.", "Create account"],
    reset: ["Reset your password", "Choose a new password for your account.", "Set new password"],
    recover: ["Recover your account", "Enter your email to receive recovery instructions.", "Send recovery email"],
    login: ["Welcome back", "Sign in to manage training compliance.", "Sign in"],
  }[mode] || ["Welcome back", "Sign in to continue.", "Sign in"];
}

function render(mode) {
  const [title, description, button] = copy(mode);
  const codeMissing = mode === "activate" && !query.get("code");
  content.innerHTML = `<h1>${title}</h1><p>${description}</p><form>${fields(mode)}<button ${codeMissing ? "disabled" : ""}>${button}</button></form><div class="auth-links">${mode === "login" ? '<button data-mode="signup">Create account</button><button data-mode="recover">Forgot password?</button>' : '<button data-mode="login">Back to sign in</button>'}</div>`;
  if (codeMissing) message.textContent = "This activation link is missing its activation code.";
  content.querySelector("form").addEventListener("submit", (event) => submit(event, mode));
  content.querySelectorAll("[data-mode]").forEach((buttonElement) => { buttonElement.onclick = () => { history.replaceState({}, "", "/auth.html"); render(buttonElement.dataset.mode); }; });
}

async function submit(event, mode) {
  event.preventDefault();
  message.textContent = "";
  const request = Object.fromEntries(new FormData(event.currentTarget));
  if (mode === "activate") {
    if (request.password !== request.confirmPassword) {
      message.textContent = "Passwords do not match.";
      return;
    }
    delete request.confirmPassword;
  }
  const button = event.currentTarget.querySelector("button");
  button.disabled = true;
  try {
    const response = mode === "activate"
      ? await blocks.auth.activate(request)
      : mode === "signup"
        ? await blocks.auth.signup(request)
        : mode === "recover"
          ? await blocks.auth.recover(request)
          : mode === "reset"
            ? await blocks.auth.resetPassword(request)
            : await blocks.auth.login(request);
    if (response?.error || response?.error_description || response?.isSuccess === false) throw response;
    if (mode === "login") {
      setSession(response);
      location.href = "/";
      return;
    }
    message.textContent = apiResponseMessage(response, "Request completed successfully.");
    if (mode === "activate") {
      event.currentTarget.remove();
      content.querySelector("[data-mode='login']").textContent = "Continue to sign in";
    }
  } catch (error) {
    message.textContent = apiErrorMessage(error);
    button.disabled = false;
  }
}

function escapeAttribute(value) {
  return String(value).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
}

async function initialize() {
  const mode = resolveMode();
  if (mode === "activate" && query.get("code")) {
    content.innerHTML = "<h1>Activate your account</h1><p>Validating your activation link…</p>";
    try {
      const validation = await blocks.auth.validateActivation({ code: query.get("code") });
      if (validation?.error || validation?.error_description || validation?.isSuccess === false || validation?.valid === false) throw validation;
    } catch (error) {
      content.innerHTML = '<h1>Activation link unavailable</h1><p>This activation link is invalid or has expired.</p><div class="auth-links"><button data-mode="login">Back to sign in</button></div>';
      message.textContent = apiErrorMessage(error, "This activation link is invalid or has expired.");
      content.querySelector("[data-mode='login']").onclick = () => { location.href = "/auth.html"; };
      return;
    }
  }
  render(mode);
}

initialize();
