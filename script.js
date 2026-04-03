// Ʇ-Tech Professional Logic Master
const API_URL = (window.location.port === '3000' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? `http://localhost:8000/api`
    : '/api';

// --- SHARED AUTH LOGIC ---
const handleAuth = async (endpoint, payload, msgElem, btnElem) => {
    try {
        btnElem.innerText = "INITIALIZING...";
        btnElem.disabled = true;

        const res = await fetch(`${API_URL}/auth/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.detail || "Access Denied");

        localStorage.setItem('user_email', data.email);
        localStorage.setItem('is_admin', data.is_admin);

        msgElem.innerText = "LOGIN SUCCESSFUL. ENTERING BAY...";
        msgElem.style.color = "#E1FB2E";

        setTimeout(() => {
            window.location.href = data.redirect || 'index.html';
        }, 800);

    } catch (err) {
        msgElem.innerText = err.message;
        msgElem.style.color = "#FF4444";
        btnElem.innerText = "INITIALIZE ACCESS";
        btnElem.disabled = false;
    }
};

// --- PUBLIC ENTRY GATEWAY ---
const authGate = document.getElementById('auth-gate');
if (authGate) {
    authGate.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('userEmail').value;
        const phone = document.getElementById('userPhone').value;
        const password = document.getElementById('userPass').value;
        const msg = document.getElementById('msg');

        const phoneRegex = /^(07|01|\+254)\d{8,10}$/;
        if (!phoneRegex.test(phone)) {
            msg.innerText = "INVALID PHONE: Use 07..., 01..., or +254...";
            msg.style.color = "#FF4444";
            return;
        }

        await handleAuth('public', { email, password, phone_number: phone }, msg, authGate.querySelector('button'));
    };
}

// --- ADMIN COMMAND GATEWAY ---
const adminGateForm = document.getElementById('admin-gate-form');
if (adminGateForm) {
    adminGateForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPass').value;
        const msg = document.getElementById('msg');

        await handleAuth('admin', { email, password }, msg, adminGateForm.querySelector('button'));
    };
}

// --- SERVICE BAY (DASHBOARD) ---
const serviceCards = document.querySelectorAll('.service-card');
const sidePanel = document.getElementById('side-panel');
let selectedService = null;

if (serviceCards.length > 0) {
    serviceCards.forEach(card => {
        card.onclick = () => {
            selectedService = card.dataset.service;
            const titleElem = document.getElementById('selected-service-title');
            if (titleElem) titleElem.innerText = selectedService;
            if (sidePanel) sidePanel.classList.add('active');
        };
    });
}

const submitBtn = document.getElementById('submit-request-btn');
if (submitBtn) {
    submitBtn.onclick = async () => {
        const email = localStorage.getItem('user_email');
        const description = document.getElementById('issue-desc').value;

        if (!email) {
            alert("Security Protocol Breach: No session detected.");
            window.location.href = "login.html";
            return;
        }

        try {
            submitBtn.innerText = "COMMITTING TO VAULT...";
            const res = await fetch(`${API_URL}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, service_type: selectedService, description })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Submission Error");

            alert("Mission logged in The Vault.");
            document.getElementById('issue-desc').value = '';
            if (sidePanel) sidePanel.classList.remove('active');
        } catch (err) {
            alert(err.message);
        } finally {
            submitBtn.innerText = "COMMIT TO VAULT";
        }
    };
}

// --- ADMIN MISSION CONTROL ---

window.resolveRequest = async (requestId) => {
    const adminEmail = localStorage.getItem('user_email');
    try {
        const res = await fetch(`${API_URL}/admin/resolve/${requestId}`, {
            method: 'PATCH',
            headers: { 'admin-email': adminEmail }
        });
        if (res.ok) {
            alert("Mission Accomplished. Status updated to Resolved.");
            location.reload();
        }
    } catch (err) { alert(err.message); }
};

window.deleteRequest = async (requestId) => {
    if (!confirm("Are you sure you want to purge this record?")) return;
    const adminEmail = localStorage.getItem('user_email');
    try {
        const res = await fetch(`${API_URL}/admin/delete/${requestId}`, {
            method: 'DELETE',
            headers: { 'admin-email': adminEmail }
        });
        if (res.ok) location.reload();
    } catch (err) { alert(err.message); }
};

window.notifyClient = (phone, service) => {
    const msg = `Hi, your Ʇ-Tech service (${service}) has been successfully resolved. You can now collect your device. Cheers, Ʇ-Tech Team.`;
    const cleanPhone = phone.replace(/\s+/g, '').replace(/^0/, '254');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
};

const requestTableBody = document.getElementById('requestTableBody');
if (requestTableBody) {
    const loadRequests = async () => {
        const adminEmail = localStorage.getItem('user_email');
        const countDisplay = document.getElementById('count');

        try {
            const res = await fetch(`${API_URL}/admin/requests`, {
                headers: { 'admin-email': adminEmail }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Access Denied");

            requestTableBody.innerHTML = '';
            if (countDisplay) countDisplay.innerText = data.length;

            data.forEach(req => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 1rem; border-bottom: 1px solid var(--glass-border);">${req.user_email}</td>
                    <td style="padding: 1rem; border-bottom: 1px solid var(--glass-border);">
                        <a href="tel:${req.phone_number}" style="color: #fff; text-decoration: none; border-bottom: 1px solid rgba(255,255,255,0.2);">${req.phone_number}</a>
                    </td>
                    <td style="padding: 1rem; border-bottom: 1px solid var(--glass-border); color: var(--accent); font-weight: 700;">${req.service_type}</td>
                    <td style="padding: 1rem; border-bottom: 1px solid var(--glass-border);">
                        <span class="status-pill ${req.status.toLowerCase()}" style="padding: 5px 12px; border-radius: 20px; font-size: 0.7rem; font-weight: 700;">${req.status}</span>
                    </td>
                    <td style="padding: 1rem; border-bottom: 1px solid var(--glass-border);">
                        <div style="display: flex; gap: 10px;">
                            <button onclick="resolveRequest(${req.id})" class="admin-action-btn" style="background: rgba(232, 255, 71, 0.1); color: var(--accent); border: 1px solid var(--accent); padding: 5px 10px; border-radius: 5px; cursor: pointer;">Resolve</button>
                            <button onclick="notifyClient('${req.phone_number}', '${req.service_type}')" style="background: rgba(37, 211, 102, 0.1); color: #25D366; border: 1px solid #25D366; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Notify</button>
                            <button onclick="deleteRequest(${req.id})" style="background: rgba(255, 68, 68, 0.1); color: #FF4444; border: 1px solid #FF4444; padding: 5px 10px; border-radius: 5px; cursor: pointer;">×</button>
                        </div>
                    </td>
                `;
                requestTableBody.appendChild(tr);
            });
        } catch (err) { console.error(err); }
    };
    loadRequests();
}

// --- UTILS ---
const logoutBtn = document.getElementById('nav-logout');
if (logoutBtn) {
    logoutBtn.onclick = (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = 'index.html';
    };
}
