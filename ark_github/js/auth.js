/**
 * Autenticação com Supabase
 */

document.addEventListener('DOMContentLoaded', function() {
    // Formulário de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const errorElement = document.getElementById('loginError');
            
            try {
                errorElement.classList.add('d-none');
                
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                
                if (error) {
                    errorElement.textContent = 'Email ou senha incorretos. Tente novamente.';
                    errorElement.classList.remove('d-none');
                } else {
                    // Login bem-sucedido
                    const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                    modal.hide();
                    
                    showNotification('Login realizado com sucesso!');
                    updateUIAuth();
                    
                    // Recarregar a página para atualizar o dashboard
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
            } catch (err) {
                errorElement.textContent = 'Ocorreu um erro ao fazer login. Tente novamente.';
                errorElement.classList.remove('d-none');
                console.error('Erro de login:', err);
            }
        });
    }
    
    // Formulário de cadastro
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
            const errorElement = document.getElementById('signupError');
            
            try {
                // Limpar erro anterior
                errorElement.classList.add('d-none');
                
                // Validar senha
                if (password.length < 6) {
                    errorElement.textContent = 'A senha deve ter pelo menos 6 caracteres.';
                    errorElement.classList.remove('d-none');
                    return;
                }
                
                // Validar confirmação de senha
                if (password !== passwordConfirm) {
                    errorElement.textContent = 'As senhas não coincidem.';
                    errorElement.classList.remove('d-none');
                    return;
                }
                
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: password
                });
                
                if (error) {
                    errorElement.textContent = error.message;
                    errorElement.classList.remove('d-none');
                } else {
                    // Cadastro bem-sucedido
                    const modal = bootstrap.Modal.getInstance(document.getElementById('signupModal'));
                    modal.hide();
                    
                    showNotification('Cadastro realizado com sucesso! Verifique seu email para confirmar sua conta.');
                    
                    // Abrir modal de login após o cadastro
                    setTimeout(() => {
                        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
                        loginModal.show();
                    }, 1500);
                }
            } catch (err) {
                errorElement.textContent = 'Ocorreu um erro ao fazer o cadastro. Tente novamente.';
                errorElement.classList.remove('d-none');
                console.error('Erro de cadastro:', err);
            }
        });
    }
    
    // Botão de logout
    const logoutButton = document.getElementById('btnLogout');
    if (logoutButton) {
        logoutButton.addEventListener('click', async function(e) {
            e.preventDefault();
            
            try {
                const { error } = await supabase.auth.signOut();
                
                if (error) {
                    showNotification('Erro ao fazer logout: ' + error.message, 'error');
                } else {
                    showNotification('Logout realizado com sucesso!');
                    
                    // Atualizar UI após logout
                    updateUIAuth();
                    
                    // Redirecionar para a página inicial
                    setTimeout(() => {
                        window.location.href = '/index.html';
                    }, 1000);
                }
            } catch (err) {
                showNotification('Ocorreu um erro ao fazer logout.', 'error');
                console.error('Erro de logout:', err);
            }
        });
    }
});
