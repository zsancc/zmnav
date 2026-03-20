const AUTH_PASSWORD_MIN_LENGTH = 6;
const SAVE_DEBOUNCE_MS = 260;

const DEFAULT_ITEMS = [
  { id: 1, name: "OpenAI", url: "https://openai.com", category: "AI", description: "模型与产品入口", isFavorite: true, clickCount: 0 },
  { id: 2, name: "Perplexity", url: "https://www.perplexity.ai", category: "AI", description: "研究与检索", isFavorite: true, clickCount: 0 },
  { id: 3, name: "GitHub", url: "https://github.com", category: "开发", description: "代码托管与协作", isFavorite: true, clickCount: 0 },
  { id: 4, name: "MDN", url: "https://developer.mozilla.org", category: "开发", description: "Web 文档", isFavorite: true, clickCount: 0 },
  { id: 5, name: "Vercel", url: "https://vercel.com", category: "开发", description: "前端部署平台", isFavorite: true, clickCount: 0 },
  { id: 6, name: "Figma", url: "https://www.figma.com", category: "设计", description: "设计协作", isFavorite: true, clickCount: 0 },
  { id: 7, name: "Behance", url: "https://www.behance.net", category: "设计", description: "灵感案例", isFavorite: true, clickCount: 0 },
  { id: 8, name: "Dribbble", url: "https://dribbble.com", category: "设计", description: "视觉灵感", isFavorite: true, clickCount: 0 },
  { id: 9, name: "Notion", url: "https://www.notion.so", category: "效率", description: "文档与知识库", isFavorite: false, clickCount: 0 },
  { id: 10, name: "Linear", url: "https://linear.app", category: "效率", description: "任务协作", isFavorite: false, clickCount: 0 },
  { id: 11, name: "掘金", url: "https://juejin.cn", category: "资讯", description: "中文技术内容", isFavorite: false, clickCount: 0 },
  { id: 12, name: "少数派", url: "https://sspai.com", category: "资讯", description: "效率工具与产品内容", isFavorite: false, clickCount: 0 },
];

const palette = ["#4c78ff", "#18c0d5", "#ff8b5d", "#6d75ff", "#2ab784", "#d34d6e"];
const DEFAULT_SETTINGS = {
  siteTitle: "高密度导航页",
  siteSubtitle: "把常用网址放在眼前，打开更快一点。",
  avatarImage: "",
  icpCode: "",
  backgroundMode: "argon",
  backgroundImage: "",
};
const BACKGROUND_MODES = new Set(["argon", "mist", "sunset", "image"]);
const ICON_LOAD_CONCURRENCY = 3;
const ICON_QUEUE_DELAY_MS = 120;

const iconLoadEntries = new Map();
const iconLoadQueue = [];
const COMMON_CATEGORY = "常用";
const AUTO_COMMON_THRESHOLD = 10;
const LEGACY_COMMON_SEED_COUNT = 8;

let activeIconLoads = 0;
let iconQueueScheduled = false;

const state = {
  items: [],
  categories: [],
  settings: { ...DEFAULT_SETTINGS },
  activeCategory: COMMON_CATEGORY,
  searchTerm: "",
  webSearchEngine: "baidu",
  editingId: null,
  editingCategoryName: null,
  lastUpdatedAt: null,
  user: null,
  authMode: "login",
  authConfig: {
    allowPublicRegistration: false,
    hasUsers: false,
    hasAdmin: false,
    needsSetup: false,
  },
};

let persistTimer = 0;
let persistInFlight = false;
let persistQueued = false;

