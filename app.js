document.addEventListener("DOMContentLoaded", () => {
  // عناصر الصفحات (Views) داخل نفس التبويب
  const views = {
    home: document.getElementById("homeView"),
    category: document.getElementById("categoryView"),
    reader: document.getElementById("readerView"),
    share: document.getElementById("shareView")
  };

  // عناصر الشبكات والنصوص
  const categoriesGrid = document.getElementById("categoriesGrid");
  const storiesGrid = document.getElementById("storiesGrid");
  const categoryPageTitle = document.getElementById("categoryPageTitle");
  const categoryPageDesc = document.getElementById("categoryPageDesc");

  // عناصر عارض PDF
  const pdfViewerFrame = document.getElementById("pdfViewerFrame");
  const pdfLoader = document.getElementById("pdfLoader");
  const readerStoryTitle = document.getElementById("readerStoryTitle");
  const readerStoryInfo = document.getElementById("readerStoryInfo");
  const fallbackPdfLink = document.getElementById("fallbackPdfLink");

  // عناصر نموذج المشاركة
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
  let currentInputMode = "text"; // 'text' أو 'pdf'
  const MAX_PDF_BYTES = 5 * 1024 * 1024; // 5 ميجابايت
  const APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbwQ0PLrZLQhkgDrlb1SZx89fB_nDP9-MKzVBVr-7_cycV-xKDd_9rgESZufP5YrEyUCjA/exec";

  // مفاتيح التخزين المحلي للمشاهدات والإعجابات
  const VIEWS_STORAGE_KEY = "erwely_viewed_stories_v1";
  const LIKES_STORAGE_KEY = "erwely_liked_stories_v1";

  function getStoredMap(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveStoredMap(key, mapObj) {
    try {
      localStorage.setItem(key, JSON.stringify(mapObj));
    } catch (e) {
      // تجاهل أخطاء التخزين في وضع التصفح الخاص
    }
  }

  // توليد مفتاح فريد وثابت لكل قصة
  function getStoryKey(categoryTitle, story) {
    if (story.id) return String(story.id);
    return `${categoryTitle}::${story.title}::${story.author}`;
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

  // دالة التبديل بين صفحات الموقع في نفس التبويب
  function switchView(viewName) {
    Object.values(views).forEach((section) => section.classList.remove("active-view"));
    views[viewName].classList.add("active-view");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // 1. بناء كروت المجموعات في الصفحة الرئيسية + تعبئة قائمة المجموعات في النموذج
  function renderCategories() {
    categoriesGrid.innerHTML = "";
    storyCategorySelect.innerHTML = '<option value="">-- اختر المجموعة --</option>';

    ERWELY_DATA.forEach((cat) => {
      const card = document.createElement("article");
      card.className = "story-card";
      card.setAttribute("tabindex", "0");
      card.innerHTML = `
        <div class="card-image-part">
          <img src="${cat.image}" alt="${cat.title}" loading="lazy" />
          <span class="card-badge">${cat.stories.length} قصص</span>
        </div>
        <div class="card-content-part">
          <h3 class="card-title">${cat.title}</h3>
          <p class="card-desc">${cat.description}</p>
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

      const option = document.createElement("option");
      option.value = cat.title;
      option.textContent = cat.title;
      storyCategorySelect.appendChild(option);
    });
  }

  // رسم كروت القصص داخل المجموعة المختارة
  function renderCategoryStories(category) {
    storiesGrid.innerHTML = "";

    category.stories.forEach((story) => {
      const storyKey = getStoryKey(category.title, story);
      const viewsCount = getStoryViewCount(storyKey);
      const liked = isStoryLiked(storyKey);

      const card = document.createElement("article");
      card.className = "story-card";
      card.setAttribute("tabindex", "0");
      card.innerHTML = `
        <div class="card-image-part">
          <img src="${story.image}" alt="${story.title}" loading="lazy" />
          <span class="card-badge">⏱ ${story.readTime}</span>
        </div>
        <div class="card-content-part">
          <div>
            <h3 class="card-title">${story.title}</h3>
            <p class="card-desc">بقلم / رواية: <strong>${story.author}</strong></p>
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

      likeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const nowLiked = toggleStoryLike(storyKey);
        likeBtn.classList.toggle("liked", nowLiked);
        likeBtn.setAttribute("aria-pressed", nowLiked ? "true" : "false");
        likeCountEl.textContent = nowLiked ? "1" : "0";
      });

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

  // 2. فتح صفحة المجموعة وعرض قصصها
  function openCategory(category) {
    currentCategory = category;
    categoryPageTitle.textContent = category.title;
    categoryPageDesc.textContent = category.description;
    renderCategoryStories(category);
    switchView("category");
  }

  // 3. فتح عارض الـ PDF داخل نفس الموقع وتسجيل المشاهدة
  function openPdfReader(story, storyKey) {
    if (storyKey) {
      markStoryAsViewed(storyKey);
    }

    readerStoryTitle.textContent = story.title;
    readerStoryInfo.textContent = `المؤلف / الراوي: ${story.author} • مدة القراءة: ${story.readTime}`;
    fallbackPdfLink.href = story.pdfUrl;

    pdfLoader.classList.remove("hidden");
    pdfViewerFrame.src = `${story.pdfUrl}#toolbar=1&navpanes=0`;

    pdfViewerFrame.onload = () => {
      pdfLoader.classList.add("hidden");
    };

    setTimeout(() => {
      pdfLoader.classList.add("hidden");
    }, 2500);

    switchView("reader");
  }

  // أزرار التنقل والرجوع
  document.getElementById("brandHomeBtn").addEventListener("click", () => switchView("home"));
  document.getElementById("navHomeBtn").addEventListener("click", () => switchView("home"));
  document.getElementById("backToHomeFromCat").addEventListener("click", () => switchView("home"));
  document.getElementById("backToHomeFromShare").addEventListener("click", () => switchView("home"));

  document.getElementById("backToCatFromReader").addEventListener("click", () => {
    pdfViewerFrame.src = "";
    if (currentCategory) {
      renderCategoryStories(currentCategory);
      switchView("category");
    } else {
      switchView("home");
    }
  });

  document.getElementById("navShareBtn").addEventListener("click", () => switchView("share"));
  document.getElementById("openShareFromCta").addEventListener("click", () => switchView("share"));

  // 4. التبديل بين كتابة القصة أو رفع ملف PDF
  tabWriteText.addEventListener("click", () => {
    currentInputMode = "text";
    tabWriteText.classList.add("active");
    tabUploadPdf.classList.remove("active");
    textInputWrapper.classList.remove("hidden");
    pdfInputWrapper.classList.add("hidden");
  });

  tabUploadPdf.addEventListener("click", () => {
    currentInputMode = "pdf";
    tabUploadPdf.classList.add("active");
    tabWriteText.classList.remove("active");
    pdfInputWrapper.classList.remove("hidden");
    textInputWrapper.classList.add("hidden");
  });

  // التحقق من صيغة وحجم ملف PDF (بحد أقصى 5MB)
  storyPdfFile.addEventListener("change", () => {
    fileErrorMsg.classList.add("hidden");
    const file = storyPdfFile.files[0];

    if (!file) {
      fileStatusText.textContent = "اضغط لاختيار ملف PDF من جهازك (الحد الأقصى 5 MB)";
      return;
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      fileErrorMsg.textContent = "تنبيه