document.addEventListener("DOMContentLoaded", () => {
  const views = {
    home: document.getElementById("homeView"),
    category: document.getElementById("categoryView"),
    reader: document.getElementById("readerView"),
    share: document.getElementById("shareView")
  };

  const categoriesGrid = document.getElementById("categoriesGrid");
  const storiesGrid = document.getElementById("storiesGrid");
  const categoryPageTitle = document.getElementById("categoryPageTitle");
  const categoryPageDesc = document.getElementById("categoryPageDesc");

  // عناصر محرك البحث داخل المجموعة
  const categorySearchWrapper = document.getElementById("categorySearchWrapper");
  const categorySearchInput = document.getElementById("categorySearchInput");
  const clearCategorySearchBtn = document.getElementById("clearCategorySearchBtn");
  const categorySearchEmpty = document.getElementById("categorySearchEmpty");

  const pdfViewerFrame = document.getElementById("pdfViewerFrame");
  const pdfLoader = document.getElementById("pdfLoader");
  const readerStoryTitle = document.getElementById("readerStoryTitle");
  const readerStoryInfo = document.getElementById("readerStoryInfo");
  const fallbackPdfLink = document.getElementById("fallbackPdfLink");

  const authorNameInput = document.getElementById("authorName");
  const storyTitleInput = document.getElementById("storyTitle");
  const storyCategorySelect = document.getElementById("storyCategory");
  const storyTextInput = document.getElementById("storyText");
  const tabWriteText = document.getElementById("tabWriteText");
  const tabUploadPdf = document.getElementById("tabUploadPdf");
  const textInputWrapper = document.getElementById("textInputWrapper");
  const pdfInputWrapper = document.getElementById("pdfInputWrapper");
  const storyPdfFile = document.getElementById("storyPdfFile");
  const fileStatusText = document.getElementById("fileStatusText");
  const fileErrorMsg = document.getElementById("fileErrorMsg");
  const storySubmitForm = document.getElementById("storySubmitForm");
  const formFeedback = document.getElementById("formFeedback");
  const submitStoryBtn = document.getElementById("submitStoryBtn");

  let currentCategory = null;
  let currentInputMode = "text";
  const MAX_PDF_BYTES = 5 * 1024 * 1024;
  const APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbwQ0PLrZLQhkgDrlb1SZx89fB_nDP9-MKzVBVr-7_cycV-xKDd_9rgESZufP5YrEyUCjA/exec";

  const VIEWS_STORAGE_KEY = "erwely_viewed_stories_v1";
  const LIKES_STORAGE_KEY = "erwely_liked_stories_v1";

  function getStoredMap(key) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveStoredMap(key, mapObj) {
    try {
      window.localStorage.setItem(key, JSON.stringify(mapObj));
    } catch (e) {}
  }

  function getStoryKey(categoryTitle, story) {
    if (story && story.id) return String(story.id);
    return `${categoryTitle || ""}::${(story && story.title) || ""}::${(story && story.author) || ""}`;
  }

  function getStoryViewCount(storyKey) {
    const viewedMap = getStoredMap(VIEWS_STORAGE_KEY);
    return viewedMap[storyKey] ? 1 : 0;
  }

  function markStoryAsViewed(storyKey) {
    const viewedMap = getStoredMap(VIEWS_STORAGE_KEY);
    if (!viewedMap[storyKey]) {
      viewedMap[storyKey] = true;
      saveStoredMap(VIEWS_STORAGE_KEY, viewedMap);
    }
  }

  function isStoryLiked(storyKey) {
    const likedMap = getStoredMap(LIKES_STORAGE_KEY);
    return Boolean(likedMap[storyKey]);
  }

  function toggleStoryLike(storyKey) {
    const likedMap = getStoredMap(LIKES_STORAGE_KEY);
    if (likedMap[storyKey]) {
      delete likedMap[storyKey];
      saveStoredMap(LIKES_STORAGE_KEY, likedMap);
      return false;
    } else {
      likedMap[storyKey] = true;
      saveStoredMap(LIKES_STORAGE_KEY, likedMap);
      return true;
    }
  }

  function normalizeArabic(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .trim();
  }

  function switchView(viewName) {
    Object.values(views).forEach((section) => {
      if (section) section.classList.remove("active-view");
    });
    if (views[viewName]) {
      views[viewName].classList.add("active-view");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderCategories() {
    if (!categoriesGrid || typeof ERWELY_DATA === "undefined" || !Array.isArray(ERWELY_DATA)) {
      return;
    }

    categoriesGrid.innerHTML = "";
    if (storyCategorySelect) {
      storyCategorySelect.innerHTML = '<option value="">-- اختر المجموعة --</option>';
    }

    ERWELY_DATA.forEach((cat) => {
      const storiesList = Array.isArray(cat.stories) ? cat.stories : [];
      const card = document.createElement("article");
      card.className = "story-card";
      card.setAttribute("tabindex", "0");
      card.innerHTML = `
        <div class="card-image-part">
          <img src="${cat.image || ""}" alt="${cat.title || ""}" loading="lazy" />
          <span class="card-badge">${storiesList.length} قصص</span>
        </div>
        <div class="card-content-part">
          <h3 class="card-title">${cat.title || ""}</h3>
          <p class="card-desc">${cat.description || ""}</p>
        </div>
      `;

      card.addEventListener("click", () => openCategory(cat));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openCategory(cat);
        }
      });

      categoriesGrid.appendChild(card);

      if (storyCategorySelect) {
        const option = document.createElement("option");
        option.value = cat.title || "";
        option.textContent = cat.title || "";
        storyCategorySelect.appendChild(option);
      }
    });
  }

  function renderCategoryStories(category, searchQuery = "") {
    if (!storiesGrid) return;
    storiesGrid.innerHTML = "";

    const allStories = Array.isArray(category.stories) ? category.stories : [];
    const normalizedQuery = normalizeArabic(searchQuery);

    if (categorySearchWrapper) {
      categorySearchWrapper.classList.toggle("hidden", allStories.length === 0);
    }
    if (clearCategorySearchBtn) {
      clearCategorySearchBtn.classList.toggle("hidden", !searchQuery.trim());
    }

    const filteredStories = normalizedQuery
      ? allStories.filter((story) => {
          const titleMatch = normalizeArabic(story.title).includes(normalizedQuery);
          const authorMatch = normalizeArabic(story.author).includes(normalizedQuery);
          return titleMatch || authorMatch;
        })
      : allStories;

    if (categorySearchEmpty) {
      const showEmpty = allStories.length > 0 && filteredStories.length === 0;
      categorySearchEmpty.classList.toggle("hidden", !showEmpty);
    }

    filteredStories.forEach((story) => {
      const storyKey = getStoryKey(category.title, story);
      const viewsCount = getStoryViewCount(storyKey);
      const liked = isStoryLiked(storyKey);

      const card = document.createElement("article");
      card.className = "story-card";
      card.setAttribute("tabindex", "0");
      card.innerHTML = `
        <div class="card-image-part">
          <img src="${story.image || ""}" alt="${story.title || ""}" loading="lazy" />
          <span class="card-badge">⏱ ${story.readTime || ""}</span>
        </div>
        <div class="card-content-part">
          <div>
            <h3 class="card-title">${story.title || ""}</h3>
            <p class="card-desc">بقلم / رواية: <strong>${story.author || ""}</strong></p>
          </div>
          <div class="story-card-stats">
            <span class="stat-views" title="عدد مرات الفتح">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <span class="views-number">${viewsCount}</span>
            </span>

            <button
              type="button"
              class="like-heart-btn ${liked ? "liked" : ""}"
              aria-pressed="${liked ? "true" : "false"}"
              title="أعجبتني القصة"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              <span class="like-count">${liked ? 1 : 0}</span>
            </button>
          </div>
        </div>
      `;

      const likeBtn = card.querySelector(".like-heart-btn");
      const likeCountEl = card.querySelector(".like-count");

      if (likeBtn && likeCountEl) {
        likeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const nowLiked = toggleStoryLike(storyKey);
          likeBtn.classList.toggle("liked", nowLiked);
          likeBtn.setAttribute("aria-pressed", nowLiked ? "true" : "false");
          likeCountEl.textContent = nowLiked ? "1" : "0";
        });
      }

      card.addEventListener("click", () => openPdfReader(story, storyKey));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPdfReader(story, storyKey);
        }
      });

      storiesGrid.appendChild(card);
    });
  }

  function openCategory(category) {
    currentCategory = category;
    if (categoryPageTitle) categoryPageTitle.textContent = category.title || "";
    if (categoryPageDesc) categoryPageDesc.textContent = category.description || "";
    if (categorySearchInput) categorySearchInput.value = "";
    renderCategoryStories(category, "");
    switchView("category");
  }

  categorySearchInput?.addEventListener("input", () => {
    if (!currentCategory) return;
    renderCategoryStories(currentCategory, categorySearchInput.value);
  });

  clearCategorySearchBtn?.addEventListener("click", () => {
    if (!currentCategory || !categorySearchInput) return;
    categorySearchInput.value = "";
    renderCategoryStories(currentCategory, "");
    categorySearchInput.focus();
  });

  function openPdfReader(story, storyKey) {
    if (storyKey) {
      markStoryAsViewed(storyKey);
    }

    if (readerStoryTitle) readerStoryTitle.textContent = story.title || "";
    if (readerStoryInfo) {
      readerStoryInfo.textContent = `المؤلف / الراوي: ${story.author || ""} • مدة القراءة: ${story.readTime || ""}`;
    }
    if (fallbackPdfLink) fallbackPdfLink.href = story.pdfUrl || "#";

    if (pdfLoader) pdfLoader.classList.remove("hidden");
    if (pdfViewerFrame) {
      pdfViewerFrame.src = `${story.pdfUrl || ""}#toolbar=1&navpanes=0`;
      pdfViewerFrame.onload = () => {
        if (pdfLoader) pdfLoader.classList.add("hidden");
      };
    }

    setTimeout(() => {
      if (pdfLoader) pdfLoader.classList.add("hidden");
    }, 2500);

    switchView("reader");
  }

  document.getElementById("brandHomeBtn")?.addEventListener("click", () => switchView("home"));
  document.getElementById("navHomeBtn")?.addEventListener("click", () => switchView("home"));
  document.getElementById("backToHomeFromCat")?.addEventListener("click", () => switchView("home"));
  document.getElementById("backToHomeFromShare")?.addEventListener("click", () => switchView("home"));

  document.getElementById("backToCatFromReader")?.addEventListener("click", () => {
    if (pdfViewerFrame) pdfViewerFrame.src = "";
    if (currentCategory) {
      const currentQuery = categorySearchInput ? categorySearchInput.value : "";
      renderCategoryStories(currentCategory, currentQuery);
      switchView("category");
    } else {
      switchView("home");
    }
  });

  document.getElementById("navShareBtn")?.addEventListener("click", () => switchView("share"));
  document.getElementById("openShareFromCta")?.addEventListener("click", () => switchView("share"));

  tabWriteText?.addEventListener("click", () => {
    currentInputMode = "text";
    tabWriteText.classList.add("active");
    tabUploadPdf?.classList.remove("active");
    textInputWrapper?.classList.remove("hidden");
    pdfInputWrapper?.classList.add("hidden");
  });

  tabUploadPdf?.addEventListener("click", () => {
    currentInputMode = "pdf";
    tabUploadPdf.classList.add("active");
    tabWriteText?.classList.remove("active");
    pdfInputWrapper?.classList.remove("hidden");
    textInputWrapper?.classList.add("hidden");
  });

  storyPdfFile?.addEventListener("change", () => {
    fileErrorMsg?.classList.add("hidden");
    const file = storyPdfFile.files[0];

    if (!file) {
      if (fileStatusText) fileStatusText.textContent = "اضغط لاختيار ملف PDF من جهازك (الحد الأقصى 5 MB)";
      return;
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      if (fileErrorMsg) {
        fileErrorMsg.textContent = "تنبيه: يُسمح برفع الملفات بصيغة PDF فقط.";
        fileErrorMsg.classList.remove("hidden");
      }
      storyPdfFile.value = "";
      if (fileStatusText) fileStatusText.textContent = "اضغط لاختيار ملف PDF من جهازك (الحد الأقصى 5 MB)";
      return;
    }

    if (file.size > MAX_PDF_BYTES) {
      const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
      if (fileErrorMsg) {
        fileErrorMsg.textContent = `تنبيه: حجم الملف (${sizeInMb} MB) يتجاوز الحد الأقصى المسموح به وهو 5 ميجابايت.`;
        fileErrorMsg.classList.remove("hidden");
      }
      storyPdfFile.value = "";
      if (fileStatusText) fileStatusText.textContent = "اضغط لاختيار ملف PDF من جهازك (الحد الأقصى 5 MB)";
      return;
    }

    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    if (fileStatusText) fileStatusText.textContent = `تم اختيار الملف: ${file.name} (${sizeInMb} MB)`;
  });

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  function showFeedback(message, type) {
    if (!formFeedback) return;
    formFeedback.textContent = message;
    formFeedback.className = `form-feedback ${type}`;
    formFeedback.classList.remove("hidden");
  }

  storySubmitForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    formFeedback?.classList.add("hidden");

    const authorName = authorNameInput ? authorNameInput.value.trim() : "";
    const title = storyTitleInput ? storyTitleInput.value.trim() : "";
    const category = storyCategorySelect ? storyCategorySelect.value.trim() : "";
    const storyText = currentInputMode === "text" && storyTextInput ? storyTextInput.value.trim() : "";
    const pdfFile =
      currentInputMode === "pdf" && storyPdfFile && storyPdfFile.files && storyPdfFile.files[0]
        ? storyPdfFile.files[0]
        : null;

    if (!authorName || !title || !category) {
      showFeedback("من فضلك املأ اسم المؤلف وعنوان القصة واختر المجموعة.", "error");
      return;
    }

    if (currentInputMode === "text" && !storyText) {
      showFeedback("من فضلك اكتب نص القصة قبل الإرسال.", "error");
      return;
    }

    if (currentInputMode === "pdf" && !pdfFile) {
      showFeedback("من فضلك اختر ملف PDF قبل الإرسال.", "error");
      return;
    }

    let pdfBase64 = "";
    let pdfName = "";
    const originalBtnText = submitStoryBtn ? submitStoryBtn.textContent : "إرسال القصة للمراجعة";

    try {
      if (submitStoryBtn) {
        submitStoryBtn.disabled = true;
        submitStoryBtn.textContent = "جاري الإرسال، يرجى الانتظار...";
      }

      if (pdfFile) {
        pdfBase64 = await fileToBase64(pdfFile);
        pdfName = pdfFile.name;
      }

      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({
          authorName,
          title,
          category,
          storyText,
          pdfBase64,
          pdfName
        })
      });

      showFeedback("تم إرسال مشاركتك بنجاح، شكراً لمساهمتك في ERWELY.", "success");
      storySubmitForm.reset();
      if (fileStatusText) fileStatusText.textContent = "اضغط لاختيار ملف PDF من جهازك (الحد الأقصى 5 MB)";
    } catch (error) {
      showFeedback("حدث خطأ في الاتصال أثناء الإرسال، تحقق من الإنترنت وحاول مجدداً.", "error");
    } finally {
      if (submitStoryBtn) {
        submitStoryBtn.disabled = false;
        submitStoryBtn.textContent = originalBtnText;
      }
    }
  });

  try {
    renderCategories();
  } catch (err) {
    console.error("Error rendering categories:", err);
  }
});