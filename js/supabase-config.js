/**
 * Configuração do Supabase e funções de autenticação
 */

// Configuração do Supabase
const SUPABASE_URL = 'https://pzlanqcdjjopkkmdnmbj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bGFucWNkampvcGtrbWRubWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMzYxNjgsImV4cCI6MjA2MjcxMjE2OH0.r_6EzpQ1R9J2OkjLG7wIhaQbS1FCJfv7Owfa4heobJM';

// Inicialização do cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Verificar se o usuário está autenticado
async function checkAuth() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session !== null;
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        return false;
    }
}

// Função para ajustar os elementos da UI com base no estado de autenticação
async function updateUIAuth() {
    try {
        const isAuthenticated = await checkAuth();
        
        document.querySelectorAll('.auth-required').forEach(el => {
            el.classList.toggle('d-none', !isAuthenticated);
        });
        
        document.querySelectorAll('.auth-not-required').forEach(el => {
            el.classList.toggle('d-none', isAuthenticated);
        });
        
        return isAuthenticated;
    } catch (error) {
        console.error('Erro ao atualizar UI de autenticação:', error);
        return false;
    }
}

// Função para redirecionar para a página inicial se não estiver autenticado
async function requireAuth() {
    try {
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) {
            window.location.href = '/index.html';
            return false;
        }
        return true;
    } catch (error) {
        console.error('Erro ao verificar autenticação obrigatória:', error);
        window.location.href = '/index.html';
        return false;
    }
}

// Inicializar a verificação de autenticação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', updateUIAuth);
