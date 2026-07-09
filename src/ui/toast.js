// Lightweight on-screen toast helper.
// Source part for app.js. Run `npm run build` after editing.

  function showToast(message, duration = 2600) {
    el.toast.textContent = message;
    el.toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      el.toast.classList.remove('show');
    }, duration);
  }