const elements = {
  appLayout: document.querySelector("#appLayout"),
  addSiteBtn: document.querySelector("#addSiteBtn"),
  settingsBtn: document.querySelector("#settingsBtn"),
  emptyAddBtn: document.querySelector("#emptyAddBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  importBtn: document.querySelector("#importBtn"),
  importInput: document.querySelector("#importInput"),
  searchInput: document.querySelector("#searchInput"),
  webSearchForm: document.querySelector("#webSearchForm"),
  webSearchInput: document.querySelector("#webSearchInput"),
  webSearchEngines: document.querySelector("#webSearchEngines"),
  categoryChips: document.querySelector("#categoryChips"),
  siteGrid: document.querySelector("#siteGrid"),
  emptyState: document.querySelector("#emptyState"),
  emptyTitle: document.querySelector("#emptyTitle"),
  emptyText: document.querySelector("#emptyText"),
  resultTitle: document.querySelector("#resultTitle"),
  resultMeta: document.querySelector("#resultMeta"),
  authScreen: document.querySelector("#authScreen"),
  authTabs: document.querySelector("#authTabs"),
  registerTabBtn: document.querySelector("#registerTabBtn"),
  authForm: document.querySelector("#authForm"),
  authStatus: document.querySelector("#authStatus"),
  authUsername: document.querySelector("#authUsername"),
  authPassword: document.querySelector("#authPassword"),
  authConfirmField: document.querySelector("#authConfirmField"),
  authConfirmPassword: document.querySelector("#authConfirmPassword"),
  authSubmitBtn: document.querySelector("#authSubmitBtn"),
  authTip: document.querySelector("#authTip"),
  brandAvatar: document.querySelector("#brandAvatar"),
  siteHeading: document.querySelector("#siteHeading"),
  siteSubtitle: document.querySelector("#siteSubtitle"),
  manageCategoriesBtn: document.querySelector("#manageCategoriesBtn"),
  siteDialog: document.querySelector("#siteDialog"),
  siteForm: document.querySelector("#siteForm"),
  dialogTitle: document.querySelector("#dialogTitle"),
  closeDialogBtn: document.querySelector("#closeDialogBtn"),
  cancelDialogBtn: document.querySelector("#cancelDialogBtn"),
  siteUrl: document.querySelector("#siteUrl"),
  siteName: document.querySelector("#siteName"),
  siteCategory: document.querySelector("#siteCategory"),
  siteFavorite: document.querySelector("#siteFavorite"),
  siteDescription: document.querySelector("#siteDescription"),
  categorySuggestions: document.querySelector("#categorySuggestions"),
  previewIcon: document.querySelector("#previewIcon"),
  previewTitle: document.querySelector("#previewTitle"),
  previewMeta: document.querySelector("#previewMeta"),
  categoryDialog: document.querySelector("#categoryDialog"),
  categoryForm: document.querySelector("#categoryForm"),
  categoryDialogTitle: document.querySelector("#categoryDialogTitle"),
  closeCategoryDialogBtn: document.querySelector("#closeCategoryDialogBtn"),
  cancelCategoryEditBtn: document.querySelector("#cancelCategoryEditBtn"),
  categoryNameInput: document.querySelector("#categoryNameInput"),
  saveCategoryBtn: document.querySelector("#saveCategoryBtn"),
  categoryManagerList: document.querySelector("#categoryManagerList"),
  settingsDialog: document.querySelector("#settingsDialog"),
  settingsForm: document.querySelector("#settingsForm"),
  closeSettingsDialogBtn: document.querySelector("#closeSettingsDialogBtn"),
  cancelSettingsBtn: document.querySelector("#cancelSettingsBtn"),
  settingsSiteTitle: document.querySelector("#settingsSiteTitle"),
  settingsSiteSubtitle: document.querySelector("#settingsSiteSubtitle"),
  settingsAvatarImage: document.querySelector("#settingsAvatarImage"),
  settingsIcpCode: document.querySelector("#settingsIcpCode"),
  settingsBackgroundMode: document.querySelector("#settingsBackgroundMode"),
  settingsBackgroundImage: document.querySelector("#settingsBackgroundImage"),
  settingsImageUrlField: document.querySelector("#settingsImageUrlField"),
  settingsAccountName: document.querySelector("#settingsAccountName"),
  settingsAccountRole: document.querySelector("#settingsAccountRole"),
  changePasswordBtn: document.querySelector("#changePasswordBtn"),
  createUserBtn: document.querySelector("#createUserBtn"),
  logoutBtn: document.querySelector("#logoutBtn"),
  passwordDialog: document.querySelector("#passwordDialog"),
  passwordForm: document.querySelector("#passwordForm"),
  closePasswordDialogBtn: document.querySelector("#closePasswordDialogBtn"),
  cancelPasswordBtn: document.querySelector("#cancelPasswordBtn"),
  savePasswordBtn: document.querySelector("#savePasswordBtn"),
  currentPassword: document.querySelector("#currentPassword"),
  newPassword: document.querySelector("#newPassword"),
  confirmNewPassword: document.querySelector("#confirmNewPassword"),
  createUserDialog: document.querySelector("#createUserDialog"),
  createUserForm: document.querySelector("#createUserForm"),
  closeCreateUserDialogBtn: document.querySelector("#closeCreateUserDialogBtn"),
  cancelCreateUserBtn: document.querySelector("#cancelCreateUserBtn"),
  saveCreateUserBtn: document.querySelector("#saveCreateUserBtn"),
  createUsername: document.querySelector("#createUsername"),
  createPassword: document.querySelector("#createPassword"),
  createConfirmPassword: document.querySelector("#createConfirmPassword"),
  metricCategories: document.querySelector("#metricCategories"),
  contentFooter: document.querySelector("#contentFooter"),
  footerIcpLink: document.querySelector("#footerIcpLink"),
  toastRegion: document.querySelector("#toastRegion"),
};

void init();

async function init() {
  bindEvents();
  setAuthMode("login");
  updatePreview();
  await restoreSession();
}

function bindEvents() {
  elements.addSiteBtn.addEventListener("click", () => openDialog());
  elements.settingsBtn.addEventListener("click", openSettingsDialog);
  elements.emptyAddBtn.addEventListener("click", () => openDialog());
  elements.manageCategoriesBtn.addEventListener("click", openCategoryDialog);
  elements.exportBtn.addEventListener("click", exportState);
  elements.importBtn.addEventListener("click", () => elements.importInput.click());
  elements.importInput.addEventListener("change", importState);
  elements.searchInput.addEventListener("input", (event) => {
    state.searchTerm = event.target.value.trim();
    render();
  });
  elements.webSearchForm.addEventListener("submit", handleWebSearch);
  elements.siteForm.addEventListener("submit", handleSubmit);
  elements.categoryForm.addEventListener("submit", handleCategorySubmit);
  elements.closeDialogBtn.addEventListener("click", closeDialog);
  elements.cancelDialogBtn.addEventListener("click", closeDialog);
  elements.closeCategoryDialogBtn.addEventListener("click", closeCategoryDialog);
  elements.cancelCategoryEditBtn.addEventListener("click", resetCategoryEditor);
  elements.closeSettingsDialogBtn.addEventListener("click", closeSettingsDialog);
  elements.cancelSettingsBtn.addEventListener("click", closeSettingsDialog);
  elements.settingsForm.addEventListener("submit", handleSettingsSubmit);
  elements.settingsBackgroundMode.addEventListener("change", syncSettingsImageField);
  elements.authTabs.addEventListener("click", handleAuthTabClick);
  elements.authForm.addEventListener("submit", handleAuthSubmit);
  elements.changePasswordBtn.addEventListener("click", openPasswordDialog);
  elements.createUserBtn.addEventListener("click", openCreateUserDialog);
  elements.logoutBtn.addEventListener("click", handleLogout);
  elements.passwordForm.addEventListener("submit", handleChangePasswordSubmit);
  elements.closePasswordDialogBtn.addEventListener("click", closePasswordDialog);
  elements.cancelPasswordBtn.addEventListener("click", closePasswordDialog);
  elements.createUserForm.addEventListener("submit", handleCreateUserSubmit);
  elements.closeCreateUserDialogBtn.addEventListener("click", closeCreateUserDialog);
  elements.cancelCreateUserBtn.addEventListener("click", closeCreateUserDialog);
  elements.siteDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog();
  });
  elements.categoryDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeCategoryDialog();
  });
  elements.settingsDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeSettingsDialog();
  });
  elements.passwordDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closePasswordDialog();
  });
  elements.createUserDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeCreateUserDialog();
  });

  [elements.siteUrl, elements.siteName, elements.siteCategory].forEach((field) => {
    field.addEventListener("input", updatePreview);
  });

  elements.siteUrl.addEventListener("blur", () => {
    if (!elements.siteName.value.trim()) {
      elements.siteName.value = deriveNameFromUrl(elements.siteUrl.value);
      updatePreview();
    }
  });

  document.addEventListener("click", handleDelegatedClick);
  document.addEventListener("keydown", handleShortcuts);
}

function handleDelegatedClick(event) {
  const engineButton = event.target.closest("[data-search-engine]");
  if (engineButton) {
    state.webSearchEngine = engineButton.dataset.searchEngine;
    renderWebSearchEngines();
    return;
  }

  const chip = event.target.closest("[data-chip]");
  if (chip) {
    state.activeCategory = chip.dataset.chip;
    render();
    return;
  }

  const editButton = event.target.closest("[data-edit-id]");
  if (editButton) {
    event.preventDefault();
    openDialog(Number(editButton.dataset.editId));
    return;
  }

  const deleteButton = event.target.closest("[data-delete-id]");
  if (deleteButton) {
    event.preventDefault();
    deleteItem(Number(deleteButton.dataset.deleteId));
    return;
  }

  const renameCategoryButton = event.target.closest("[data-rename-category]");
  if (renameCategoryButton) {
    event.preventDefault();
    startCategoryEdit(renameCategoryButton.dataset.renameCategory);
    return;
  }

  const deleteCategoryButton = event.target.closest("[data-delete-category]");
  if (deleteCategoryButton) {
    event.preventDefault();
    deleteCategory(deleteCategoryButton.dataset.deleteCategory);
  }
}

function handleShortcuts(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    elements.searchInput.focus();
    elements.searchInput.select();
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
    event.preventDefault();
    openDialog();
  }
}

async function restoreSession() {
  setAuthPending(true);

  try {
    const { response, payload } = await fetchJson("/api/auth/session");
    applyAuthConfig(payload.authConfig);
    if (response.ok && payload.authenticated && payload.user) {
      state.user = payload.user;
      setAuthenticatedView(true);
      await loadState({ silent: true });
      finishAuthBootstrap();
      return;
    }
  } catch (error) {
    console.error(error);
    showToast("连接服务器失败，请稍后重试");
  } finally {
    setAuthPending(false);
  }

  clearRuntimeState();
  setAuthenticatedView(false);
  renderAuthMode();
  finishAuthBootstrap();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
  });
  const payload = await readJsonResponse(response);
  return { response, payload };
}

function setAuthenticatedView(isAuthenticated) {
  elements.appLayout.classList.toggle("hidden", !isAuthenticated);
  elements.authScreen.classList.toggle("hidden", isAuthenticated);
}

function finishAuthBootstrap() {
  document.documentElement.classList.remove("session-booting");
}

function applyAuthConfig(config) {
  state.authConfig = {
    allowPublicRegistration: Boolean(config?.allowPublicRegistration),
    hasUsers: Boolean(config?.hasUsers),
    hasAdmin: Boolean(config?.hasAdmin),
    needsSetup: Boolean(config?.needsSetup),
  };
}

function setAuthMode(mode) {
  const nextMode =
    mode === "register" && state.authConfig.allowPublicRegistration ? "register" : "login";
  state.authMode = nextMode;
  renderAuthMode();
}

