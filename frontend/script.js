const API_BASE = "http://127.0.0.1:8080";
let currentData = null;
let sortMode = "engagement";

const form          = document.getElementById("searchForm");
const usernameInput = document.getElementById("usernameInput");
const maxPostsInput = document.getElementById("maxPosts");
const postsCount    = document.getElementById("postsCount");
const fetchBtn      = document.getElementById("fetchBtn");

const errorBanner   = document.getElementById("errorBanner");
const errorMessage  = document.getElementById("errorMessage");
const dismissError  = document.getElementById("dismissError");

const loadingSection  = document.getElementById("loadingSection");
const resultsSection  = document.getElementById("resultsSection");

const profilePic      = document.getElementById("profilePic");
const profileFullName = document.getElementById("profileFullName");
const profileUsername = document.getElementById("profileUsername");
const profileBio      = document.getElementById("profileBio");
const verifiedBadge   = document.getElementById("verifiedBadge");
const statPosts       = document.getElementById("statPosts");
const statFollowers   = document.getElementById("statFollowers");
const statFollowing   = document.getElementById("statFollowing");

const postsBadge = document.getElementById("postsBadge");
const postsGrid  = document.getElementById("postsGrid");
const sortSelect = document.getElementById("sortSelect");
const exportBtn  = document.getElementById("exportBtn");

maxPostsInput.addEventListener("input", () => {
  postsCount.textContent = maxPostsInput.value;
});

sortSelect.addEventListener("change", () => {
  sortMode = sortSelect.value;
  if (currentData) renderPosts(currentData.posts);
});

dismissError.addEventListener("click", hideError);

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = usernameInput.value.trim().replace(/^@/, "");
  if (!username) {
    showError("Please enter an Instagram username.");
    usernameInput.focus();
    return;
  }

  await fetchPosts(username, parseInt(maxPostsInput.value, 10));
});
exportBtn.addEventListener("click", () => {
  if (!currentData) return;
  const blob = new Blob([JSON.stringify(currentData, null, 2)], {
    type: "application/json",
  });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `instagram_${currentData.username}_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});
async function fetchPosts(username, maxPosts) {
  hideError();
  showLoading();
  hideResults();
  setFetchBtnState(true);

  try {
    const response = await fetch(`${API_BASE}/api/fetch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, max_posts: maxPosts }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data?.detail || `Server error (${response.status})`;
      throw new Error(msg);
    }

    currentData = data;
    render(data);

  } catch (err) {
    if (err instanceof TypeError && err.message.includes("fetch")) {
      showError(
        "Cannot reach the backend. Make sure the server is running at " +
        API_BASE + " (run: uvicorn main:app --reload in the backend folder)."
      );
    } else {
      showError(err.message || "An unexpected error occurred.");
    }
    hideResults();
  } finally {
    hideLoading();
    setFetchBtnState(false);
  }
}

function render(data) {
  // Profile card
  profilePic.src = data.profile_pic_url || "";
  profilePic.alt = `${data.username} profile picture`;
  profileFullName.textContent = data.full_name || data.username;
  profileUsername.textContent = `@${data.username}`;
  profileBio.textContent      = data.biography || "";

  if (data.is_verified) {
    verifiedBadge.classList.remove("hidden");
  } else {
    verifiedBadge.classList.add("hidden");
  }

  statPosts.textContent     = fmt(data.post_count);
  statFollowers.textContent = fmt(data.followers);
  statFollowing.textContent = fmt(data.following);

  renderPosts(data.posts);
  showResults();
}

function renderPosts(posts) {
  const sorted = sortPosts([...posts], sortMode);
  postsBadge.textContent = sorted.length;
  postsGrid.innerHTML = "";

  sorted.forEach((post) => {
    postsGrid.appendChild(buildPostCard(post));
  });
}
function sortPosts(posts, mode) {
  if (mode === "engagement") {
    return posts.sort((a, b) => b.likes - a.likes);
  }
  if (mode === "newest") {
    return posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  if (mode === "oldest") {
    return posts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }
  return posts;
}

function buildPostCard(post) {
  const card = document.createElement("div");
  card.className = "post-card";

  const mediaType = (post.media_type || "image").toLowerCase();
  const dateStr   = formatDate(post.timestamp);
  const hasCaption = post.caption && post.caption.trim().length > 0;
  const CHAR_LIMIT = 220;
  const captionHtml = buildCaption(post.caption, CHAR_LIMIT);

  card.innerHTML = `
    <div class="post-header">
      <span class="media-badge ${mediaType}">${mediaTypeLabel(mediaType)}</span>
      <span class="post-date">${dateStr}</span>
    </div>

    <div class="post-caption">
      ${captionHtml}
    </div>

    <div class="post-footer">
      <div class="likes-pill">
        <span class="likes-icon">♥</span>
        <span>${fmt(post.likes)} likes</span>
      </div>
      <a class="open-link" href="${escHtml(post.url)}" target="_blank" rel="noopener">
        Open ↗
      </a>
    </div>
  `;
  const rmBtn = card.querySelector(".read-more-btn");
  if (rmBtn) {
    rmBtn.addEventListener("click", () => {
      const ct = card.querySelector(".caption-text");
      const isExpanded = ct.classList.toggle("expanded");
      if (isExpanded) {
        ct.style.webkitLineClamp = "unset";
        ct.style.overflow = "visible";
        rmBtn.textContent = "Show less";
      } else {
        ct.style.webkitLineClamp = "5";
        ct.style.overflow = "hidden";
        rmBtn.textContent = "Read more";
      }
    });
  }

  return card;
}

function buildCaption(caption, charLimit) {
  if (!caption || !caption.trim()) {
    return `<span class="caption-placeholder">No caption</span>`;
  }

  const cleaned = caption.trim();
  const isLong  = cleaned.length > charLimit;

  return `
    <span class="caption-text">${escHtml(cleaned)}</span>
    ${isLong ? `<button class="read-more-btn">Read more</button>` : ""}
  `;
}
function fmt(n) {
  if (n == null || n === "") return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 10_000)    return (n / 1_000).toFixed(1) + "K";
  if (n >= 1_000)     return n.toLocaleString();
  return String(n);
}

function formatDate(ts) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return ts; }
}

function mediaTypeLabel(type) {
  const labels = {
    image: "📷 Image",
    video: "🎬 Video",
    reel:  "🎞 Reel",
    carousel: "🖼 Carousel",
  };
  return labels[type] || type;
}

function escHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str || ""));
  return div.innerHTML;
}
function showError(msg)  { errorMessage.textContent = msg; errorBanner.classList.remove("hidden"); }
function hideError()     { errorBanner.classList.add("hidden"); }
function showLoading()   { loadingSection.classList.remove("hidden"); }
function hideLoading()   { loadingSection.classList.add("hidden"); }
function showResults()   { resultsSection.classList.remove("hidden"); }
function hideResults()   { resultsSection.classList.add("hidden"); }

function setFetchBtnState(disabled) {
  fetchBtn.disabled = disabled;
  fetchBtn.querySelector(".btn-text").textContent = disabled ? "Fetching…" : "Fetch Posts";
}