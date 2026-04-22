// UTILS DE UI: Toasts e Loaders

export function showToast(message, type = "success") {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Ícone dependendo do tipo
    const icon = type === 'success' ? 'check_circle' : 'error';
    
    toast.innerHTML = `
        <span class="material-symbols-outlined" style="color: var(--${type})">${icon}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);

    // Remove após 3 segundos
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s forwards ease-in';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

export function showLoader() {
    const loader = document.getElementById('loader-overlay');
    if (loader) {
        loader.classList.remove('hidden');
    }
}

export function hideLoader() {
    const loader = document.getElementById('loader-overlay');
    if (loader) {
        loader.classList.add('hidden');
    }
}