function renderAuthMode() {
  const allowRegistration = state.authConfig.allowPublicRegistration;
  if (!allowRegistration && state.authMode === "register") {
    state.authMode = "login";
  }

  const isRegister = state.authMode === "register" && allowRegistration;
  const buttons = elements.authTabs.querySelectorAll("[data-auth-mode]");
  buttons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.authMode === state.authMode);
  });
  elements.registerTabBtn.classList.toggle("hidden", !allowRegistration);
  elements.authTabs.classList.toggle("hidden", !allowRegistration);
  elements.authConfirmField.classList.toggle("hidden", !isRegister);
  elements.authConfirmPassword.disabled = !isRegister;
  elements.authPassword.autocomplete = isRegister ? "new-password" : "current-password";
  elements.authSubmitBtn.textContent = isRegister ? "注册" : "登录";

  let statusMessage = "";
  let tipMessage = "";

  if (state.authConfig.needsSetup) {
    statusMessage = "请先在服务器环境变量中设置管理员账号后再登录。";
  } else if (isRegister) {
    tipMessage = "注册后会自动进入导航页。";
  }

  elements.authStatus.textContent = statusMessage;
  elements.authStatus.classList.toggle("hidden", !statusMessage);
  elements.authTip.textContent = tipMessage;
  elements.authTip.classList.toggle("hidden", !tipMessage);
}

function handleAuthTabClick(event) {
  const button = event.target.closest("[data-auth-mode]");
  if (!button) {
    return;
  }

  setAuthMode(button.dataset.authMode);
}

function setAuthPending(pending) {
  const controls = [
    elements.authUsername,
    elements.authPassword,
    elements.authConfirmPassword,
    elements.authSubmitBtn,
  ];
  controls.forEach((element) => {
    element.disabled = pending;
  });

  const tabs = elements.authTabs.querySelectorAll("[data-auth-mode]");
  tabs.forEach((button) => {
    button.disabled = pending;
  });

  elements.authSubmitBtn.textContent = pending
    ? state.authMode === "register"
      ? "注册中..."
      : "登录中..."
    : state.authMode === "register"
      ? "注册"
      : "登录";
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  const username = String(elements.authUsername.value || "").trim().slice(0, 32);
  const password = String(elements.authPassword.value || "");
  const confirmPassword = String(elements.authConfirmPassword.value || "");
  const isRegister = state.authMode === "register";

  if (state.authConfig.needsSetup) {
    showToast("请先在服务器配置管理员账号并重启服务");
    return;
  }

  if (isRegister && !state.authConfig.allowPublicRegistration) {
    showToast("当前站点未开放公开注册");
    return;
  }

  if (username.length < 2) {
    showToast("用户名至少 2 位");
    elements.authUsername.focus();
    return;
  }

  if (password.length < AUTH_PASSWORD_MIN_LENGTH) {
    showToast(`密码至少 ${AUTH_PASSWORD_MIN_LENGTH} 位`);
    elements.authPassword.focus();
    return;
  }

  if (isRegister && password !== confirmPassword) {
    showToast("两次输入的密码不一致");
    elements.authConfirmPassword.focus();
    return;
  }

  setAuthPending(true);

  try {
    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
    const { response, payload } = await fetchJson(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      showToast(payload.error || (isRegister ? "注册失败" : "登录失败"));
      return;
    }

    applyAuthConfig(payload.authConfig);
    state.user = payload.user || { username };
    elements.authForm.reset();
    setAuthenticatedView(true);
    await loadState({ silent: true });
    showToast(isRegister ? "注册成功，已进入导航页" : "登录成功");
  } catch (error) {
    console.error(error);
    showToast(isRegister ? "注册失败，请稍后重试" : "登录失败，请稍后重试");
  } finally {
    setAuthPending(false);
  }
}

async function handleLogout() {
  const confirmed = window.confirm("退出登录后，需要重新输入账号密码才能进入，是否继续？");
  if (!confirmed) {
    return;
  }

  try {
    await persistStateNow();
  } catch {
    // Ignore the final save failure and continue logout.
  }

  try {
    await fetchJson("/api/auth/logout", {
      method: "POST",
    });
  } catch (error) {
    console.error(error);
  }

  clearRuntimeState();
  closeDialog();
  closeCategoryDialog();
  closeSettingsDialog();
  setAuthMode("login");
  setAuthenticatedView(false);
  showToast("已退出登录");
}

function clearRuntimeState() {
  state.user = null;
  state.items = [];
  state.categories = [];
  state.settings = { ...DEFAULT_SETTINGS };
  state.activeCategory = COMMON_CATEGORY;
  state.searchTerm = "";
  state.lastUpdatedAt = null;
  state.editingId = null;
  state.editingCategoryName = null;
  state.authMode = "login";
  elements.searchInput.value = "";
  window.clearTimeout(persistTimer);
  persistTimer = 0;
  persistQueued = false;
  persistInFlight = false;
}

async function loadState(options = {}) {
  const { response, payload } = await fetchJson("/api/state");

  if (response.status === 401) {
    handleUnauthorized();
    return false;
  }

  if (!response.ok) {
    showToast(payload.error || "读取服务器数据失败");
    return false;
  }

  if (payload.user) {
    state.user = payload.user;
  }
  const imported = sanitizeImportedState(payload.state);
  state.items = imported.items;
  state.categories = imported.categories;
  state.settings = imported.settings;
  state.activeCategory = COMMON_CATEGORY;
  state.searchTerm = "";
  state.lastUpdatedAt =
    typeof payload.updatedAt === "string" ? payload.updatedAt : imported.lastUpdatedAt;
  elements.searchInput.value = "";
  render();

  if (!options.silent) {
    showToast("已从服务器加载导航数据");
  }

  return true;
}

function sanitizeImportedState(payload) {
  const rawState = Array.isArray(payload)
    ? { items: payload }
    : Array.isArray(payload?.items)
      ? payload
      : payload?.state;

  const items = Array.isArray(rawState?.items) ? rawState.items : [];
  const normalizedItems = items.map((item, index) => sanitizeItem(item, index)).filter(Boolean);
  const isLegacyCommonData =
    items.length > 0 &&
    items.every((item) => item && typeof item === "object" && !("isFavorite" in item) && !("clickCount" in item));
  const preparedItems = isLegacyCommonData
    ? seedLegacyCommonItems(normalizedItems)
    : normalizedItems;
  const rawCategories = Array.isArray(rawState?.categories) ? rawState.categories : [];
  const categories = mergeCategories(
    rawCategories.map((name) => normalizeCategoryName(name)).filter(Boolean),
    deriveCategoriesFromItems(preparedItems),
  );
  const settings = sanitizeSettings(rawState?.settings);

  return {
    items: preparedItems.length ? preparedItems : clone(DEFAULT_ITEMS),
    categories: categories.length ? categories : deriveCategoriesFromItems(DEFAULT_ITEMS),
    settings,
    lastUpdatedAt:
      typeof rawState?.lastUpdatedAt === "string" ? rawState.lastUpdatedAt : new Date().toISOString(),
  };
}

function sanitizeItem(item, index) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const url = normalizeUrl(item.url || "");
  if (!url) {
    return null;
  }

  return {
    id: Number.isFinite(Number(item.id)) ? Number(item.id) : Date.now() + index,
    name: String(item.name || deriveNameFromUrl(url)).trim().slice(0, 40),
    url,
    category: normalizeCategoryName(item.category) || "未分类",
    description: String(item.description || "").trim().slice(0, 90),
    isFavorite: Boolean(item.isFavorite),
    clickCount: normalizeClickCount(item.clickCount),
  };
}

function normalizeClickCount(value) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue) || nextValue < 0) {
    return 0;
  }
  return Math.min(999999, Math.floor(nextValue));
}

