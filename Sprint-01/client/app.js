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
        EDIT_ITEM: '#view-edit-item',
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
        },
        
        resetPassword: async (currentPassword, newPassword) => {
            const headers = { 'Content-Type': 'application/json' };
            const token = getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                headers['x-auth-token'] = token;
            }
            const res = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await safeParseJson(res);
            return { ok: res.ok, status: res.status, data };
        },
        
        updateItem: async (id, formData) => {
            const headers = {};
            const token = getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                headers['x-auth-token'] = token;
            }
            const res = await fetch(`${API_URL}/items/${encodeURIComponent(id)}`, {
                method: 'PUT',
                headers,
                body: formData,
            });
            const data = await safeParseJson(res);
            return { ok: res.ok, status: res.status, data };
        },
        
        updateItemStatus: async (id, status) => {
            const headers = { 'Content-Type': 'application/json' };
            const token = getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                headers['x-auth-token'] = token;
            }
            const res = await fetch(`${API_URL}/items/${encodeURIComponent(id)}/status`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ status }),
            });
            const data = await safeParseJson(res);
            return { ok: res.ok, status: res.status, data };
        },
        
        deleteItem: async (id) => {
            const headers = {};
            const token = getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                headers['x-auth-token'] = token;
            }
            const res = await fetch(`${API_URL}/items/${encodeURIComponent(id)}`, {
                method: 'DELETE',
                headers,
            });
            const data = await safeParseJson(res);
            return { ok: res.ok, status: res.status, data };
        },
        
        searchItems: async (params = {}) => {
            const headers = {};
            const token = getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                headers['x-auth-token'] = token;
            }
            
            // Build query string from params
            const queryParams = new URLSearchParams();
            Object.keys(params).forEach(key => {
                if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                    queryParams.append(key, params[key]);
                }
            });
            
            const queryString = queryParams.toString();
            const url = queryString ? `${API_URL}/items/search/advanced?${queryString}` : `${API_URL}/items/search/advanced`;
            
            const res = await fetch(url, { headers });
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

    // ======================================================
    // NEW: Cache for current item being viewed (for edit/delete)
    // ======================================================
    let currentViewedItem = null;
    // ======================================================

    function renderItemDetails(item) {
        // Store current item for edit/delete operations
        currentViewedItem = item;
        
        el('details-image').src = item.imageUrl || item.image || '';
        el('details-title').textContent = item.title || 'Untitled';
        el('details-description').textContent = item.description || '';
        el('details-category').textContent = item.category || 'N/A';
        el('details-location').textContent = item.location || 'N/A';

        const reportedBy = item.reportedBy || {};
        el('details-reporter-name').textContent = (typeof reportedBy === 'object' && reportedBy.name) ? reportedBy.name : (reportedBy || 'Unknown');
        el('details-reporter-email').textContent = (typeof reportedBy === 'object' && reportedBy.email) ? reportedBy.email : (item.contact || 'Not provided');
        
        // Phone number
        const phone = (typeof reportedBy === 'object' && reportedBy.phone) ? reportedBy.phone : (typeof reportedBy === 'object' && reportedBy.mobile) ? reportedBy.mobile : 'Not provided';
        el('details-reporter-mobile').textContent = phone;
        
        // WhatsApp number
        const whatsapp = (typeof reportedBy === 'object' && reportedBy.whatsapp) ? reportedBy.whatsapp : null;
        const whatsappRow = el('details-whatsapp-row');
        if (whatsapp && whatsapp.trim()) {
            el('details-reporter-whatsapp').textContent = whatsapp;
            whatsappRow.classList.remove('hidden');
        } else {
            whatsappRow.classList.add('hidden');
        }

        el('details-date').textContent = item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Unknown';

        const rawType = (item.itemType || item.type || 'unknown').toLowerCase();
        const typeSpan = el('details-type');
        typeSpan.textContent = rawType.toUpperCase();
        typeSpan.className = 'badge ' + (rawType === 'lost' ? 'type-lost' : 'type-found');
        
        // Display status
        const status = item.status || 'active';
        const statusSpan = el('details-status');
        if (status && status !== 'active') {
            statusSpan.textContent = status.toUpperCase();
            statusSpan.className = 'badge ' + (status === 'recovered' ? 'badge-success' : 'badge-info');
            statusSpan.classList.remove('hidden');
        } else {
            statusSpan.classList.add('hidden');
        }
        
        // Show edit/delete buttons if user owns this item
        const ownerActions = el('item-owner-actions');
        if (currentUser && item.reportedBy && 
            ((typeof item.reportedBy === 'object' && item.reportedBy._id === currentUser.id) || 
             (typeof item.reportedBy === 'string' && item.reportedBy === currentUser.id))) {
            ownerActions.classList.remove('hidden');
        } else {
            ownerActions.classList.add('hidden');
        }

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
        el('profile-whatsapp-display').textContent = user.whatsapp || 'Not set';
        el('profile-whatsapp-input').value = user.whatsapp || '';
        
        showLoading(false);
        showView(VIEWS.PROFILE);
    }
    // ======================================================

    // Handlers
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

        // Contact information is automatically available through the reportedBy user reference
        // No need to send separately as it's stored in the User model

        try {
            const res = await api.reportItem(formData); // Sends the file to the backend
            if (res.ok) {
                showMessage('Report submitted successfully', false);
                formEl.reset();
                showView(VIEWS.DASHBOARD);
                await loadAndShowDashboard();
            } else {
                showMessage((res.data && (res.data.msg || res.data.error)) || 'Failed to submit report', true);
            }
        } catch (err) {
            showMessage('Network error while submitting report', true);
        } finally { showLoading(false); }
    }

    // ======================================================
    // NEW: Handle profile update (US-06)
    // ======================================================
    async function handleProfileUpdate(e) {
        e.preventDefault();
        showLoading(true);
        hideMessage();

        const newPhone = el('profile-phone-input').value.trim();
        const newWhatsApp = el('profile-whatsapp-input').value.trim();

        // Validate phone number
        if (!validateE164(newPhone)) {
            showMessage('Phone number must be in international E.164 format, e.g. +923001234567', true);
            showLoading(false);
            return;
        }

        // Validate WhatsApp if provided
        if (newWhatsApp && !validateE164(newWhatsApp)) {
            showMessage('WhatsApp number must be in international E.164 format, e.g. +923001234567', true);
            showLoading(false);
            return;
        }

        const formData = new FormData();
        formData.set('phone', newPhone);
        if (newWhatsApp) {
            formData.set('whatsapp', newWhatsApp);
        } else {
            formData.set('whatsapp', ''); // Clear WhatsApp if empty
        }

        try {
            const res = await api.updateUserProfile(formData);
            if (res.ok) {
                showMessage('Profile updated successfully', false);
                if (res.data && res.data.user) {
                    currentUser = res.data.user;
                    renderProfileDetails(currentUser);
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
            const res = await api.getAllItems();
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

    // ======================================================
    // NEW: Password reset handler (US-07)
    // ======================================================
    async function handlePasswordReset(e) {
        e.preventDefault();
        showLoading(true);
        hideMessage();

        const currentPassword = el('current-password').value;
        const newPassword = el('new-password').value;
        const confirmPassword = el('confirm-password').value;

        if (newPassword !== confirmPassword) {
            showMessage('New passwords do not match', true);
            showLoading(false);
            return;
        }

        if (newPassword.length < 6) {
            showMessage('New password must be at least 6 characters long', true);
            showLoading(false);
            return;
        }

        try {
            const res = await api.resetPassword(currentPassword, newPassword);
            if (res.ok) {
                showMessage('Password changed successfully', false);
                el('password-reset-form').reset();
            } else {
                showMessage((res.data && (res.data.msg || res.data.error)) || 'Failed to change password', true);
            }
        } catch (err) {
            showMessage('Network error while changing password', true);
        } finally {
            showLoading(false);
        }
    }
    // ======================================================

    // ======================================================
    // NEW: Search and filter handler (US-19, US-20, US-21, US-22, US-23)
    // ======================================================
    async function handleSearchFilter(e) {
        e.preventDefault();
        showLoading(true);
        hideMessage();

        const formData = new FormData(el('search-filter-form'));
        const params = {};
        
        for (const [key, value] of formData.entries()) {
            if (value && value.trim()) {
                params[key] = value.trim();
            }
        }

        try {
            const res = await api.searchItems(params);
            if (res.ok) {
                renderItems(res.data || [], 'dashboard-items-container');
                showMessage(`Found ${(res.data || []).length} item(s)`, false);
            } else {
                showMessage('Failed to search items', true);
            }
        } catch (err) {
            showMessage('Network error while searching', true);
        } finally {
            showLoading(false);
        }
    }

    function toggleSearchPanel() {
        const panel = el('search-filter-panel');
        panel.classList.toggle('hidden');
    }

    function clearFilters() {
        el('search-filter-form').reset();
        loadAndShowDashboard();
    }
    // ======================================================

    // ======================================================
    // NEW: Edit item handlers (US-11, US-17)
    // ======================================================
    function showEditItemForm() {
        if (!currentViewedItem) {
            showMessage('No item selected for editing', true);
            return;
        }

        // Pre-fill the edit form
        el('edit-item-id').value = currentViewedItem._id || currentViewedItem.id;
        el('edit-item-title').value = currentViewedItem.title || '';
        el('edit-item-description').value = currentViewedItem.description || '';
        el('edit-item-category').value = currentViewedItem.category || '';
        el('edit-item-location').value = currentViewedItem.location || '';
        
        showView(VIEWS.EDIT_ITEM);
    }

    async function handleEditItem(e) {
        e.preventDefault();
        showLoading(true);
        hideMessage();

        const itemId = el('edit-item-id').value;
        const formEl = el('edit-item-form');
        const formData = new FormData(formEl);

        try {
            const res = await api.updateItem(itemId, formData);
            if (res.ok) {
                showMessage('Item updated successfully', false);
                formEl.reset();
                // Reload and show item details
                await showItemDetailsById(itemId);
            } else {
                showMessage((res.data && (res.data.msg || res.data.error)) || 'Failed to update item', true);
            }
        } catch (err) {
            showMessage('Network error while updating item', true);
        } finally {
            showLoading(false);
        }
    }

    function cancelEditItem() {
        if (currentViewedItem) {
            renderItemDetails(currentViewedItem);
        } else {
            loadAndShowDashboard();
        }
    }
    // ======================================================

    // ======================================================
    // NEW: Mark item as recovered/returned handler (US-12)
    // ======================================================
    async function handleMarkRecovered() {
        if (!currentViewedItem) {
            showMessage('No item selected', true);
            return;
        }

        const itemType = currentViewedItem.itemType || 'lost';
        const statusText = itemType === 'lost' ? 'recovered' : 'returned';
        
        if (!confirm(`Mark this item as ${statusText}?`)) {
            return;
        }

        showLoading(true);
        hideMessage();

        try {
            const res = await api.updateItemStatus(currentViewedItem._id || currentViewedItem.id, statusText);
            if (res.ok) {
                showMessage(`Item marked as ${statusText}`, false);
                // Reload item details
                await showItemDetailsById(currentViewedItem._id || currentViewedItem.id);
            } else {
                showMessage((res.data && (res.data.msg || res.data.error)) || 'Failed to update status', true);
            }
        } catch (err) {
            showMessage('Network error while updating status', true);
        } finally {
            showLoading(false);
        }
    }
    // ======================================================

    // ======================================================
    // NEW: Delete item handler (US-13, US-18)
    // ======================================================
    async function handleDeleteItem() {
        if (!currentViewedItem) {
            showMessage('No item selected', true);
            return;
        }

        if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
            return;
        }

        showLoading(true);
        hideMessage();

        try {
            const res = await api.deleteItem(currentViewedItem._id || currentViewedItem.id);
            if (res.ok) {
                showMessage('Item deleted successfully', false);
                currentViewedItem = null;
                loadAndShowDashboard();
            } else {
                showMessage((res.data && (res.data.msg || res.data.error)) || 'Failed to delete item', true);
            }
        } catch (err) {
            showMessage('Network error while deleting item', true);
        } finally {
            showLoading(false);
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
        el('password-reset-form').addEventListener('submit', handlePasswordReset);
        // ======================================================

        // ======================================================
        // NEW: Search and filter event listeners (US-19-23)
        // ======================================================
        el('toggle-search').addEventListener('click', (ev) => { ev.preventDefault(); toggleSearchPanel(); });
        el('search-filter-form').addEventListener('submit', handleSearchFilter);
        el('clear-filters').addEventListener('click', (ev) => { ev.preventDefault(); clearFilters(); });
        // ======================================================

        // ======================================================
        // NEW: Edit item event listeners (US-11, US-17)
        // ======================================================
        el('edit-item-btn').addEventListener('click', (ev) => { ev.preventDefault(); showEditItemForm(); });
        el('edit-item-form').addEventListener('submit', handleEditItem);
        el('edit-item-cancel').addEventListener('click', (ev) => { ev.preventDefault(); cancelEditItem(); });
        // ======================================================

        // ======================================================
        // NEW: Item action event listeners (US-12, US-13, US-18)
        // ======================================================
        el('mark-recovered-btn').addEventListener('click', (ev) => { ev.preventDefault(); handleMarkRecovered(); });
        el('delete-item-btn').addEventListener('click', (ev) => { ev.preventDefault(); handleDeleteItem(); });
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

        // dashboard refresh
        el('refresh-items').addEventListener('click', (ev) => { ev.preventDefault(); loadAndShowDashboard(); });

        // back button on details
        el('back-to-dashboard').addEventListener('click', (ev) => { ev.preventDefault(); loadAndShowDashboard(); });

        // delegated clicks for view details
        document.getElementById('main').addEventListener('click', mainClickHandler);

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