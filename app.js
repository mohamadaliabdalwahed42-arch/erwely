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
  const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 ميجابايت
  const APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbyZds7j6i7kynQ7o5Q0GSH6mt-1RA-kBYI0txRA3PYzyNo6vdHeMI1Y-jJfYk53F-Pdwg/exec";

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

  // 2. فتح صفحة المجموعة وعرض قصصها
  function openCategory(category) {
    currentCategory = category;
    categoryPageTitle.textContent = category.title;
    categoryPageDesc.textContent = category.description;
    storiesGrid.innerHTML = "";

    category.stories.forEach((story) => {
      const card = document.createElement("article");
      card.className = "story-card";
      card.setAttribute("tabindex", "0");
      card.innerHTML = `
        <div class="card-image-part">
          <img src="${story.image}" alt="${story.title}" loading="lazy" />
          <span class="card-badge">⏱ ${story.readTime}</span>
        </div>
        <div class="card-content-part">
          <h3 class="card-title">${story.title}</h3>
          <p class="card-desc">بقلم / رواية: <strong>${story.author}</strong></p>
        </div>
      `;

      card.addEventListener("click", () => openPdfReader(story));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPdfReader(story);
        }
      });

      storiesGrid.appendChild(card);
    });

    switchView("category");
  }

  // 3. فتح عارض الـ PDF داخل نفس الموقع
  function openPdfReader(story) {
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

  // التحقق من صيغة وحجم ملف PDF (بحد أقصى 20MB)
  storyPdfFile.addEventListener("change", () => {
    fileErrorMsg.classList.add("hidden");
    const file = storyPdfFile.files[0];

    if (!file) {
      fileStatusText.textContent = "اضغط لاختيار ملف PDF من جهازك (الحد الأقصى 20 MB)";
      return;
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      fileErrorMsg.textContent = "تنبيه: يُسمح برفع الملفات بصيغة PDF فقط.";
      fileErrorMsg.classList.remove("hidden");
      storyPdfFile.value = "";
      fileStatusText.textContent = "اضغط لاختيار ملف PDF من جهازك (الحد الأقصى 20 MB)";
      return;
    }

    if (file.size > MAX_PDF_BYTES) {
      const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
      fileErrorMsg.textContent = `تنبيه: حجم الملف (${sizeInMb} MB) يتجاوز الحد الأقصى المسموح به وهو 20 ميجابايت.`;
      fileErrorMsg.classList.remove("hidden");
      storyPdfFile.value = "";
      fileStatusText.textContent = "اضغط لاختيار ملف PDF من جهازك (الحد الأقصى 20 MB)";
      return;
    }

    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    fileStatusText.textContent = `تم اختيار الملف: ${file.name} (${sizeInMb} MB)`;
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
    formFeedback.textContent = message;
    formFeedback.className = `form-feedback ${type}`;
    formFeedback.classList.remove("hidden");
  }

  // 5. إرسال النموذج إلى Google Sheets وGoogle Drive عبر Apps Script
  storySubmitForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    formFeedback.classList.add("hidden");

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

    try {
      if (submitStoryBtn) submitStoryBtn.disabled = true;

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
      fileStatusText.textContent = "اضغط لاختيار ملف PDF من جهازك (الحد الأقصى 20 MB)";
    } catch (error) {
      showFeedback("حدث خطأ في الاتصال أثناء الإرسال، تحقق من الإنترنت وحاول مجدداً.", "error");
    } finally {
      if (submitStoryBtn) submitStoryBtn.disabled = false;
    }
  });

  // تشغيل التهيئة الأولية
  renderCategories();
});