function seedLegacyCommonItems(items) {
  if (items.some(isCommonItem)) {
    return items;
  }

  return items.map((item, index) => ({
    ...item,
    isFavorite: index < LEGACY_COMMON_SEED_COUNT,
  }));
}

function saveState(options = {}) {
  if (!options.preserveTimestamp) {
    state.lastUpdatedAt = new Date().toISOString();
  }
  state.categories = mergeCategories(state.categories, deriveCategoriesFromItems(state.items));
  state.settings = sanitizeSettings(state.settings);

  if (state.user) {
    if (options.immediate) {
      void persistStateNow();
    } else {
      queuePersistState();
    }
  }

  if (!options.silent) {
    showToast(options.message || "已保存到服务器");
  }
}

function getPersistedStateSnapshot() {
  return {
    items: state.items,
    categories: state.categories,
    settings: state.settings,
    lastUpdatedAt: state.lastUpdatedAt,
  };
}

function queuePersistState() {
  if (!state.user) {
    return;
  }

  persistQueued = true;
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    void persistStateNow();
  }, SAVE_DEBOUNCE_MS);
}

async function persistStateNow() {
  if (!state.user) {
    return false;
  }

  if (persistInFlight) {
    persistQueued = true;
    return false;
  }

  window.clearTimeout(persistTimer);
  persistTimer = 0;
  persistQueued = false;
  persistInFlight = true;

  try {
    const { response, payload } = await fetchJson("/api/state", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        state: getPersistedStateSnapshot(),
      }),
    });

    if (response.status === 401) {
      handleUnauthorized();
      return false;
    }

    if (!response.ok) {
      showToast(payload.error || "服务器保存失败");
      return false;
    }

    if (typeof payload.updatedAt === "string") {
      state.lastUpdatedAt = payload.updatedAt;
    }
    return true;
  } catch (error) {
    console.error(error);
    showToast("服务器保存失败，请稍后重试");
    return false;
  } finally {
    persistInFlight = false;
    if (persistQueued) {
      queuePersistState();
    }
  }
}

function handleUnauthorized() {
  clearRuntimeState();
  closeDialog();
  closeCategoryDialog();
  closeSettingsDialog();
  closePasswordDialog();
  closeCreateUserDialog();
  setAuthMode("login");
  setAuthenticatedView(false);
  showToast("登录已失效，请重新登录");
}

function render() {
  if (!state.user) {
    return;
  }

  applySettings();
  renderWebSearchEngines();
  renderMetrics();
  renderCategorySuggestions();
  renderCategoryChips();
  renderSites();
  renderCategoryManager();
}

function renderWebSearchEngines() {
  const buttons = elements.webSearchEngines.querySelectorAll("[data-search-engine]");
  buttons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.searchEngine === state.webSearchEngine);
  });
}

function handleWebSearch(event) {
  event.preventDefault();
  const query = elements.webSearchInput.value.trim();
  if (!query) {
    showToast("请输入搜索关键词");
    elements.webSearchInput.focus();
    return;
  }

  const targetUrl = buildWebSearchUrl(state.webSearchEngine, query);
  window.open(targetUrl, "_blank", "noopener,noreferrer");
}

function buildWebSearchUrl(engine, query) {
  const encoded = encodeURIComponent(query);
  if (engine === "google") {
    return `https://www.google.com/search?q=${encoded}`;
  }
  if (engine === "bing") {
    return `https://www.bing.com/search?q=${encoded}`;
  }
  return `https://www.baidu.com/s?wd=${encoded}`;
}

function renderMetrics() {
  const categories = getCategories();
  elements.metricCategories.textContent = String(categories.length);
}

function renderCategorySuggestions() {
  elements.categorySuggestions.replaceChildren(
    ...getCategories().map((category) => {
      const option = document.createElement("option");
      option.value = category;
      return option;
    }),
  );
}

function renderCategoryChips() {
  const counts = getCategoryCounts();
  const categories = [
    { name: COMMON_CATEGORY, count: getCommonItems().length },
    ...getCategories().map((name) => ({ name, count: counts[name] || 0 })),
  ];

  elements.categoryChips.replaceChildren(
    ...categories.map((entry) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `category-chip${state.activeCategory === entry.name ? " is-active" : ""}`;
      button.dataset.chip = entry.name;

      const label = document.createElement("span");
      label.className = "category-chip-label";

      const dot = document.createElement("span");
      dot.className = "category-dot";
      dot.style.setProperty("--dot-color", colorForCategory(entry.name));

      const name = document.createElement("span");
      name.className = "category-name";
      name.textContent = entry.name;

      const total = document.createElement("span");
      total.className = "category-total";
      total.textContent = String(entry.count);

      label.append(dot, name);
      button.append(label, total);
      return button;
    }),
  );
}

function renderSites() {
  const visibleItems = getVisibleItems();
  elements.siteGrid.replaceChildren();
  elements.emptyState.classList.toggle("hidden", visibleItems.length > 0);

  const filterLabel = state.activeCategory === COMMON_CATEGORY ? "常用网址" : state.activeCategory;
  elements.resultTitle.textContent = filterLabel;

  let meta =
    state.activeCategory === COMMON_CATEGORY
      ? `当前显示 ${visibleItems.length} 个常用网址`
      : `当前显示 ${visibleItems.length} / ${state.items.length} 个网址`;
  if (state.searchTerm) {
    meta += `，关键词“${state.searchTerm}”`;
  }
  elements.resultMeta.textContent = meta;

  renderEmptyState();

  if (!visibleItems.length) {
    return;
  }

  elements.siteGrid.append(...visibleItems.map(createSiteCard));
}

function createSiteCard(item) {
  const fullUrl = normalizeUrl(item.url) || item.url;
  const card = document.createElement("article");
  card.className = "site-card";
  card.title = fullUrl;

  const link = document.createElement("a");
  link.className = "site-card-link";
  link.href = fullUrl;
  link.target = "_blank";
  link.rel = "noreferrer noopener";
  link.title = fullUrl;
  link.ariaLabel = `打开 ${item.name}`;
  link.addEventListener("click", () => recordSiteVisit(item.id));

  const icon = document.createElement("div");
  icon.className = "site-icon";
  renderFavicon(icon, item.url, item.name);

  const info = document.createElement("div");
  info.className = "site-info";

  const title = document.createElement("h3");
  title.textContent = item.name;

  const meta = document.createElement("div");
  meta.className = "site-meta";
  meta.textContent = formatDisplayUrl(fullUrl);
  meta.title = fullUrl;

  info.append(title, meta);
  link.append(icon, info);

  const tools = document.createElement("div");
  tools.className = "site-card-tools";
  tools.innerHTML = `
    <button class="card-tool" type="button" data-edit-id="${item.id}" aria-label="编辑 ${escapeAttribute(item.name)}">
      ${getCardToolIcon("edit")}
    </button>
    <button class="card-tool danger" type="button" data-delete-id="${item.id}" aria-label="删除 ${escapeAttribute(item.name)}">
      ${getCardToolIcon("delete")}
    </button>
  `;

  card.append(link, tools);
  return card;
}

function formatDisplayUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const tail = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    const normalizedTail = tail === "/" ? "" : tail;
    return `${host}${normalizedTail}`;
  } catch {
    return String(url || "");
  }
}

