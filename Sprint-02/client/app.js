// Client-side app for LostNoMore
// Splits views: login, register, dashboard, my-reports, report type, report details, item details
// Uses fetch to communicate with backend at /api/* endpoints. Adjust API_URL if needed.

(() => {
    const API_URL = '/api';

    // ======================================================
    // MODIFIED: Configuration for US-03
    // Now an array to allow multiple domains
    // ======================================================
    const ALLOWED_EMAIL_DOMAINS = ['nu.edu.pk', 'isb.nu.edu.pk'];
    // ======================================================

    // Views
    const VIEWS = {
        LOGIN: '#view-login',
        REGISTER: '#view-register',
        DASHBOARD: '#view-dashboard',
        MY_REPORTS: '#view-my-reports',
        REPORT_TYPE: '#view-report-type',
        REPORT_DETAILS: '#view-report-details',
        ITEM_DETAILS: '#view-item-details',
        PROFILE: '#view-profile',
    };

    // Elements
    const messageBar = document.getElementById('message-bar');
    const spinner = document.getElementById('loading-spinner');
    const navbar = document.getElementById('topbar');

    // ======================================================
    // NEW: Cache for "My Reports" (US-10 & US-16)
    // ======================================================
    let myReportsCache = [];
    // ======================================================

    // ======================================================
    // NEW: Cache for current user data (for auto-fill when reporting)
    // ======================================================
    let currentUser = null;
    // ======================================================

    // ======================================================
    // NEW: Update navbar profile avatar
    // ======================================================
    function setNavProfileAvatar(user) {
        const btn = el('nav-profile');
        if (!btn) return;

        let src = null;
        if (user) {
            src = user.profilePicture && user.profilePicture.trim() ? user.profilePicture : null;
        }

        if (!src) {
            // generate default avatar SVG data URI using initials if possible
            const initials = user && user.name ? user.name.charAt(0).toUpperCase() : 'U';
            src = `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2245%22 fill=%22%232563eb%22/%3E%3Ctext x=%2250%22 y=%2265%22 font-size=%2250%22 text-anchor=%22middle%22 fill=%22white%22 font-family=%22Arial%22 font-weight=%22700%22%3E${initials}%3C/text%3E%3C/svg%3E`;
        }

        // Clear previous content and insert an <img>
        btn.innerHTML = '';
        const img = document.createElement('img');
        img.src = src;
        img.alt = (user && user.name) ? user.name : 'Profile';
        img.style.width = '36px';
        img.style.height = '36px';
        img.style.borderRadius = '50%';
        img.style.objectFit = 'cover';
        btn.appendChild(img);
    }
    // ======================================================

    // Show/hide helper
    function showView(selector) {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        const el = document.querySelector(selector);
        if (el) el.classList.remove('hidden');

        // navbar shown for authenticated views
        if (selector === VIEWS.LOGIN || selector === VIEWS.REGISTER) {
            navbar.setAttribute('aria-hidden', 'true');
            navbar.style.display = 'none';
            document.querySelector('.main').style.paddingTop = '20px';
        } else {
            navbar.setAttribute('aria-hidden', 'false');
            navbar.style.display = 'block';
            // compute topbar height
            const h = navbar.offsetHeight || 88;
            document.querySelector('.main').style.paddingTop = (h + 20) + 'px';
        }
        hideMessage();
    }

    function showLoading(on = true) {
        if (on) spinner.classList.remove('hidden');
        else spinner.classList.add('hidden');
    }

    function showMessage(text, isError = false) {
        messageBar.textContent = text;
        messageBar.classList.remove('hidden');
        messageBar.style.background = isError ? '#fee2e2' : '#ecfdf5';
        messageBar.style.color = isError ? '#7f1d1d' : '#065f46';
        messageBar.style.borderLeft = isError ? '4px solid #fecaca' : '4px solid #bbf7d0';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function hideMessage() {
        messageBar.classList.add('hidden');
        messageBar.textContent = '';
        messageBar.style.background = '';
        messageBar.style.color = '';
        messageBar.style.borderLeft = '';
    }

    function getToken() {
        return localStorage.getItem('token');
    }

    // Safe json parse
    async function safeParseJson(res) {
        if (!res) return null;
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
            try {
                return await res.json();
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    // API wrapper
    const api = {
        login: async (email, password) => {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await safeParseJson(res);
            return { ok: res.ok, status: res.status, data };
        },

        register: async (name, email, password, phone) => {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, phone }),
            });
            const data = await safeParseJson(res);
            return { ok: res.ok, status: res.status, data };
        },

        getAllItems: async () => {
            const headers = {};
            const token = getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                headers['x-auth-token'] = token; // include both in case backend expects x-auth-token
            }
            const res = await fetch(`${API_URL}/items/all`, { headers });
            const data = await safeParseJson(res);
            return { ok: res.ok, status: res.status, data };
        },
        // Search with filters
        searchItems: async (params) => {
            const q = new URLSearchParams();
            Object.keys(params || {}).forEach(k => {
                if (params[k] !== undefined && params[k] !== null && params[k] !== '') q.append(k, params[k]);
            });
            const headers = {};
            const token = getToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(`${API_URL}/items?` + q.toString(), { headers });
            const data = await safeParseJson(res);
            return { ok: res.ok, status: res.status, data };
        },

        updateItem: async (id, formData) => {
            const headers = {};
            const token = getToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(`${API_URL}/items/${encodeURIComponent(id)}`, { method: 'PUT', headers, body: formData });
            const data = await safeParseJson(res);
            return { ok: res.ok, status: res.status, data };
        },

        deleteItem: async (id) => {
            const headers = { 'Content-Type': 'application/json' };
            const token = getToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(`${API_URL}/items/${encodeURIComponent(id)}`, { method: 'DELETE', headers });
            const data = await safeParseJson(res);
            return { ok: res.ok, status: res.status, data };
        },

        updateItemStatus: async (id, status) => {
            const headers = { 'Content-Type': 'application/json' };
            const token = getToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(`${API_URL}/items/${encodeURIComponent(id)}/status`, { method: 'PUT', headers, body: JSON.stringify({ status }) });
            const data = await safeParseJson(res);
            return { ok: res.ok, status: res.status, data };
        },

        // Forgot / reset
        forgotPassword: async (email) => {
            const res = await fetch(`${API_URL}/auth/forgot-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
            const data = await safeParseJson(res);
            return { ok: res.ok, status: res.status, data };
        },
        resetPassword: async (token, newPassword) => {
            const res = await fetch(`${API_URL}/auth/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, newPassword }) });
            const data = await safeParseJson(res);
            return { ok: res.ok, status: res.status, data };
        },
        // change password already exists earlier as changePassword

        getMyReports: async () => {
            const headers = {};
            const token = getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                headers['x-auth-token'] = token;
            }
            const res = await fetch(`${API_URL}/items/my-reports`, { headers });
            const data = await safeParseJson(res);
            return { ok: res.ok, status: res.status, data };
        },

        getItemById: async (id) => {
            const headers = {};
            const token = getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                headers['x-auth-token'] = token;
            }
            const res = await fetch(`${API_URL}/items/${encodeURIComponent(id)}`, { headers });
            const data = await safeParseJson(res);
            return { ok: res.ok, status: res.status, data };
        },

        reportItem: async (formData) => {
            const headers = {};
            const token = getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                headers['x-auth-token'] = token;
            }
            // do not set Content-Type for multipart
            const res = await fetch(`${API_URL}/items/report`, {
                method: 'POST',
                headers,
                body: formData,
            });
            const data = await safeParseJson(res);
            return { ok: res.ok, status: res.status, data };
        },

        // ======================================================
        // NEW: Profile API endpoints
        // ======================================================
        getUserProfile: async () => {
            const headers = {};
            const token = getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                headers['x-auth-token'] = token;
            }
            const res = await fetch(`${API_URL}/auth/profile`, { headers });
            const data = await safeParseJson(res);
            return { ok: res.ok, status: res.status, data };
        },

        updateUserProfile: async (formData) => {
            const headers = {};
            const token = getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                headers['x-auth-token'] = token;
            }
            // Don't set Content-Type for multipart
            const res = await fetch(`${API_URL}/auth/profile`, {
                method: 'PUT',
                headers,
                body: formData,
            });
            const data = await safeParseJson(res);
            return { ok: res.ok, status: res.status, data };
        }
        ,
        changePassword: async (currentPassword, newPassword) => {
            const token = getToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(`${API_URL}/auth/change-password`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const data = await safeParseJson(res);
            return { ok: res.ok, status: res.status, data };
        }
        // ======================================================
    };

    // Utilities
    function el(id) { return document.getElementById(id); }
    function escapeHtml(str) {
        if (str === undefined || str === null) return '';
        return String(str).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
    }

    // Rendering
    function renderItems(items = [], containerId) {
        const container = el(containerId);
        container.innerHTML = '';
        if (!items || items.length === 0) {
            container.innerHTML = '<p class="muted">No items found.</p>';
            return;
        }
        const frag = document.createDocumentFragment();
        items.forEach(item => {
            const id = item._id || item.id || '';
            const type = (item.itemType || item.type || 'unknown').toLowerCase();
            const typeClass = type === 'lost' ? 'type-lost' : 'type-found';

            // --- START: MODIFIED LOGIC FOR CONDITIONAL RENDERING ---
            const imgUrl = item.imageUrl || item.image; // Check for actual image URL
            const titleText = escapeHtml(item.title || 'Untitled');

            let mediaHtml;
            let cardBodyHeaderHtml;

            if (imgUrl) {
                // Case 1: Image exists. Image in media, Title/Badge in card-body.
                mediaHtml = `<img src="${escapeHtml(imgUrl)}" alt="${titleText}">`;
                cardBodyHeaderHtml = `
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <strong>${titleText}</strong>
                        <span class="badge ${typeClass}">${escapeHtml((type || '').toUpperCase())}</span>
                    </div>`;
            } else {
                // Case 2: No image. Placeholder with BIG Title/Badge in media. NO Title/Badge in card-body.
                mediaHtml = `
                    <div class="item-no-image">
                        <div class="item-no-image-title-text">${titleText}</div>
                        <span class="badge ${typeClass}">${escapeHtml((type || '').toUpperCase())}</span>
                    </div>`;
                cardBodyHeaderHtml = ''; // Do not render the title/badge block here
            }
            // --- END: MODIFIED LOGIC FOR CONDITIONAL RENDERING ---

            const card = document.createElement('article');
            card.className = 'item-card';
            card.innerHTML = `
                ${mediaHtml} 
                <div class="card-body">
                  ${cardBodyHeaderHtml} 
                  <div style="flex-grow:1">
                    <p class="muted small" style="margin:8px 0 12px 0">Location: ${escapeHtml(item.location || 'Unknown')}</p>
                    <p class="muted small">${escapeHtml((item.description || '').slice(0, 120))}${(item.description && item.description.length > 120) ? '...' : ''}</p>
                  </div>
                  <div style="margin-top:8px">
                    <button data-item-id="${escapeHtml(id)}" class="btn view-details">View Details</button>
                  </div>
                </div>
            `;
            frag.appendChild(card);
        });
        container.appendChild(frag);
    }

    function renderItemDetails(item) {
        el('details-image').src = item.imageUrl || item.image || ''; // Expects a URL
        el('details-title').textContent = item.title || 'Untitled';
        el('details-description').textContent = item.description || '';
        el('details-category').textContent = item.category || 'N/A';
        el('details-location').textContent = item.location || 'N/A';


        // Inside the function renderItemDetails(item) { ... }

        // ...
        const reportedBy = item.reportedBy || {};
        el('details-reporter-name').textContent = (typeof reportedBy === 'object' && reportedBy.name) ? reportedBy.name : (reportedBy || 'Unknown');
        el('details-reporter-email').textContent = (typeof reportedBy === 'object' && reportedBy.email) ? reportedBy.email : (item.contact || 'Not provided');

        // Use 'phone' field (server stores user's phone as 'phone')
        el('details-reporter-mobile').textContent = (typeof reportedBy === 'object' && reportedBy.phone) ? reportedBy.phone : (item.contactMobile || 'Not provided');

        el('details-date').textContent = item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Unknown';

        const rawType = (item.itemType || item.type || 'unknown').toLowerCase();
        const span = el('details-type');
        span.textContent = rawType.toUpperCase();
        span.className = 'badge ' + (rawType === 'lost' ? 'type-lost' : 'type-found');

        // Show management buttons only if current user is the reporter
        try {
            const btnEdit = el('btn-edit-report');
            const btnRecover = el('btn-mark-recovered');
            const btnDelete = el('btn-delete-report');
            if (currentUser && item.reportedBy && (item.reportedBy._id === currentUser.id || item.reportedBy.id === currentUser.id || item.reportedBy === currentUser.id)) {
                if (btnEdit) btnEdit.style.display = 'inline-block';
                if (btnDelete) btnDelete.style.display = 'inline-block';
                // Show recover only for lost items and when active
                if (rawType === 'lost' && item.status === 'active') {
                    if (btnRecover) btnRecover.style.display = 'inline-block';
                } else {
                    if (btnRecover) btnRecover.style.display = 'none';
                }
            } else {
                if (btnEdit) btnEdit.style.display = 'none';
                if (btnDelete) btnDelete.style.display = 'none';
                if (btnRecover) btnRecover.style.display = 'none';
            }
        } catch (e) {}

        showView(VIEWS.ITEM_DETAILS);
    }

    // ======================================================
    // NEW: Render profile details
    // ======================================================
    function renderProfileDetails(user) {
        if (!user) {
            showMessage('User data not available', true);
            showLoading(false);
            return;
        }

        // Generate default avatar if no profile picture
        const initials = user.name ? user.name.charAt(0).toUpperCase() : 'U';
        const defaultAvatar = `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2245%22 fill=%22%232563eb%22/%3E%3Ctext x=%2250%22 y=%2265%22 font-size=%2250%22 text-anchor=%22middle%22 fill=%22white%22 font-family=%22Arial%22 font-weight=%22700%22%3E${initials}%3C/text%3E%3C/svg%3E`;
        
        el('profile-avatar').src = user.profilePicture && user.profilePicture.trim() ? user.profilePicture : defaultAvatar;
        el('profile-name').textContent = user.name || 'N/A';
        el('profile-email').textContent = user.email || 'N/A';
        el('profile-phone-display').textContent = user.phone || 'Not provided';
        el('profile-phone-input').value = user.phone || '';
        el('profile-whatsapp-input').value = user.whatsapp || '';
        
        showLoading(false);
        showView(VIEWS.PROFILE);
        try { setNavProfileAvatar(user); } catch (e) { /* ignore */ }
    }
    // ======================================================

    // Handlers
    async function handleChangePassword(e) {
        e.preventDefault();
        hideMessage();
        showLoading(true);

        const current = el('current-password-input').value || '';
        const nw = el('new-password-input').value || '';

        if (!current || !nw) {
            showMessage('Please fill both current and new password fields', true);
            showLoading(false);
            return;
        }

        try {
            const res = await api.changePassword(current, nw);
            if (res.ok) {
                showMessage('Password changed successfully', false);
                el('change-password-form').reset();
            } else {
                showMessage((res.data && (res.data.msg || res.data.error)) || 'Failed to change password', true);
            }
        } catch (err) {
            showMessage('Network error while changing password', true);
        } finally { showLoading(false); }
    }

    async function handleLogin(e) {
        e.preventDefault();
        showLoading(true);
        hideMessage();
        const email = el('login-email').value.trim();
        const password = el('login-password').value;
        if (!email || !password) {
            showMessage('Provide email and password', true);
            showLoading(false);
            return;
        }
        try {
            const res = await api.login(email, password);
            if (res.ok && res.data && res.data.token) {
                localStorage.setItem('token', res.data.token);
                // ======================================================
                // NEW: Store current user data from login response
                // ======================================================
                if (res.data.user) {
                    currentUser = res.data.user;
                    try { setNavProfileAvatar(currentUser); } catch (e) { /* ignore */ }
                }
                // ======================================================
                el('login-form').reset();
                await loadAndShowDashboard();
            } else {
                showMessage((res.data && (res.data.msg || res.data.error)) || 'Login failed', true);
            }
        } catch (err) {
            showMessage('Network error while logging in', true);
        } finally { showLoading(false); }
    }


    // ======================================================
    // MODIFIED FUNCTION: "handleRegister"
    // Updated university email validation logic (US-03)
    // Now includes phone number field
    // ======================================================
    async function handleRegister(e) {
        e.preventDefault();
        showLoading(true);
        hideMessage();
        const name = el('register-name').value.trim();
        const email = el('register-email').value.trim();
        const password = el('register-password').value;
        const phone = el('register-phone').value.trim();

        if (!name || !email || !password || !phone) {
            showMessage('Please fill all registration fields', true);
            showLoading(false);
            return;
        }

        // Validate phone number format (E.164)
        if (!validateE164(phone)) {
            showMessage('Phone number must be in international E.164 format, e.g. +923001234567', true);
            showLoading(false);
            return;
        }

        // NEW: University Email Validation (US-03)
        // Checks if the email ends with *any* of the allowed domains
        const isAllowedDomain = ALLOWED_EMAIL_DOMAINS.some(domain => email.endsWith(`@${domain}`));

        if (!isAllowedDomain) {
            showMessage(`Registration is only allowed with a university email (e.g., @${ALLOWED_EMAIL_DOMAINS.join(' or @')}).`, true);
            showLoading(false);
            return;
        }

        try {
            const res = await api.register(name, email, password, phone);
            if (res.ok) {
                showMessage('Registration successful! Please sign in.', false);
                el('register-form').reset();
                showView(VIEWS.LOGIN);
            } else {
                showMessage((res.data && (res.data.msg || res.data.error)) || 'Registration failed', true);
            }
        } catch (err) {
            showMessage('Network error while registering', true);
        } finally { showLoading(false); }
    }
    // ======================================================
    // END MODIFIED FUNCTION
    // ======================================================


    // Report flow
    function startReportFlow() {
        showView(VIEWS.REPORT_TYPE);
    }

    function cancelReportFlow() {
        showView(VIEWS.DASHBOARD);
    }

    function nextReportDetails() {
        // capture selected type
        const sel = document.querySelector('input[name="reportType"]:checked');
        if (!sel) {
            showMessage('Please choose a report type', true);
            return;
        }
        // store chosen type in a temp place (data attribute on form)
        const form = el('report-form');
        form.dataset.reportType = sel.value;
        showView(VIEWS.REPORT_DETAILS);
        // scroll to top of form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function backToReportType() {
        showView(VIEWS.REPORT_TYPE);
    }

    function validateE164(number) {
        if (!number) return false;
        return /^\+[1-9]\d{7,14}$/.test(number.trim());
    }

    async function submitReport(e) {
        e.preventDefault();
        showLoading(true);
        hideMessage();

        const formEl = el('report-form');
        const formData = new FormData(formEl); // This packages the image file

        // append reportType from the earlier step
        const reportType = formEl.dataset.reportType || 'lost';
        formData.set('itemType', reportType);

        // ======================================================
        // MODIFIED: Auto-fill user details from currentUser
        // No need for manual input since user is already authenticated
        // ======================================================
        if (currentUser) {
            formData.set('contactName', currentUser.name || '');
            formData.set('contactEmail', currentUser.email || '');
            formData.set('contactMobile', currentUser.phone || '');
        }
        // ======================================================

        try {
            const editId = formEl.dataset.reportId;
            let res;
            if (editId) {
                // update
                res = await api.updateItem(editId, formData);
            } else {
                res = await api.reportItem(formData); // Sends the file to the backend
            }

            if (res.ok) {
                showMessage(editId ? 'Report updated successfully' : 'Report submitted successfully', false);
                formEl.reset();
                delete formEl.dataset.reportId;
                showView(VIEWS.DASHBOARD);
                await loadAndShowDashboard();
            } else {
                showMessage((res.data && (res.data.msg || res.data.error)) || 'Failed to submit/update report', true);
            }
        } catch (err) {
            showMessage('Network error while submitting report', true);
        } finally { showLoading(false); }
    }

    // ======================================================
    // NEW: Handle profile update
    // ======================================================
    async function handleProfileUpdate(e) {
        e.preventDefault();
        showLoading(true);
        hideMessage();

        const profileFormEl = el('profile-form');
        const formData = new FormData(profileFormEl);

        // Get the phone number from input
        const newPhone = el('profile-phone-input').value.trim();

        if (!validateE164(newPhone)) {
            showMessage('Phone number must be in international E.164 format, e.g. +923001234567', true);
            showLoading(false);
            return;
        }

        formData.set('phone', newPhone);

            // If the profile picture input is outside the form, append the file explicitly
            const picInput = el('profile-picture-input');
            if (picInput && picInput.files && picInput.files[0]) {
                formData.append('profilePicture', picInput.files[0]);
            }

        try {
            // Validate whatsapp format if provided
            const newWhatsapp = el('profile-whatsapp-input').value.trim();
            if (newWhatsapp && !validateE164(newWhatsapp)) {
                showMessage('WhatsApp number must be in international E.164 format, e.g. +923001234567', true);
                showLoading(false);
                return;
            }

            // Ensure whatsapp is appended
            if (newWhatsapp) formData.set('whatsapp', newWhatsapp);

            const res = await api.updateUserProfile(formData);
            if (res.ok) {
                showMessage('Profile updated successfully', false);
                if (res.data && res.data.user) {
                    currentUser = res.data.user;
                        renderProfileDetails(currentUser);
                        try { setNavProfileAvatar(currentUser); } catch (e) {}
                    showLoading(false);
                }
            } else {
                showMessage((res.data && (res.data.msg || res.data.error)) || 'Failed to update profile', true);
                showLoading(false);
            }
        } catch (err) {
            showMessage('Network error while updating profile', true);
            showLoading(false);
        }
    }
    // ======================================================

    // Dashboard / lists
    async function loadAndShowDashboard() {
        showLoading(true);
        hideMessage();
        try {
            // Gather filters
            const q = el('search-input') ? el('search-input').value.trim() : '';
            const category = el('filter-category') ? el('filter-category').value : '';
            const location = el('filter-location') ? el('filter-location').value.trim() : '';
            const dateRange = el('filter-date-range') ? el('filter-date-range').value : '';
            const sort = el('sort-by') ? el('sort-by').value : 'date_desc';

            const params = {};
            if (q) params.q = q;
            if (category) params.category = category;
            if (location) params.location = location;
            if (dateRange) {
                // dateRange is number of days
                const days = parseInt(dateRange, 10);
                if (!isNaN(days)) {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(end.getDate() - days);
                    params.startDate = start.toISOString();
                    params.endDate = end.toISOString();
                }
            }
            if (sort) params.sort = sort;

            const res = await api.searchItems(params);
            if (res.ok) {
                renderItems(res.data || [], 'dashboard-items-container');
                showView(VIEWS.DASHBOARD);
            } else {
                // if unauthorized, force login
                if (res.status === 401) {
                    showMessage('Session expired, please sign in again', true);
                    doLogout();
                } else {
                    showMessage('Failed to load items', true);
                }
            }
        } catch (err) {
            showMessage('Network error while fetching items', true);
        } finally { showLoading(false); }
    }


    // ======================================================
    // MODIFIED FUNCTION: "loadAndShowMyReports"
    // Now saves to cache and calls new render function (US-10 & US-16)
    // ======================================================
    async function loadAndShowMyReports() {
        showLoading(true);
        hideMessage();
        try {
            const res = await api.getMyReports();
            if (res.ok) {
                myReportsCache = res.data || []; // Store in cache
                renderMyReports('all'); // Render with default "all" filter
                showView(VIEWS.MY_REPORTS);
            } else {
                if (res.status === 401) {
                    showMessage('Session expired, please sign in again', true);
                    doLogout();
                } else {
                    showMessage('Failed to load your reports', true);
                }
            }
        } catch (err) {
            showMessage('Network error while fetching reports', true);
        } finally { showLoading(false); }
    }
    // ======================================================
    // END MODIFIED FUNCTION
    // ======================================================


    // ======================================================
    // NEW FUNCTION: "renderMyReports"
    // Filters and renders items from cache (US-10 & US-16)
    // ======================================================
    function renderMyReports(filter = 'all') {
        // Update active tab button
        document.querySelectorAll('#my-reports-filter-tabs .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        let filteredItems = myReportsCache;
        if (filter === 'lost') {
            filteredItems = myReportsCache.filter(item => (item.itemType || item.type || '').toLowerCase() === 'lost');
        } else if (filter === 'found') {
            filteredItems = myReportsCache.filter(item => (item.itemType || item.type || '').toLowerCase() === 'found');
        }

        // Render the filtered list into the container
        renderItems(filteredItems, 'my-reports-items-container');
    }
    // ======================================================
    // END NEW FUNCTION
    // ======================================================


    async function showItemDetailsById(id) {
        if (!id) return;
        showLoading(true);
        hideMessage();
        try {
            const res = await api.getItemById(id);
            if (res.ok && res.data) {
                renderItemDetails(res.data);
                // Store last-viewed item for action handlers
                document.getElementById('view-item-details').dataset.currentItemId = id;
            } else {
                showMessage('Could not retrieve item details', true);
            }
        } catch (err) {
            showMessage('Network error while fetching item details', true);
        } finally { showLoading(false); }
    }

    // ======================================================
    // NEW: Load and show user profile
    // ======================================================
    async function loadAndShowProfile() {
        showLoading(true);
        hideMessage();
        
        // FIXED: Use currentUser if available, otherwise fetch from API
        if (currentUser) {
            renderProfileDetails(currentUser);
            return;
        }

        try {
            const res = await api.getUserProfile();
            if (res.ok && res.data) {
                currentUser = res.data;
                renderProfileDetails(currentUser);
            } else {
                if (res.status === 401) {
                    showMessage('Session expired, please sign in again', true);
                    doLogout();
                } else {
                    showMessage('Failed to load profile. Status: ' + res.status, true);
                }
                showLoading(false);
            }
        } catch (err) {
            showMessage('Network error while fetching profile: ' + err.message, true);
            showLoading(false);
        }
    }
    // ======================================================

    function doLogout() {
        localStorage.removeItem('token');
        // clear containers
        el('dashboard-items-container').innerHTML = '';
        el('my-reports-items-container').innerHTML = '';
        myReportsCache = []; // Clear the cache on logout
        // ======================================================
        // NEW: Clear current user data on logout
        // ======================================================
        currentUser = null;
        try { setNavProfileAvatar(null); } catch (e) { /* ignore */ }
        // ======================================================
        // show login
        showView(VIEWS.LOGIN);
    }

    // Event wired up on dynamic content for view-details
    function mainClickHandler(e) {
        const viewBtn = e.target.closest('.view-details');
        if (viewBtn) {
            const id = viewBtn.getAttribute('data-item-id');
            if (id) showItemDetailsById(id);
        }
    }

    // ======================================================
    // NEW: Handle profile picture change preview
    // ======================================================
    function handleProfilePictureChange(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                el('profile-avatar').src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    }
    // ======================================================

    // Init wiring
    function init() {
        // Forms
        el('login-form').addEventListener('submit', handleLogin);
        el('register-form').addEventListener('submit', handleRegister);

        // ======================================================
        // NEW: Profile form submit
        // ======================================================
        el('profile-form').addEventListener('submit', handleProfileUpdate);
        el('profile-picture-input').addEventListener('change', handleProfilePictureChange);
        // Change password form
        const changePasswordForm = el('change-password-form');
        if (changePasswordForm) changePasswordForm.addEventListener('submit', handleChangePassword);
        // ======================================================

        // report flow
        el('nav-report-item').addEventListener('click', (ev) => { ev.preventDefault(); startReportFlow(); });
        el('btn-new-report').addEventListener('click', (ev) => { ev.preventDefault(); startReportFlow(); });

        el('report-type-cancel').addEventListener('click', (ev) => { ev.preventDefault(); cancelReportFlow(); });

        // NEW: Make report type cards clickable
        document.querySelectorAll('.type-card').forEach(card => {
            card.addEventListener('click', () => {
                // Find the radio button within the clicked card and check it
                const radio = card.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                }
                // Immediately move to the next step
                nextReportDetails();
            });
        });

        el('report-back').addEventListener('click', (ev) => { ev.preventDefault(); backToReportType(); });
        el('report-form').addEventListener('submit', submitReport);

        // nav buttons
        el('nav-all-items').addEventListener('click', (ev) => { ev.preventDefault(); loadAndShowDashboard(); });
        el('nav-my-reports').addEventListener('click', (ev) => { ev.preventDefault(); loadAndShowMyReports(); });
        el('nav-logout').addEventListener('click', (ev) => { ev.preventDefault(); doLogout(); });

        // ======================================================
        // NEW: Profile button click handler
        // ======================================================
        el('nav-profile').addEventListener('click', (ev) => { ev.preventDefault(); loadAndShowProfile(); });
        el('profile-back').addEventListener('click', (ev) => { ev.preventDefault(); loadAndShowDashboard(); });
        // ======================================================

        // links between login/register
        el('link-to-register').addEventListener('click', (ev) => { ev.preventDefault(); showView(VIEWS.REGISTER); });
        el('link-to-login').addEventListener('click', (ev) => { ev.preventDefault(); showView(VIEWS.LOGIN); });
        // forgot password links
        const linkForgot = el('link-forgot-password');
        if (linkForgot) linkForgot.addEventListener('click', (ev) => { ev.preventDefault(); showView('#view-forgot'); });
        const linkToLoginFromForgot = el('link-to-login-from-forgot');
        if (linkToLoginFromForgot) linkToLoginFromForgot.addEventListener('click', (ev) => { ev.preventDefault(); showView(VIEWS.LOGIN); });
        const linkToLoginFromReset = el('link-to-login-from-reset');
        if (linkToLoginFromReset) linkToLoginFromReset.addEventListener('click', (ev) => { ev.preventDefault(); showView(VIEWS.LOGIN); });

        // forgot form submit
        const forgotForm = el('forgot-form');
        if (forgotForm) forgotForm.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            showLoading(true); hideMessage();
            const email = el('forgot-email').value.trim();
            if (!email) { showMessage('Enter your email', true); showLoading(false); return; }
            try {
                const res = await api.forgotPassword(email);
                if (res.ok) {
                    // show token if returned (dev)
                    const token = res.data && res.data.token;
                    showMessage(token ? `Reset token: ${token} (use Reset Password view)` : 'If an account exists, a reset link was sent', false);
                    forgotForm.reset();
                    showView('#view-reset');
                } else {
                    showMessage((res.data && (res.data.msg || res.data.error)) || 'Failed to request reset', true);
                }
            } catch (err) { showMessage('Network error', true); }
            showLoading(false);
        });

        // reset form submit
        const resetForm = el('reset-form');
        if (resetForm) resetForm.addEventListener('submit', async (ev) => {
            ev.preventDefault(); showLoading(true); hideMessage();
            const token = el('reset-token').value.trim();
            const pw = el('reset-password').value;
            if (!token || !pw) { showMessage('Provide token and new password', true); showLoading(false); return; }
            try {
                const res = await api.resetPassword(token, pw);
                if (res.ok) { showMessage('Password reset successful. Please sign in.', false); resetForm.reset(); showView(VIEWS.LOGIN); }
                else showMessage((res.data && (res.data.msg || res.data.error)) || 'Failed to reset password', true);
            } catch (err) { showMessage('Network error', true); }
            showLoading(false);
        });

        // dashboard refresh
        el('refresh-items').addEventListener('click', (ev) => { ev.preventDefault(); loadAndShowDashboard(); });
        // wire search/filter controls to refresh
        const controls = ['search-input','filter-category','filter-location','filter-date-range','sort-by'];
        controls.forEach(id => {
            const elc = el(id);
            if (!elc) return;
            elc.addEventListener('change', () => loadAndShowDashboard());
            if (id === 'search-input') elc.addEventListener('input', () => { /* debounce? simple: call on enter only */ });
        });

        // back button on details
        el('back-to-dashboard').addEventListener('click', (ev) => { ev.preventDefault(); loadAndShowDashboard(); });

        // delegated clicks for view details
        document.getElementById('main').addEventListener('click', mainClickHandler);

        // Action buttons on item details
        const btnEdit = el('btn-edit-report');
        if (btnEdit) btnEdit.addEventListener('click', async (e) => {
            e.preventDefault();
            const id = document.getElementById('view-item-details').dataset.currentItemId;
            if (!id) return;
            // fetch item and prefill report form
            try {
                const res = await api.getItemById(id);
                if (res.ok && res.data) {
                    const item = res.data;
                    // fill form
                    const form = el('report-form');
                    el('report-title').value = item.title || '';
                    el('report-description').value = item.description || '';
                    el('report-category').value = item.category || '';
                    el('report-location').value = item.location || '';
                    // set report type
                    const rt = item.itemType || 'lost';
                    form.dataset.reportType = rt;
                    document.querySelectorAll('input[name="reportType"]').forEach(r=>{ if (r.value===rt) r.checked = true; });
                    // set edit id so submit will update
                    form.dataset.reportId = id;
                    showView(VIEWS.REPORT_DETAILS);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } catch (err) { showMessage('Could not load item for editing', true); }
        });

        const btnDelete = el('btn-delete-report');
        if (btnDelete) btnDelete.addEventListener('click', async (e) => {
            e.preventDefault();
            const id = document.getElementById('view-item-details').dataset.currentItemId;
            if (!id) return;
            if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) return;
            try {
                const res = await api.deleteItem(id);
                if (res.ok) {
                    showMessage('Report deleted', false);
                    showView(VIEWS.DASHBOARD);
                    await loadAndShowDashboard();
                } else {
                    showMessage((res.data && (res.data.msg || res.data.error)) || 'Failed to delete report', true);
                }
            } catch (err) { showMessage('Network error while deleting', true); }
        });

        const btnRecover = el('btn-mark-recovered');
        if (btnRecover) btnRecover.addEventListener('click', async (e) => {
            e.preventDefault();
            const id = document.getElementById('view-item-details').dataset.currentItemId;
            if (!id) return;
            if (!confirm('Mark this report as recovered?')) return;
            try {
                const res = await api.updateItemStatus(id, 'recovered');
                if (res.ok) {
                    showMessage('Report marked as recovered', false);
                    await loadAndShowDashboard();
                    showItemDetailsById(id);
                } else {
                    showMessage((res.data && (res.data.msg || res.data.error)) || 'Failed to update status', true);
                }
            } catch (err) { showMessage('Network error while updating status', true); }
        });

        // ======================================================
        // NEW: Event Listener for "My Reports" filter tabs (US-10 & US-16)
        // ======================================================
        el('my-reports-filter-tabs').addEventListener('click', (e) => {
            const btn = e.target.closest('.tab-btn');
            if (btn && btn.dataset.filter) {
                e.preventDefault();
                renderMyReports(btn.dataset.filter);
            }
        });
        // ======================================================
        // END NEW Event Listener
        // ======================================================

        // initial view based on token
        const token = getToken();
        if (token) {
            loadAndShowDashboard();
        } else {
            showView(VIEWS.LOGIN);
        }
    }

    // Start
    document.addEventListener('DOMContentLoaded', init);
})();