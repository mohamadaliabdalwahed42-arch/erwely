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
  const storyCategorySelect = document.getElementById("storyCategory");
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
      // إنشاء كرت المجموعة (70% صورة + 30% نص)
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

      // إضافة المجموعة لقائمة الاختيار في نموذج "شارك الآن"
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

    // إخفاء مؤشر التحميل تلقائياً بعد 2.5 ثانية كاحتياط في بعض متصفحات الموبايل
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

  // 5. إرسال النموذج إلى البريد الإلكتروني mohawen72@gmail.com
  storySubmitForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    formFeedback.classList.add("hidden");

    const authorName = document.getElementById("authorName").value.trim();
    const storyTitle = document.getElementById("storyTitle").value.trim();
    const storyCategory = storyCategorySelect.value;
    const storyText = document.getElementById("storyText").value.trim();
    const pdfFile = storyPdfFile.files[0];

    if (!authorName || !storyTitle || !storyCategory) {
      showFeedback("يرجى ملء اسم المؤلف، عنوان القصة، واختيار المجموعة.", "error");
      return;
    }

    if (currentInputMode === "text" && !storyText) {
      showFeedback("يرجى كتابة نص القصة في المربع المخصص أو التبديل لرفع ملف PDF.", "error");
      return;
    }

    if (currentInputMode === "pdf" && !pdfFile) {
      showFeedback("يرجى اختيار ملف PDF للقصة (بحد أقصى 20 ميجابايت).", "error");
      return;
    }

    submitStoryBtn.disabled = true;
    submitStoryBtn.textContent = "جاري إرسال القصة...";

    try {
      const formData = new FormData();
      formData.append("_subject", `قصة جديدة على ERWELY: ${storyTitle}`);
      formData.append("_captcha", "false");
      formData.append("اسم_المؤلف_أو_الراوي", authorName);
      formData.append("عنوان_القصة", storyTitle);
      formData.append("المجموعة_المقترحة", storyCategory);

      if (currentInputMode === "text") {
        formData.append("نص_القصة", storyText);
      } else {
        formData.append("attachment", pdfFile);
      }

      // الإرسال عبر خدمة FormSubmit المرتبطة مباشرة ببريدك
      const response = await fetch("https://formsubmit.co/ajax/mohawen72@gmail.com", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error("فشل الاتصال بخدمة الإرسال");
      }

      showFeedback(
        "تم إرسال قصتك بنجاح إلى فريق ERWELY (إرويلي)! ستتم مراجعتها ونشرها باسمك في مجموعتها قريباً.",
        "success"
      );
      storySubmitForm.reset();
      fileStatusText.textContent = "اضغط لاختيار ملف PDF من جهازك (الحد الأقصى 20 MB)";
    } catch (error) {
      showFeedback(
        "حدث خطأ أثناء الإرسال. تأكد من اتصالك بالإنترنت أو تفعيل بريد الاستقبال أول مرة.",
        "error"
      );
    } finally {
      submitStoryBtn.disabled = false;
      submitStoryBtn.textContent = "إرسال القصة للمراجعة";
    }
  });

  function showFeedback(message, type) {
    formFeedback.textContent = message;
    formFeedback.className = `form-feedback ${type}`;
    formFeedback.classList.remove("hidden");
  }

  // تشغيل التهيئة الأولية
  renderCategories();
});