function renderCategoryManager() {
  const counts = getCategoryCounts();
  const categories = getCategories();

  if (!categories.length) {
    const empty = document.createElement("div");
    empty.className = "category-manager-empty";
    empty.textContent = "还没有分类";
    elements.categoryManagerList.replaceChildren(empty);
    return;
  }

  elements.categoryManagerList.replaceChildren(
    ...categories.map((category) => {
      const row = document.createElement("div");
      row.className = "category-manager-row";

      const copy = document.createElement("div");
      copy.className = "category-manager-copy";
      copy.innerHTML = `
        <strong>${escapeHtml(category)}</strong>
        <span>${counts[category] || 0} 个网址</span>
      `;

      const actions = document.createElement("div");
      actions.className = "category-manager-actions";
      actions.innerHTML = `
        <button class="button button-secondary" type="button" data-rename-category="${escapeAttribute(category)}">重命名</button>
        <button class="button button-ghost" type="button" data-delete-category="${escapeAttribute(category)}">删除</button>
      `;

      row.append(copy, actions);
      return row;
    }),
  );
}

function openCategoryDialog(options = {}) {
  if (!options.preserveEditor) {
    resetCategoryEditor();
  }

  if (elements.categoryDialog.open && typeof elements.categoryDialog.close === "function") {
    elements.categoryDialog.close();
  }

  if (typeof elements.categoryDialog.showModal === "function") {
    elements.categoryDialog.showModal();
  } else {
    elements.categoryDialog.setAttribute("open", "true");
  }

  renderCategoryManager();
  window.setTimeout(() => elements.categoryNameInput.focus(), 20);
}

function closeCategoryDialog() {
  resetCategoryEditor();
  if (typeof elements.categoryDialog.close === "function") {
    elements.categoryDialog.close();
  } else {
    elements.categoryDialog.removeAttribute("open");
  }
}

function resetCategoryEditor() {
  state.editingCategoryName = null;
  elements.categoryForm.reset();
  elements.categoryDialogTitle.textContent = "管理分类";
  elements.saveCategoryBtn.textContent = "新增分类";
  elements.cancelCategoryEditBtn.disabled = true;
}

function startCategoryEdit(category) {
  if (!elements.categoryDialog.open) {
    openCategoryDialog({ preserveEditor: true });
  }

  state.editingCategoryName = category;
  elements.categoryDialogTitle.textContent = "重命名分类";
  elements.categoryNameInput.value = category;
  elements.saveCategoryBtn.textContent = "保存修改";
  elements.cancelCategoryEditBtn.disabled = false;
  elements.categoryNameInput.focus();
  elements.categoryNameInput.select();
}

function handleCategorySubmit(event) {
  event.preventDefault();
  const nextName = normalizeCategoryName(elements.categoryNameInput.value);

  if (!nextName) {
    showToast("请输入分类名称");
    elements.categoryNameInput.focus();
    return;
  }

  if (state.editingCategoryName) {
    renameCategory(state.editingCategoryName, nextName);
    return;
  }

  if (getCategories().includes(nextName)) {
    showToast("分类已存在");
    elements.categoryNameInput.focus();
    elements.categoryNameInput.select();
    return;
  }

  state.categories = mergeCategories(state.categories, [nextName]);
  saveState({ message: "分类已新增" });
  render();
  resetCategoryEditor();
  elements.categoryNameInput.focus();
}

function renameCategory(oldName, nextName) {
  if (oldName === nextName) {
    resetCategoryEditor();
    return;
  }

  if (getCategories().includes(nextName)) {
    showToast("分类名称已存在");
    elements.categoryNameInput.focus();
    elements.categoryNameInput.select();
    return;
  }

  state.items = state.items.map((item) =>
    item.category === oldName
      ? {
          ...item,
          category: nextName,
        }
      : item,
  );

  state.categories = mergeCategories(
    state.categories.map((category) => (category === oldName ? nextName : category)),
    deriveCategoriesFromItems(state.items),
  );

  if (state.activeCategory === oldName) {
    state.activeCategory = nextName;
  }

  saveState({ message: "分类已重命名" });
  render();
  resetCategoryEditor();
  elements.categoryNameInput.focus();
}

function deleteCategory(category) {
  if (category === "未分类") {
    showToast("未分类不能删除");
    return;
  }

  const count = state.items.filter((item) => item.category === category).length;
  const confirmed = window.confirm(
    count
      ? `删除分类「${category}」后，其中 ${count} 个网址会移动到「未分类」，是否继续？`
      : `确定删除空分类「${category}」吗？`,
  );
  if (!confirmed) {
    return;
  }

  if (count) {
    state.items = state.items.map((item) =>
      item.category === category
        ? {
            ...item,
            category: "未分类",
          }
        : item,
    );
  }

  state.categories = mergeCategories(
    state.categories.filter((name) => name !== category),
    deriveCategoriesFromItems(state.items),
  );

  if (state.activeCategory === category) {
    state.activeCategory = count ? "未分类" : COMMON_CATEGORY;
  }

  saveState({ message: "分类已删除" });
  render();
  resetCategoryEditor();
}

function openSettingsDialog() {
  const settings = sanitizeSettings(state.settings);
  elements.settingsSiteTitle.value = settings.siteTitle;
  elements.settingsSiteSubtitle.value = settings.siteSubtitle;
  elements.settingsAvatarImage.value = settings.avatarImage;
  elements.settingsIcpCode.value = settings.icpCode;
  elements.settingsBackgroundMode.value = settings.backgroundMode;
  elements.settingsBackgroundImage.value = settings.backgroundImage;
  elements.settingsAccountName.textContent = state.user?.username || "未登录";
  elements.settingsAccountRole.textContent = state.user?.isAdmin ? "管理员" : "普通用户";
  elements.createUserBtn.classList.toggle("hidden", !state.user?.isAdmin);
  syncSettingsImageField();

  if (elements.settingsDialog.open && typeof elements.settingsDialog.close === "function") {
    elements.settingsDialog.close();
  }

  if (typeof elements.settingsDialog.showModal === "function") {
    elements.settingsDialog.showModal();
  } else {
    elements.settingsDialog.setAttribute("open", "true");
  }

  window.setTimeout(() => elements.settingsSiteTitle.focus(), 20);
}

function closeSettingsDialog() {
  if (typeof elements.settingsDialog.close === "function") {
    elements.settingsDialog.close();
  } else {
    elements.settingsDialog.removeAttribute("open");
  }
}

function openPasswordDialog() {
  elements.passwordForm.reset();

  if (elements.passwordDialog.open && typeof elements.passwordDialog.close === "function") {
    elements.passwordDialog.close();
  }

  if (typeof elements.passwordDialog.showModal === "function") {
    elements.passwordDialog.showModal();
  } else {
    elements.passwordDialog.setAttribute("open", "true");
  }

  window.setTimeout(() => elements.currentPassword.focus(), 20);
}

function closePasswordDialog() {
  elements.passwordForm.reset();
  if (typeof elements.passwordDialog.close === "function") {
    elements.passwordDialog.close();
  } else {
    elements.passwordDialog.removeAttribute("open");
  }
}

function openCreateUserDialog() {
  if (!state.user?.isAdmin) {
    showToast("只有管理员可以创建账号");
    return;
  }

  elements.createUserForm.reset();

  if (elements.createUserDialog.open && typeof elements.createUserDialog.close === "function") {
    elements.createUserDialog.close();
  }

  if (typeof elements.createUserDialog.showModal === "function") {
    elements.createUserDialog.showModal();
  } else {
    elements.createUserDialog.setAttribute("open", "true");
  }

  window.setTimeout(() => elements.createUsername.focus(), 20);
}

function closeCreateUserDialog() {
  elements.createUserForm.reset();
  if (typeof elements.createUserDialog.close === "function") {
    elements.createUserDialog.close();
  } else {
    elements.createUserDialog.removeAttribute("open");
  }
}

function syncSettingsImageField() {
  const useImage = elements.settingsBackgroundMode.value === "image";
  elements.settingsImageUrlField.classList.toggle("hidden", !useImage);
  elements.settingsBackgroundImage.disabled = !useImage;
}

