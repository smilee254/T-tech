// Ʇ-Tech: Pure Stack Master Logic
const API_URL = '/api';

// --- SPA ROUTER ---
const pages = {
    landing: document.getElementById('page-landing'),
    auth: document.getElementById('page-auth'),
    dashboard: document.getElementById('page-dashboard')
};

function showPage(pageName) {
    Object.values(pages).forEach(p => p.classList.add('hidden'));
    if (pages[pageName]) pages[pageName].classList.remove('hidden');
    window.location.hash = pageName;
}

// Nav Links
const navLinks = {
    login: document.getElementById('nav-login'),
    dashboard: document.getElementById('nav-dashboard'),
    admin: document.getElementById('nav-admin'),
    logout: document.getElementById('nav-logout')
};

// Initial state
window.addEventListener('load', () => {
    const userEmail = sessionStorage.getItem('user_email');
    if (userEmail) {
        navLinks.login.classList.add('hidden');
        navLinks.dashboard.classList.remove('hidden');
        navLinks.logout.classList.remove('hidden');
        if (sessionStorage.getItem('is_admin') === 'true') {
            navLinks.admin.classList.remove('hidden');
        }
        showPage('dashboard');
    } else {
        showPage('landing');
    }
});

// --- AUTH LOGIC ---
const authForm = document.getElementById('auth-form-el');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleBtn = document.getElementById('auth-toggle-btn');
let isSignUpMode = false;

authToggleBtn.onclick = (e) => {
    e.preventDefault();
    isSignUpMode = !isSignUpMode;
    document.getElementById('auth-title').innerText = isSignUpMode ? 'Join the Script' : 'Return to Eco';
    document.getElementById('auth-subtitle').innerText = isSignUpMode ? 'Start flipping tech today' : 'Sign in to your ecosystem';
    authSubmitBtn.innerText = isSignUpMode ? 'Sign Up' : 'Sign In';
    authToggleBtn.innerText = isSignUpMode ? 'Actually, I have an account' : 'Actually, I need to Sign Up';
};

authForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const endpoint = isSignUpMode ? '/register' : '/login';

    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail);

        if (isSignUpMode) {
            alert("Registration Successful. Verification Required.");
            await fetch(`/api/verify?email=${email}`, { method: 'POST' }); // Simulate auto-verification for demo
        } else {
            if (!data.verified) {
                alert("Email Verification Pending.");
                return;
            }

            sessionStorage.setItem('user_email', data.email);
            sessionStorage.setItem('is_admin', data.is_admin);

            navLinks.login.classList.add('hidden');
            navLinks.dashboard.classList.remove('hidden');
            navLinks.logout.classList.remove('hidden');
            if (data.is_admin) navLinks.admin.classList.remove('hidden');

            showPage('dashboard');
        }
    } catch (err) {
        alert(err.message);
    }
};

// --- SERVICES LOGIC ---
const serviceCards = document.querySelectorAll('.service-card');
const issueDescContainer = document.getElementById('issue-desc-container');
let selectedService = null;

serviceCards.forEach(card => {
    card.onclick = () => {
        serviceCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedService = card.dataset.service;
        issueDescContainer.style.display = 'block';
    };
});

document.getElementById('submit-request-btn').onclick = async () => {
    const email = sessionStorage.getItem('user_email');
    const description = document.getElementById('issue-desc').value;

    if (!selectedService || !description) {
        alert("Select a service and describe your issue.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, service_type: selectedService, description })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail);

        alert("Logged in The Vault. Specialist notified.");
        document.getElementById('issue-desc').value = '';
    } catch (err) {
        alert(err.message);
    }
};

// --- ADMIN LOGIC (FOR ADMIN.HTML) ---
if (window.location.pathname.includes('admin.html')) {
    const adminEmail = sessionStorage.getItem('user_email');
    const loadRequests = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/requests`, {
                headers: { 'admin-email': adminEmail }
            });
            const data = await res.json();
            const tableBody = document.getElementById('admin-table-body');
            tableBody.innerHTML = '';

            data.forEach(req => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="text-xs text-gray-500">${new Date(req.created_at).toLocaleString()}</td>
                    <td class="font-bold">${req.user_email}</td>
                    <td class="text-primary font-bold">${req.service_type}</td>
                    <td class="text-xs max-w-xs truncate">${req.description}</td>
                    <td><span class="status-badge status-pending">${req.status}</span></td>
                    <td><button class="btn-primary" style="padding: 0.5rem 1rem; font-size: 0.6rem">Resolve</button></td>
                `;
                tableBody.appendChild(tr);
            });
        } catch (err) {
            console.error("Admin Load Failed:", err);
        }
    };

    document.getElementById('refresh-admin-btn').onclick = loadRequests;
    loadRequests();
}

// --- UTILS ---
navLinks.login.onclick = (e) => { e.preventDefault(); showPage('auth'); };
document.getElementById('get-started-btn').onclick = () => showPage('auth');

navLinks.logout.onclick = (e) => {
    e.preventDefault();
    sessionStorage.clear();
    window.location.href = '/';
};
