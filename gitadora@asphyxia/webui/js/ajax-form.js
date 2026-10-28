(function () {
  // Generic "submit without navigating" helper. A normal <form method="post" action="/emit/...">
  // does a full-page POST navigation, which resets our own client-side tab state (see
  // PLAYERBOARD_DEV_NOTES.md §8) back to defaults — e.g. saving on a non-first version tab makes
  // the page appear to jump back to a different tab afterwards, looking like the save was lost.
  // Any form tagged class="ajax-form" gets submitted via fetch() instead, with an optional
  // [data-role="form-status"] element inside it updated with the result.
  function bindAjaxForm(form) {
    if (form.dataset.ajaxBound === "1") return;
    form.dataset.ajaxBound = "1";

    const statusEl = form.querySelector('[data-role="form-status"]');
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (statusEl) statusEl.textContent = "Saving…";
      const body = new URLSearchParams(new FormData(form));
      fetch(form.action, { method: "POST", body })
        .then(res => {
          if (statusEl) statusEl.textContent = res.ok ? "Saved." : `Save failed (HTTP ${res.status}).`;
        })
        .catch(err => {
          if (statusEl) statusEl.textContent = "Save failed: " + err;
        });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("form.ajax-form").forEach(bindAjaxForm);
  });
})();