function handleSettingsSubmit(event) {
  event.preventDefault();
  const nextSettings = sanitizeSettings({
    siteTitle: elements.settingsSiteTitle.value,
    siteSubtitle: elements.settingsSiteSubtitle.value,
    avatarImage: elements.settingsAvatarImage.value,
    icpCode: elements.settingsIcpCode.value,
    backgroundMode: elements.settingsBackgroundMode.value,
    backgroundImage: elements.settingsBackgroundImage.value,
  });

  if (!nextSettings.siteTitle) {
    showToast("请填写站点标题");
    elements.settingsSiteTitle.focus();
    return;
  }

  if (nextSettings.backgroundMode === "image" && !nextSettings.backgroundImage) {
    showToast("背景图片模式需要填写图片 URL");
    elements.settingsBackgroundImage.focus();
    return;
  }

  state.settings = nextSettings;
  saveState({ message: "设置已保存", immediate: true });
  render();
  closeSettingsDialog();
}

async function handleChangePasswordSubmit(event) {
  event.preventDefault();

  const currentPassword = String(elements.currentPassword.value || "");
  const newPassword = String(elements.newPassword.value || "");
  const confirmNewPassword = String(elements.confirmNewPassword.value || "");

  if (!currentPassword) {
    showToast("请先输入当前密码");
    elements.currentPassword.focus();
    return;
  }

  if (newPassword.length < AUTH_PASSWORD_MIN_LENGTH) {
    showToast(`新密码至少 ${AUTH_PASSWORD_MIN_LENGTH} 位`);
    elements.newPassword.focus();
    return;
  }

  if (newPassword !== confirmNewPassword) {
    showToast("两次输入的新密码不一致");
    elements.confirmNewPassword.focus();
    return;
  }

  elements.savePasswordBtn.disabled = true;
  elements.savePasswordBtn.textContent = "保存中...";

  try {
    const { response, payload } = await fetchJson("/api/auth/change-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!response.ok) {
      showToast(payload.error || "修改密码失败");
      return;
    }

    if (payload.user) {
      state.user = payload.user;
    }

    closePasswordDialog();
    showToast("密码已修改");
  } catch (error) {
    console.error(error);
    showToast("修改密码失败，请稍后重试");
  } finally {
    elements.savePasswordBtn.disabled = false;
    elements.savePasswordBtn.textContent = "保存新密码";
  }
}

async function handleCreateUserSubmit(event) {
  event.preventDefault();

  const username = String(elements.createUsername.value || "").trim().slice(0, 32);
  const password = String(elements.createPassword.value || "");
  const confirmPassword = String(elements.createConfirmPassword.value || "");

  if (!state.user?.isAdmin) {
    showToast("只有管理员可以创建账号");
    return;
  }

  if (username.length < 2) {
    showToast("用户名至少 2 位");
    elements.createUsername.focus();
    return;
  }

  if (password.length < AUTH_PASSWORD_MIN_LENGTH) {
    showToast(`密码至少 ${AUTH_PASSWORD_MIN_LENGTH} 位`);
    elements.createPassword.focus();
    return;
  }

  if (password !== confirmPassword) {
    showToast("两次输入的密码不一致");
    elements.createConfirmPassword.focus();
    return;
  }

  elements.saveCreateUserBtn.disabled = true;
  elements.saveCreateUserBtn.textContent = "创建中...";

  try {
    const { response, payload } = await fetchJson("/api/admin/users", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!response.ok) {
      showToast(payload.error || "创建账号失败");
      return;
    }

    closeCreateUserDialog();
    showToast(`账号 ${username} 已创建`);
  } catch (error) {
    console.error(error);
    showToast("创建账号失败，请稍后重试");
  } finally {
    elements.saveCreateUserBtn.disabled = false;
    elements.saveCreateUserBtn.textContent = "创建账号";
  }
}

function applySettings() {
  const settings = sanitizeSettings(state.settings);
  state.settings = settings;

  elements.siteHeading.textContent = settings.siteTitle;
  elements.siteSubtitle.textContent = settings.siteSubtitle;
  renderBrandAvatar(settings.avatarImage, settings.siteTitle);
  renderFooterIcp(settings.icpCode);
  document.title = `${settings.siteTitle} | 导航页`;

  document.body.dataset.backgroundMode = settings.backgroundMode;
  if (settings.backgroundMode === "image" && settings.backgroundImage) {
    document.body.style.setProperty("--custom-bg-image", `url("${settings.backgroundImage}")`);
  } else {
    document.body.style.removeProperty("--custom-bg-image");
  }
}

function renderBrandAvatar(imageUrl, siteTitle) {
  const host = elements.brandAvatar;
  if (!host) {
    return;
  }

  const avatarKey = `${imageUrl}|${siteTitle}`;
  host.dataset.avatarKey = avatarKey;
  host.classList.remove("has-image");
  host.replaceChildren(createBrandAvatarFallback(siteTitle));

  if (!imageUrl) {
    return;
  }

  const image = new Image();
  image.alt = `${siteTitle} avatar`;
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";
  image.src = imageUrl;

  image.addEventListener("load", () => {
    if (host.dataset.avatarKey !== avatarKey) {
      return;
    }
    host.classList.add("has-image");
    host.replaceChildren(image);
  });
}

function renderFooterIcp(icpCode) {
  const footer = elements.contentFooter;
  const link = elements.footerIcpLink;
  if (!footer || !link) {
    return;
  }

  const normalized = String(icpCode || "").trim();
  if (!normalized) {
    link.textContent = "";
    footer.classList.add("hidden");
    return;
  }

  link.textContent = normalized;
  link.title = `${normalized} - 工信部备案查询`;
  footer.classList.remove("hidden");
}

function createBrandAvatarFallback(siteTitle) {
  const fallback = document.createElement("div");
  fallback.className = "brand-avatar-fallback";
  fallback.textContent = String(siteTitle || "导").trim().charAt(0) || "导";
  return fallback;
}

function openDialog(id = null) {
  state.editingId = id;
  const editingItem = state.items.find((item) => item.id === id);

  elements.dialogTitle.textContent = editingItem ? "编辑网址" : "添加网址";
  elements.siteForm.reset();
  elements.siteUrl.value = editingItem?.url || "";
  elements.siteName.value = editingItem?.name || "";
  elements.siteCategory.value = editingItem?.category || "";
  elements.siteFavorite.checked = Boolean(editingItem?.isFavorite);
  elements.siteDescription.value = editingItem?.description || "";
  updatePreview();

  if (elements.siteDialog.open && typeof elements.siteDialog.close === "function") {
    elements.siteDialog.close();
  }

  if (typeof elements.siteDialog.showModal === "function") {
    elements.siteDialog.showModal();
  } else {
    elements.siteDialog.setAttribute("open", "true");
  }

  window.setTimeout(() => elements.siteUrl.focus(), 20);
}

function closeDialog() {
  state.editingId = null;
  if (typeof elements.siteDialog.close === "function") {
    elements.siteDialog.close();
  } else {
    elements.siteDialog.removeAttribute("open");
  }
}

function handleSubmit(event) {
  event.preventDefault();

  const url = normalizeUrl(elements.siteUrl.value);
  const category = normalizeCategoryName(elements.siteCategory.value);
  const currentItem = state.items.find((item) => item.id === state.editingId);

  if (!url) {
    showToast("请输入有效网址");
    elements.siteUrl.focus();
    return;
  }

  if (!category) {
    showToast("请填写分类");
    elements.siteCategory.focus();
    return;
  }

  const nextItem = {
    id: state.editingId ?? Date.now(),
    url,
    name: elements.siteName.value.trim() || deriveNameFromUrl(url),
    category,
    description: elements.siteDescription.value.trim(),
    isFavorite: elements.siteFavorite.checked,
    clickCount: currentItem?.clickCount ?? 0,
  };

  const index = state.items.findIndex((item) => item.id === nextItem.id);
  if (index >= 0) {
    state.items.splice(index, 1, nextItem);
    saveState({ message: "网址已更新" });
  } else {
    state.items.unshift(nextItem);
    saveState({ message: "网址已添加" });
  }

  state.categories = mergeCategories(state.categories, [category]);

  closeDialog();
  render();
}

