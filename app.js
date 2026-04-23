// =====================
// Main Application Logic
// =====================

// DOM Elements
const inputJson = document.getElementById('input-json');
const outputJson = document.getElementById('output-json');
const inputError = document.getElementById('input-error');
const btnFormat = document.getElementById('btn-format');
const btnMinify = document.getElementById('btn-minify');
const btnValidate = document.getElementById('btn-validate');
const btnExport = document.getElementById('btn-export');
const btnClear = document.getElementById('btn-clear');
const btnPaste = document.getElementById('btn-paste');
const btnCopy = document.getElementById('btn-copy');
const charCount = document.getElementById('char-count').querySelector('span');
const lineCount = document.getElementById('line-count').querySelector('span');
const sizeInfo = document.getElementById('size-info').querySelector('span');
const validationStatus = document.getElementById('validation-status');
const toastContainer = document.getElementById('toast-container');

// Modal Elements
const csvModal = document.getElementById('csv-modal');
const modalClose = document.getElementById('modal-close');
const arrayList = document.getElementById('array-list');
const fieldList = document.getElementById('field-list');
const fieldInfo = document.getElementById('field-info');
const btnSelectAll = document.getElementById('btn-select-all');
const btnDeselectAll = document.getElementById('btn-deselect-all');
const btnCancel = document.getElementById('btn-cancel');
const btnDoExport = document.getElementById('btn-do-export');

// State
let detectedArrays = [];
let selectedArrayIndex = -1;
let selectedFields = new Set();

