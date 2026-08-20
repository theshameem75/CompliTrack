import { blocks, setSession } from './blocks-client.js';

const content = document.querySelector('#authContent');
const message = document.querySelector('#authMessage');

function form(mode) {
  const reset = mode === 'reset', signup = mode === 'signup';
  content.innerHTML = `<h1>${reset ? 'Reset your password' : signup ? 'Create your account' : 'Welcome back'}</h1><p>${reset ? 'Enter your email and reset token to choose a new password.' : signup ? 'Set up your CompliTrack workspace account.' : 'Sign in to manage training compliance.'}</p><form>${!reset && !signup ? '<label>Email</label><input name="username" type="email" required placeholder="you@company.com"><label>Password</label><input name="password" type="password" required placeholder="Your password">' : signup ? '<label>Full name</label><input name="name" required placeholder="Jordan Davis"><label>Work email</label><input name="email" type="email" required placeholder="you@company.com"><label>Password</label><input name="password" type="password" required minlength="8" placeholder="At least 8 characters">' : '<label>Email</label><input name="email" type="email" required placeholder="you@company.com"><label>Reset token</label><input name="token" required placeholder="Token from your email"><label>New password</label><input name="password" type="password" required minlength="8" placeholder="At least 8 characters">'}<button>${reset ? 'Set new password' : signup ? 'Create account' : 'Sign in'}</button></form><div class="auth-links">${reset || signup ? '<button data-mode="login">Back to sign in</button>' : '<button data-mode="signup">Create account</button><button data-mode="recover">Forgot password?</button>'}</div>`;
  content.querySelector('form').addEventListener('submit', event => submit(event, mode));
  content.querySelectorAll('[data-mode]').forEach(button => { button.onclick = () => form(button.dataset.mode === 'recover' ? 'recover' : button.dataset.mode); });
}

async function submit(event, mode) {
  event.preventDefault(); message.textContent = '';
  const request = Object.fromEntries(new FormData(event.currentTarget));
  try {
    const response = mode === 'signup' ? await blocks.auth.signup(request) : mode === 'recover' ? await blocks.auth.recover(request) : mode === 'reset' ? await blocks.auth.resetPassword(request) : await blocks.auth.login(request);
    if (mode === 'login') { setSession(response); location.href = '/'; }
    else message.textContent = 'Success. Check your email for the next step.';
  } catch (error) { message.textContent = error?.body?.message || error?.body?.error_description || error.message || 'Request failed'; }
}

form(new URLSearchParams(location.search).get('mode') || 'login');