function deleteItem(id) {
  const item = state.items.find((entry) => entry.id === id);
  if (!item) {
    return;
  }

  const confirmed = window.confirm(`确定删除「${item.name}」吗？`);
  if (!confirmed) {
    return;
  }

  state.items = state.items.filter((entry) => entry.id !== id);
  if (
    state.activeCategory !== COMMON_CATEGORY &&
    !state.items.some((entry) => entry.category === state.activeCategory)
  ) {
    state.activeCategory = COMMON_CATEGORY;
  }

  saveState({ message: "网址已删除" });
  render();
}

function exportState() {
  const payload = {
    exportedAt: new Date().toISOString(),
    state: {
      items: state.items,
      categories: state.categories,
      settings: state.settings,
      lastUpdatedAt: state.lastUpdatedAt,
    },
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `argon-nav-backup-${formatFileTime(new Date())}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  showToast("已导出当前导航数据");
}

async function importState(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const imported = sanitizeImportedState(parsed);
    const confirmed = window.confirm("导入会覆盖当前账号在服务器上的导航数据，是否继续？");
    if (!confirmed) {
      return;
    }

    state.items = imported.items;
    state.categories = imported.categories;
    state.settings = imported.settings;
    state.activeCategory = COMMON_CATEGORY;
    state.searchTerm = "";
    elements.searchInput.value = "";
    state.lastUpdatedAt = imported.lastUpdatedAt;
    saveState({ silent: true, preserveTimestamp: true });
    await persistStateNow();
    render();
    showToast("已导入导航数据");
  } catch (error) {
    console.error(error);
    showToast("导入失败，请检查 JSON 格式");
  } finally {
    elements.importInput.value = "";
  }
}

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function updatePreview() {
  const url = normalizeUrl(elements.siteUrl.value);
  const name = elements.siteName.value.trim() || deriveNameFromUrl(url) || "站点名称预览";

  elements.previewTitle.textContent = name;
  elements.previewMeta.textContent = url || "填写网址后再识别站点图标";
  renderFavicon(elements.previewIcon, url, name);
}

function renderEmptyState() {
  if (state.activeCategory === COMMON_CATEGORY && !state.searchTerm) {
    elements.emptyTitle.textContent = "还没有常用网址";
    elements.emptyText.textContent = "勾选“加入常用网址”，或点击 10 次以上，网址会自动出现在这里。";
    return;
  }

  elements.emptyTitle.textContent = "没有找到匹配的网址";
  elements.emptyText.textContent = "试试切换分类、清空搜索词，或者直接新增一个网址。";
}

function getVisibleItems() {
  const keyword = state.searchTerm.toLowerCase();
  const sourceItems =
    state.activeCategory === COMMON_CATEGORY
      ? getCommonItems()
      : state.items.filter((item) => item.category === state.activeCategory);

  return sourceItems.filter((item) => {
    if (!keyword) {
      return true;
    }

    const haystack = [item.name, item.url, item.category, item.description].join(" ").toLowerCase();
    return haystack.includes(keyword);
  });
}

function getCommonItems() {
  return [...state.items.filter(isCommonItem)].sort(compareCommonItems);
}

function isCommonItem(item) {
  return Boolean(item?.isFavorite) || normalizeClickCount(item?.clickCount) >= AUTO_COMMON_THRESHOLD;
}

function compareCommonItems(a, b) {
  const clickDelta = normalizeClickCount(b.clickCount) - normalizeClickCount(a.clickCount);
  if (clickDelta) {
    return clickDelta;
  }

  const favoriteDelta = Number(Boolean(b.isFavorite)) - Number(Boolean(a.isFavorite));
  if (favoriteDelta) {
    return favoriteDelta;
  }

  return Number(b.id) - Number(a.id);
}

function recordSiteVisit(id) {
  const index = state.items.findIndex((item) => item.id === id);
  if (index < 0) {
    return;
  }

  const currentItem = state.items[index];
  const nextItem = {
    ...currentItem,
    clickCount: normalizeClickCount(currentItem.clickCount) + 1,
  };
  const becameCommon = !isCommonItem(currentItem) && isCommonItem(nextItem);

  state.items.splice(index, 1, nextItem);
  saveState({ silent: true });

  if (state.activeCategory === COMMON_CATEGORY || becameCommon) {
    render();
  }
}

function getCategories() {
  return mergeCategories(state.categories, deriveCategoriesFromItems(state.items));
}

function getCategoryCounts() {
  return state.items.reduce((counts, item) => {
    counts[item.category] = (counts[item.category] || 0) + 1;
    return counts;
  }, {});
}

function deriveCategoriesFromItems(items) {
  return [...new Set(items.map((item) => normalizeCategoryName(item.category)).filter(Boolean))];
}

function mergeCategories(...groups) {
  const seen = new Set();
  const categories = [];

  for (const group of groups) {
    for (const value of group || []) {
      const name = normalizeCategoryName(value);
      if (!name || seen.has(name)) {
        continue;
      }
      seen.add(name);
      categories.push(name);
    }
  }

  return categories;
}

function normalizeCategoryName(value) {
  return String(value || "").trim().slice(0, 24);
}

function sanitizeSettings(value) {
  const siteTitle = String(value?.siteTitle || DEFAULT_SETTINGS.siteTitle).trim().slice(0, 32);
  const siteSubtitle = String(value?.siteSubtitle || DEFAULT_SETTINGS.siteSubtitle)
    .trim()
    .slice(0, 60);
  const avatarImage = String(value?.avatarImage || "").trim().slice(0, 500);
  const icpCode = String(value?.icpCode || "").trim().slice(0, 40);
  const backgroundMode = BACKGROUND_MODES.has(value?.backgroundMode)
    ? value.backgroundMode
    : DEFAULT_SETTINGS.backgroundMode;
  const backgroundImage = String(value?.backgroundImage || "").trim().slice(0, 500);

  return {
    siteTitle: siteTitle || DEFAULT_SETTINGS.siteTitle,
    siteSubtitle: siteSubtitle || DEFAULT_SETTINGS.siteSubtitle,
    avatarImage,
    icpCode,
    backgroundMode,
    backgroundImage,
  };
}

function normalizeUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    return parsed.href.replace(/\/$/, "");
  } catch {
    return "";
  }
}

function deriveNameFromUrl(url) {
  const hostname = getHostname(url).replace(/^www\./, "");
  if (!hostname) {
    return "";
  }

  const segments = hostname.split(".");
  const label = segments.length > 1 ? segments[segments.length - 2] : segments[0];
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : "";
}

function getHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function renderFavicon(container, url, label) {
  const hostname = getHostname(url);
  const iconKey = getIconRequestKey(url, hostname);
  container.dataset.iconKey = iconKey;
  container.classList.remove("has-real-icon");

  container.replaceChildren(createFallbackIcon());

  if (!iconKey) {
    return;
  }

  if (window.location.protocol === "file:") {
    loadDirectFavicon(container, url, label, hostname);
    return;
  }

  queueFaviconLoad(container, url, label, iconKey);
}

function queueFaviconLoad(container, url, label, iconKey) {
  const entry = getOrCreateIconEntry(iconKey);
  entry.subscribers.set(container, label);

  if (entry.status === "hit" && entry.src) {
    applyResolvedIcon(container, iconKey, label, entry.src);
    return;
  }

  if (entry.status === "loading" || entry.status === "queued" || entry.status === "miss") {
    return;
  }

  entry.status = "queued";
  iconLoadQueue.push(iconKey);
  scheduleIconQueue();
}

function getOrCreateIconEntry(iconKey) {
  let entry = iconLoadEntries.get(iconKey);
  if (entry) {
    return entry;
  }

  entry = {
    status: "idle",
    src: "",
    subscribers: new Map(),
  };
  iconLoadEntries.set(iconKey, entry);
  return entry;
}

function scheduleIconQueue() {
  if (iconQueueScheduled) {
    return;
  }

  iconQueueScheduled = true;
  const run = () => {
    iconQueueScheduled = false;
    pumpIconQueue();
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 1000 });
    return;
  }

  window.setTimeout(run, ICON_QUEUE_DELAY_MS);
}

function pumpIconQueue() {
  while (activeIconLoads < ICON_LOAD_CONCURRENCY && iconLoadQueue.length) {
    const iconKey = iconLoadQueue.shift();
    if (!iconKey) {
      continue;
    }

    const entry = iconLoadEntries.get(iconKey);
    if (!entry || (entry.status !== "queued" && entry.status !== "idle")) {
      continue;
    }

    activeIconLoads += 1;
    entry.status = "loading";
    void loadQueuedIcon(iconKey, entry);
  }
}

async function loadQueuedIcon(iconKey, entry) {
  try {
    const response = await fetch(iconKey, {
      cache: "force-cache",
      credentials: "same-origin",
    });

    if (!response.ok) {
      entry.status = "miss";
      return;
    }

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.startsWith("image/")) {
      entry.status = "miss";
      return;
    }

    const blob = await response.blob();
    if (!blob.size) {
      entry.status = "miss";
      return;
    }

    if (entry.src.startsWith("blob:")) {
      URL.revokeObjectURL(entry.src);
    }

    entry.src = URL.createObjectURL(blob);
    entry.status = "hit";
    flushResolvedIcon(iconKey, entry);
  } catch {
    entry.status = "miss";
  } finally {
    if (entry.status !== "hit") {
      entry.subscribers.clear();
    }
    activeIconLoads = Math.max(0, activeIconLoads - 1);
    if (iconLoadQueue.length) {
      scheduleIconQueue();
    }
  }
}

function flushResolvedIcon(iconKey, entry) {
  entry.subscribers.forEach((entryLabel, entryContainer) => {
    applyResolvedIcon(entryContainer, iconKey, entryLabel, entry.src);
  });
  entry.subscribers.clear();
}

function applyResolvedIcon(container, iconKey, label, src) {
  if (!container.isConnected || container.dataset.iconKey !== iconKey || !src) {
    return;
  }

  const image = new Image();
  image.alt = `${label} favicon`;
  image.decoding = "async";
  image.loading = "lazy";
  image.src = src;

  container.classList.add("has-real-icon");
  container.replaceChildren(image);
}

function loadDirectFavicon(container, url, label, hostname) {
  if (!hostname) {
    return;
  }

  const uniqueCandidates = getIconCandidates(url, hostname);
  const iconKey = container.dataset.iconKey;
  const image = new Image();
  image.alt = `${label} favicon`;
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";

  let index = 0;
  const tryNext = () => {
    if (index >= uniqueCandidates.length) {
      return;
    }
    image.src = uniqueCandidates[index];
    index += 1;
  };

  image.addEventListener("load", () => {
    if (container.dataset.iconKey !== iconKey) {
      return;
    }
    if (!image.naturalWidth || image.naturalWidth < 8) {
      tryNext();
      return;
    }
    container.classList.add("has-real-icon");
    container.replaceChildren(image);
  });

  image.addEventListener("error", () => {
    if (container.dataset.iconKey !== iconKey) {
      return;
    }
    tryNext();
  });

  tryNext();
}

function getIconCandidates(url, hostname) {
  if (window.location.protocol !== "file:") {
    return [getIconRequestKey(url, hostname)];
  }

  return [
    `https://${hostname}/favicon.ico`,
    `https://${hostname}/apple-touch-icon.png`,
    `https://${hostname}/favicon.png`,
    `https://icon.horse/icon/${hostname}`,
    `https://icons.duckduckgo.com/ip3/${hostname}.ico`,
    `https://www.google.com/s2/favicons?sz=128&domain=${hostname}`,
  ];
}

