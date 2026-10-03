# Admin login

An administrator signs in through the public login form before using location and system-management pages.

## Sub-features

- The login page labels username and password fields and submits credentials to the backend.
- Failed credentials show an error while leaving the user on the login page.
- Successful credentials establish auth state and navigate to `/admin`.

## How to get to it (user POV)

- Open `/admin/login` directly.
- From the site navigation, open `管理`; an unauthenticated visitor is sent to the login flow.

## Driving it with OMP Chromium

Preconditions:
- The backend health endpoint must return success and the test admin credential must be configured locally. Read credentials from the local test environment; never put them in feature files, artifacts, or chat.
- Use a fresh dedicated browser profile with no auth tokens.

- Form: open `/admin/login`. Confirm the heading `管理者ログイン`, labeled `ユーザー名` and `パスワード` inputs, and `ログイン` button.
- Rejection: submit an intentionally invalid test username/password. Confirm the visible login error appears, URL remains `/admin/login`, and no authenticated state is stored.
- Success: submit the locally configured test admin credentials. Confirm navigation to `/admin`, an authenticated admin view, and the auth state expected by the app. Do not report success if the API request failed or the page only rendered a cached state.
- Logout/session end: use the UI logout control and confirm the user returns to the login page and protected admin content is no longer visible.

## Gotchas

- Never copy sample/default credentials from documentation into production or a shared environment.
- The login request and token verification need the backend. With no backend, record the specific dependency and stop this recipe rather than accepting a generic network-error message as proof of auth behavior.
- Do not preserve credentials, cookies, or tokens in proof artifacts.