// Toast System
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    toast.innerHTML = `${icons[type]}<span class="toast-message">${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}

// Update Status Bar
function updateStatusBar(text) {
    charCount.textContent = `${text.length.toLocaleString()} ${t('status.chars')}`;
    const lines = text ? text.split('\n').length : 0;
    lineCount.textContent = `${lines.toLocaleString()} ${t('status.lines')}`;

    const bytes = new Blob([text]).size;
    let sizeStr;
    if (bytes < 1024) {
        sizeStr = `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
        sizeStr = `${(bytes / 1024).toFixed(1)} KB`;
    } else {
        sizeStr = `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    }
    sizeInfo.textContent = sizeStr;

    if (bytes > 1024 * 1024) {
        showToast(t('toast.largeData'), 'info');
    }
}

// Validate JSON
function validateJson(text) {
    if (!text.trim()) {
        return { valid: false, error: null, isArray: false, parsed: null };
    }
    try {
        const parsed = JSON.parse(text);
        const isArray = Array.isArray(parsed);
        return { valid: true, error: null, isArray, parsed };
    } catch (e) {
        const match = e.message.match(/position (\d+)/);
        let errorMsg = e.message;
        if (match) {
            const pos = parseInt(match[1]);
            const lines = text.substring(0, pos).split('\n');
            const line = lines.length;
            errorMsg = `${t('validation.errorLine')} ${line}: ${e.message}`;
        }
        return { valid: false, error: errorMsg, isArray: false, parsed: null };
    }
}

// Update Validation Status UI
function updateValidationUI(result) {
    if (!inputJson.value.trim()) {
        validationStatus.innerHTML = `<span class="status-pending">⏳ ${t('status.waiting')}</span>`;
        btnExport.disabled = true;
        btnExport.dataset.tooltip = t('toast.inputJson');
        return;
    }

    if (result.valid) {
        const arrays = findAllArrays(result.parsed);
        const arrayCount = arrays.length;

        if (arrayCount > 0) {
            const itemInfo = arrays.length === 1 && result.isArray
                ? `${result.parsed.length} ${t('validation.items')}`
                : `${arrayCount} ${t('validation.arrays')}`;

            validationStatus.innerHTML = `
                <span class="status-valid">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="display:inline;vertical-align:middle;margin-right:4px">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    ✓ ${t('status.valid')} (${itemInfo})
                </span>`;
            btnExport.disabled = false;
            btnExport.dataset.tooltip = t('csv.exportBtn');
        } else {
            validationStatus.innerHTML = `
                <span class="status-valid">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="display:inline;vertical-align:middle;margin-right:4px">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    ✓ ${t('status.valid')} (${t('validation.noExport')})
                </span>`;
            btnExport.disabled = true;
            btnExport.dataset.tooltip = t('validation.noExport');
        }
    } else {
        validationStatus.innerHTML = `
            <span class="status-invalid">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="display:inline;vertical-align:middle;margin-right:4px">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                ✗ ${t('status.invalid')}
            </span>`;
        btnExport.disabled = true;
        btnExport.dataset.tooltip = t('toast.invalidJson');

        inputError.textContent = result.error;
        inputError.classList.add('show');
    }
}

// Format JSON
function formatJson() {
    const text = inputJson.value;
    if (!text.trim()) {
        showToast(t('toast.inputJson'), 'info');
        return;
    }

    const result = validateJson(text);
    if (!result.valid) {
        updateValidationUI(result);
        showToast(t('toast.invalidJson'), 'error');
        return;
    }

    outputJson.textContent = JSON.stringify(result.parsed, null, 2);
    inputError.classList.remove('show');
    showToast(t('toast.format'), 'success');
}

// Minify JSON
function minifyJson() {
    const text = inputJson.value;
    if (!text.trim()) {
        showToast(t('toast.inputJson'), 'info');
        return;
    }

    const result = validateJson(text);
    if (!result.valid) {
        updateValidationUI(result);
        showToast(t('toast.invalidJson'), 'error');
        return;
    }

    outputJson.textContent = JSON.stringify(result.parsed);
    inputError.classList.remove('show');
    showToast(t('toast.minify'), 'success');
}

// Validate JSON (manual trigger)
function doValidate() {
    const text = inputJson.value;
    if (!text.trim()) {
        showToast(t('toast.inputJson'), 'info');
        return;
    }

    const result = validateJson(text);
    updateValidationUI(result);

    if (result.valid) {
        showToast(result.isArray ? t('csv.exportBtn') : t('status.valid'), 'success');
    } else {
        showToast(t('toast.invalidJson'), 'error');
    }
}

// Flatten nested objects for CSV
function flattenObject(obj, prefix = '', result = {}) {
    for (const key in obj) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];

        if (value === null || value === undefined) {
            result[newKey] = '';
        } else if (Array.isArray(value)) {
            result[newKey] = value.map(v =>
                typeof v === 'object' ? JSON.stringify(v) : String(v)
            ).join('; ');
        } else if (typeof value === 'object') {
            flattenObject(value, newKey, result);
        } else {
            result[newKey] = String(value);
        }
    }
    return result;
}

// Escape CSV field
function escapeCSV(value) {
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

// Find all arrays in JSON with their paths
function findAllArrays(obj, path = '', results = []) {
    if (Array.isArray(obj)) {
        results.push({
            path: path || t('csv.root'),
            data: obj,
            itemCount: obj.length,
            sampleKeys: obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null
                ? Object.keys(obj[0]).slice(0, 3)
                : []
        });
    } else if (obj !== null && typeof obj === 'object') {
        for (const key in obj) {
            const newPath = path ? `${path}.${key}` : key;
            findAllArrays(obj[key], newPath, results);
        }
    }
    return results;
}

// Get all unique fields from an array of objects
function getAllFields(data) {
    const fields = new Set();
    data.forEach(item => {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
            const flattened = flattenObject(item);
            Object.keys(flattened).forEach(key => fields.add(key));
        }
    });
    return Array.from(fields).sort();
}

// Open CSV Modal
function openCSvModal() {
    const text = inputJson.value;
    if (!text.trim()) {
        showToast(t('toast.inputJson'), 'info');
        return;
    }

    const result = validateJson(text);
    if (!result.valid) {
        updateValidationUI(result);
        showToast(t('toast.invalidJson'), 'error');
        return;
    }

    // Detect all arrays
    detectedArrays = findAllArrays(result.parsed);

    if (detectedArrays.length === 0) {
        showToast(t('validation.noExport'), 'error');
        return;
    }

    // Render array list
    renderArrayList();

    // Reset field selection
    selectedArrayIndex = 0;
    selectedFields = new Set();
    fieldList.innerHTML = '';
    fieldInfo.textContent = '';

    // Auto-select first array and render fields
    if (detectedArrays.length > 0) {
        selectArray(0);
    }

    // Show modal
    csvModal.classList.add('show');
}

// Render array list
function renderArrayList() {
    arrayList.innerHTML = detectedArrays.map((arr, index) => `
        <div class="array-item ${index === selectedArrayIndex ? 'selected' : ''}" data-index="${index}">
            <input type="radio" name="array-select" value="${index}" ${index === selectedArrayIndex ? 'checked' : ''}>
            <div class="array-item-info">
                <div class="array-item-path">${arr.path}</div>
                <div class="array-item-meta">${arr.itemCount} ${t('csv.items')}${arr.sampleKeys.length > 0 ? ' · ' + arr.sampleKeys.join(', ') + '...' : ''}</div>
            </div>
        </div>
    `).join('');

    // Add click handlers
    arrayList.querySelectorAll('.array-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.type !== 'radio') {
                const radio = item.querySelector('input[type="radio"]');
                radio.checked = true;
            }
            selectArray(parseInt(item.dataset.index));
        });
    });
}

// Select an array and render its fields
function selectArray(index) {
    selectedArrayIndex = index;

    // Update UI
    arrayList.querySelectorAll('.array-item').forEach((item, i) => {
        item.classList.toggle('selected', i === index);
        item.querySelector('input').checked = i === index;
    });

    // Get fields from selected array
    const arr = detectedArrays[index];
    const fields = getAllFields(arr.data);

    // Reset selected fields
    selectedFields = new Set(fields);

    // Render field list
    renderFieldList();

    // Update info
    updateFieldInfo();
}

// Render field list
function renderFieldList() {
    const arr = detectedArrays[selectedArrayIndex];
    const fields = getAllFields(arr.data);

    fieldList.innerHTML = fields.map(field => `
        <div class="field-item selected" data-field="${field}">
            <input type="checkbox" checked>
            <span class="field-item-label" title="${field}">${field}</span>
        </div>
    `).join('');

    // Add click handlers
    fieldList.querySelectorAll('.field-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox') {
                const checkbox = item.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
            }
            const field = item.dataset.field;
            if (checkbox.checked) {
                selectedFields.add(field);
            } else {
                selectedFields.delete(field);
            }
            item.classList.toggle('selected', checkbox.checked);
            updateFieldInfo();
        });
    });
}

// Update field info
function updateFieldInfo() {
    const totalFields = getAllFields(detectedArrays[selectedArrayIndex].data).length;
    const selected = selectedFields.size;
    fieldInfo.textContent = `${selected}/${totalFields} ${t('csv.fields')} ${t('csv.selected')}`;
}

// Select all fields
function selectAllFields() {
    const arr = detectedArrays[selectedArrayIndex];
    const fields = getAllFields(arr.data);
    selectedFields = new Set(fields);
    fieldList.querySelectorAll('.field-item').forEach(item => {
        item.classList.add('selected');
        item.querySelector('input').checked = true;
    });
    updateFieldInfo();
}

// Deselect all fields
function deselectAllFields() {
    selectedFields.clear();
    fieldList.querySelectorAll('.field-item').forEach(item => {
        item.classList.remove('selected');
        item.querySelector('input').checked = false;
    });
    updateFieldInfo();
}

// Close modal
function closeModal() {
    csvModal.classList.remove('show');
}

// Do export with selected options
function doExportWithSelection() {
    if (selectedFields.size === 0) {
        showToast(t('toast.selectFields'), 'error');
        return;
    }

    const arr = detectedArrays[selectedArrayIndex];
    const data = arr.data;

    if (data.length === 0) {
        showToast(t('toast.emptyArray'), 'error');
        return;
    }

    try {
        const headers = Array.from(selectedFields);

        // Build CSV
        const csvRows = [];
        csvRows.push(headers.map(escapeCSV).join(','));

        data.forEach(item => {
            const flattened = flattenObject(item);
            const values = headers.map(header => escapeCSV(flattened[header] || ''));
            csvRows.push(values.join(','));
        });

        const csvContent = '\ufeff' + csvRows.join('\r\n');

        // Generate filename
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:-]/g, '').replace('T', '_').slice(0, 15);
        const pathSuffix = arr.path.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `export_${pathSuffix}_${timestamp}.csv`;

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        closeModal();
        showToast(`${t('toast.export')} ${data.length} ${t('toast.records')} ${filename}`, 'success');
    } catch (e) {
        showToast(`${t('error.exportFailed')}: ${e.message}`, 'error');
    }
}

// Clear all
function clearAll() {
    inputJson.value = '';
    outputJson.textContent = t('panel.output');
    inputError.classList.remove('show');
    inputError.textContent = '';
    updateStatusBar('');
    validationStatus.innerHTML = `<span class="status-pending">⏳ ${t('status.waiting')}</span>`;
    btnExport.disabled = true;
    btnExport.dataset.tooltip = t('toast.inputJson');
    inputJson.focus();
}

// Paste from clipboard
async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        inputJson.value = text;
        inputJson.dispatchEvent(new Event('input'));
        showToast(t('toast.paste'), 'success');
    } catch (e) {
        showToast(t('error.pasteFailed'), 'error');
    }
}

// Copy output
async function copyOutput() {
    const text = outputJson.textContent;
    if (text === t('panel.output') || !text) {
        showToast(t('error.nothingToCopy'), 'info');
        return;
    }

    try {
        await navigator.clipboard.writeText(text);
        showToast(t('toast.copy'), 'success');
    } catch (e) {
        showToast(t('error.copyFailed'), 'error');
    }
}

// Event Listeners
inputJson.addEventListener('input', () => {
    const text = inputJson.value;
    updateStatusBar(text);
    const result = validateJson(text);
    updateValidationUI(result);
    if (!result.valid && text.trim()) {
        inputError.textContent = result.error;
        inputError.classList.add('show');
    } else {
        inputError.classList.remove('show');
    }
});

inputJson.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        formatJson();
    }
});

btnFormat.addEventListener('click', formatJson);
btnMinify.addEventListener('click', minifyJson);
btnValidate.addEventListener('click', doValidate);
btnExport.addEventListener('click', openCSvModal);
btnClear.addEventListener('click', clearAll);
btnPaste.addEventListener('click', pasteFromClipboard);
btnCopy.addEventListener('click', copyOutput);

// Modal event listeners
modalClose.addEventListener('click', closeModal);
btnCancel.addEventListener('click', closeModal);
btnSelectAll.addEventListener('click', selectAllFields);
btnDeselectAll.addEventListener('click', deselectAllFields);
btnDoExport.addEventListener('click', doExportWithSelection);

// Close modal on overlay click
csvModal.addEventListener('click', (e) => {
    if (e.target === csvModal) {
        closeModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && csvModal.classList.contains('show')) {
        closeModal();
    }
});

// Initialize
updateStatusBar('');

// =====================
// Cookie Consent System
// =====================
const cookieBanner = document.getElementById('cookie-banner');
const cookieAccept = document.getElementById('cookie-accept');
const cookieReject = document.getElementById('cookie-reject');
const cookieSettings = document.getElementById('cookie-settings');
const cookieSettingsOverlay = document.getElementById('cookie-settings-overlay');
const cookieSettingsPanel = document.getElementById('cookie-settings-panel');
const cookieSettingsClose = document.getElementById('cookie-settings-close');
const cookieSettingsCancel = document.getElementById('cookie-settings-cancel');
const cookieSettingsSave = document.getElementById('cookie-settings-save');
const analyticsCheckbox = document.getElementById('analytics-cookies');
const marketingCheckbox = document.getElementById('marketing-cookies');
const functionalCheckbox = document.getElementById('functional-cookies');
const privacyModalOverlay = document.getElementById('privacy-modal-overlay');
const privacyModal = document.getElementById('privacy-modal');
const privacyModalClose = document.getElementById('privacy-modal-close');
const termsModalOverlay = document.getElementById('terms-modal-overlay');
const termsModal = document.getElementById('terms-modal');
const termsModalClose = document.getElementById('terms-modal-close');

// Cookie preference keys
const COOKIE_CONSENT_KEY = 'cookie_consent';
const COOKIE_PREFERENCES_KEY = 'cookie_preferences';

// Default preferences
const defaultPreferences = {
    essential: true,
    analytics: false,
    marketing: false,
    functional: false
};

// Check if user has already made a choice
function checkCookieConsent() {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    return consent !== null;
}

// Get cookie preferences
function getCookiePreferences() {
    const stored = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            return { ...defaultPreferences };
        }
    }
    return { ...defaultPreferences };
}

// Save cookie preferences
function saveCookiePreferences(prefs) {
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
}

// Set cookie consent
function setCookieConsent(consent) {
    localStorage.setItem(COOKIE_CONSENT_KEY, consent);
}

// Show cookie banner
function showCookieBanner() {
    cookieBanner.classList.add('show');
}

// Hide cookie banner
function hideCookieBanner() {
    cookieBanner.classList.remove('show');
}

// Show cookie settings panel
function showCookieSettings() {
    const prefs = getCookiePreferences();
    analyticsCheckbox.checked = prefs.analytics;
    marketingCheckbox.checked = prefs.marketing;
    functionalCheckbox.checked = prefs.functional;
    cookieSettingsOverlay.classList.add('show');
    cookieSettingsPanel.classList.add('show');
}

// Hide cookie settings panel
function hideCookieSettings() {
    cookieSettingsOverlay.classList.remove('show');
    cookieSettingsPanel.classList.remove('show');
}

// Show privacy modal
function showPrivacyModal() {
    privacyModalOverlay.classList.add('show');
    privacyModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Hide privacy modal
function hidePrivacyModal() {
    privacyModalOverlay.classList.remove('show');
    privacyModal.classList.remove('show');
    document.body.style.overflow = '';
}

// Show terms modal
function showTermsModal() {
    termsModalOverlay.classList.add('show');
    termsModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Hide terms modal
function hideTermsModal() {
    termsModalOverlay.classList.remove('show');
    termsModal.classList.remove('show');
    document.body.style.overflow = '';
}

// Accept all cookies
function acceptAllCookies() {
    const prefs = {
        essential: true,
        analytics: true,
        marketing: true,
        functional: true
    };
    saveCookiePreferences(prefs);
    setCookieConsent('all');
    hideCookieBanner();
    showToast(t('toast.cookieAccept'), 'success');
}

// Reject non-essential cookies
function rejectCookies() {
    const prefs = {
        essential: true,
        analytics: false,
        marketing: false,
        functional: false
    };
    saveCookiePreferences(prefs);
    setCookieConsent('reject');
    hideCookieBanner();
    showToast(t('toast.cookieReject'), 'info');
}

// Save preferences from settings
function savePreferences() {
    const prefs = {
        essential: true,
        analytics: analyticsCheckbox.checked,
        marketing: marketingCheckbox.checked,
        functional: functionalCheckbox.checked
    };
    saveCookiePreferences(prefs);
    setCookieConsent('custom');
    hideCookieSettings();
    hideCookieBanner();
    showToast(t('toast.cookieSave'), 'success');
}

// Initialize cookie consent
function initCookieConsent() {
    if (!checkCookieConsent()) {
        setTimeout(() => {
            showCookieBanner();
        }, 1000);
    }
}

// Cookie event listeners
cookieAccept.addEventListener('click', acceptAllCookies);
cookieReject.addEventListener('click', rejectCookies);
cookieSettings.addEventListener('click', showCookieSettings);
cookieSettingsClose.addEventListener('click', hideCookieSettings);
cookieSettingsCancel.addEventListener('click', hideCookieSettings);
cookieSettingsSave.addEventListener('click', savePreferences);
cookieSettingsOverlay.addEventListener('click', hideCookieSettings);

// Privacy modal event listeners
privacyModalClose.addEventListener('click', hidePrivacyModal);
privacyModalOverlay.addEventListener('click', hidePrivacyModal);

// Footer links
document.getElementById('footer-privacy').addEventListener('click', (e) => { e.preventDefault(); showPrivacyModal(); });
document.getElementById('footer-terms').addEventListener('click', (e) => { e.preventDefault(); showTermsModal(); });
document.getElementById('footer-cookies').addEventListener('click', (e) => { e.preventDefault(); showCookieSettings(); });
document.getElementById('footer-privacy-2').addEventListener('click', (e) => { e.preventDefault(); showPrivacyModal(); });
document.getElementById('footer-terms-2').addEventListener('click', (e) => { e.preventDefault(); showTermsModal(); });
document.getElementById('footer-cookies-2').addEventListener('click', (e) => { e.preventDefault(); showCookieSettings(); });

// Terms modal event listeners
termsModalClose.addEventListener('click', hideTermsModal);
termsModalOverlay.addEventListener('click', hideTermsModal);

// Close modals on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (cookieSettingsPanel.classList.contains('show')) {
            hideCookieSettings();
        }
        if (privacyModal.classList.contains('show')) {
            hidePrivacyModal();
        }
        if (termsModal.classList.contains('show')) {
            hideTermsModal();
        }
    }
});

// Initialize cookie consent
initCookieConsent();