function getIconRequestKey(url, hostname = getHostname(url)) {
  if (!hostname) {
    return "";
  }

  if (window.location.protocol === "file:") {
    return hostname;
  }

  try {
    return `/api/icon?url=${encodeURIComponent(new URL(url).origin)}`;
  } catch {
    return `/api/icon?url=${encodeURIComponent(`https://${hostname}`)}`;
  }
}

function createFallbackIcon() {
  const wrapper = document.createElement("div");
  wrapper.className = "fallback-glyph";
  wrapper.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9.5 4.75h5A4.75 4.75 0 0 1 19.25 9.5v5a4.75 4.75 0 0 1-4.75 4.75h-5A4.75 4.75 0 0 1 4.75 14.5v-5A4.75 4.75 0 0 1 9.5 4.75Zm0 1.5A3.25 3.25 0 0 0 6.25 9.5v5a3.25 3.25 0 0 0 3.25 3.25h5a3.25 3.25 0 0 0 3.25-3.25v-5a3.25 3.25 0 0 0-3.25-3.25h-5Zm1.1 2.85a.75.75 0 0 1 .75.75v.9h1.3v-.9a.75.75 0 0 1 1.5 0v.9h.9a.75.75 0 0 1 0 1.5h-.9v1.3h.9a.75.75 0 0 1 0 1.5h-.9v.9a.75.75 0 0 1-1.5 0v-.9h-1.3v.9a.75.75 0 0 1-1.5 0v-.9h-.9a.75.75 0 0 1 0-1.5h.9v-1.3h-.9a.75.75 0 0 1 0-1.5h.9v-.9a.75.75 0 0 1 .75-.75Zm.75 2.4v1.3h1.3v-1.3h-1.3Z"
      />
    </svg>
  `;
  return wrapper;
}

function getCardToolIcon(type) {
  if (type === "delete") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 4.75a1.75 1.75 0 0 0-1.75 1.75v.75H5.5a.75.75 0 0 0 0 1.5h.45l.72 9.02A2.25 2.25 0 0 0 8.91 20h6.18a2.25 2.25 0 0 0 2.24-2.23l.72-9.02h.45a.75.75 0 0 0 0-1.5h-1.75V6.5A1.75 1.75 0 0 0 15 4.75H9Zm6.25 2.5H8.75V6.5a.25.25 0 0 1 .25-.25h6a.25.25 0 0 1 .25.25v.75Zm-5 3.25a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Zm4.25.75a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 0 1.5 0v-4.5Z" />
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15.12 5.56a2.5 2.5 0 0 1 3.54 3.54l-8.1 8.1a3 3 0 0 1-1.39.8l-2.82.74a.75.75 0 0 1-.91-.91l.74-2.82a3 3 0 0 1 .8-1.39l8.1-8.1Zm2.48 2.48a1 1 0 0 0-1.42-1.42l-.88.88 1.42 1.42.88-.88ZM15.66 10l-1.42-1.42-6.97 6.97a1.5 1.5 0 0 0-.4.69l-.43 1.64 1.64-.43a1.5 1.5 0 0 0 .69-.4L15.66 10Z" />
    </svg>
  `;
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  elements.toastRegion.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2400);
}

function colorForCategory(category) {
  let seed = 0;
  for (const character of category) {
    seed += character.charCodeAt(0);
  }
  return palette[seed % palette.length];
}

function formatTimestamp(value) {
  if (!value) {
    return "刚刚";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "刚刚";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatFileTime(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
  ].join("");
}

function escapeHtml(value) {
  return escapeAttribute(value);
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
