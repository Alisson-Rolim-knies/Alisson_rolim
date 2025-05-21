/**
 * Utilitários gerais para a aplicação
 */

// Formatação de moeda
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Formatação de data
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

// Obter data atual no formato YYYY-MM-DD
function getCurrentDate() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

// Função para mostrar notificações
function showNotification(message, type = 'success') {
    const toastContainer = document.querySelector('.toast-container') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    const toastHeader = document.createElement('div');
    toastHeader.className = 'toast-header';
    
    const icon = document.createElement('i');
    if (type === 'success') {
        icon.className = 'fas fa-check-circle me-2';
    } else if (type === 'error') {
        icon.className = 'fas fa-exclamation-circle me-2';
        toastHeader.style.backgroundColor = '#dc3545';
    }
    
    const title = document.createElement('strong');
    title.className = 'me-auto';
    title.textContent = type === 'success' ? 'Sucesso' : 'Erro';
    
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn-close';
    closeButton.setAttribute('data-bs-dismiss', 'toast');
    closeButton.setAttribute('aria-label', 'Close');
    
    const toastBody = document.createElement('div');
    toastBody.className = 'toast-body';
    toastBody.textContent = message;
    
    toastHeader.appendChild(icon);
    toastHeader.appendChild(title);
    toastHeader.appendChild(closeButton);
    
    toast.appendChild(toastHeader);
    toast.appendChild(toastBody);
    
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Auto-remove após ser fechado
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// Criar container de toast se não existir
function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    document.body.appendChild(container);
    return container;
}
