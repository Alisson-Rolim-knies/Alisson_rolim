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
    // Evitar conversão para UTC que pode causar deslocamento de dia
    // Tratar a data como string pura no formato YYYY-MM-DD
    if (!dateString) return '';
    
    // Dividir a string de data em partes
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString; // Retornar original se formato não for YYYY-MM-DD
    
    // Formatar manualmente para DD/MM/YYYY
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Obter data atual no formato YYYY-MM-DD
function getCurrentDate() {
    const now = new Date();
    // Ajuste para garantir que a data local seja usada, sem conversão para UTC
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
