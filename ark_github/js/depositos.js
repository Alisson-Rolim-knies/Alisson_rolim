/**
 * Depositos.js - Lógica para gerenciamento de depósitos
 */

document.addEventListener('DOMContentLoaded', async function() {
    // Verificar se o usuário está autenticado
    if (!(await requireAuth())) return;
    
    // Inicializar a página
    initPage();
});

// Inicializar a página
function initPage() {
    // Definir data atual no campo de data
    document.getElementById('dataDeposito').value = getCurrentDate();
    
    // Carregar depósitos
    loadDepositos();
    
    // Configurar listeners de eventos
    setupEventListeners();
}

// Configurar listeners de eventos
function setupEventListeners() {
    // Form de adicionar depósito
    const addForm = document.getElementById('addDepositoForm');
    if (addForm) {
        addForm.addEventListener('submit', handleAddDeposito);
    }
    
    // Form de editar depósito
    const editForm = document.getElementById('editDepositoForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditDeposito);
    }
    
    // Botão de confirmar exclusão
    const deleteBtn = document.getElementById('confirmDeleteDeposito');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleDeleteDeposito);
    }
    
    // Form de filtro
    const filterForm = document.getElementById('filterForm');
    if (filterForm) {
        filterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            loadDepositos();
        });
    }
    
    // Botão de limpar filtros
    const clearBtn = document.getElementById('btnClearFilters');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            document.getElementById('filterDataInicio').value = '';
            document.getElementById('filterDataFim').value = '';
            loadDepositos();
        });
    }
}

// Carregar depósitos do Supabase
async function loadDepositos() {
    try {
        // Mostrar loader
        const tableBody = document.getElementById('depositosTableBody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">
                    <div class="loader"></div>
                    <p>Carregando depósitos...</p>
                </td>
            </tr>
        `;
        
        // Obter usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');
        
        // Construir query
        let query = supabase
            .from('depositos')
            .select('*')
            .eq('user_id', user.id)
            .order('data_deposito', { ascending: false });
        
        // Aplicar filtros
        const dataInicio = document.getElementById('filterDataInicio').value;
        const dataFim = document.getElementById('filterDataFim').value;
        
        if (dataInicio) {
            query = query.gte('data_deposito', dataInicio);
        }
        
        if (dataFim) {
            query = query.lte('data_deposito', dataFim);
        }
        
        // Executar query
        const { data: depositos, error } = await query;
        
        if (error) throw error;
        
        // Verificar se há depósitos
        if (!depositos || depositos.length === 0) {
            document.getElementById('emptyMessage').classList.remove('d-none');
            tableBody.innerHTML = '';
            return;
        }
        
        // Esconder mensagem de vazio
        document.getElementById('emptyMessage').classList.add('d-none');
        
        // Renderizar depósitos
        tableBody.innerHTML = depositos.map(deposito => {
            return `
                <tr>
                    <td>${formatDate(deposito.data_deposito)}</td>
                    <td>${formatCurrency(deposito.valor_depositado)}</td>
                    <td>${deposito.descricao || '-'}</td>
                    <td class="table-actions">
                        <button class="btn btn-sm btn-primary" onclick="openEditModal('${deposito.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="openDeleteModal('${deposito.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Erro ao carregar depósitos:', error);
        showNotification('Erro ao carregar depósitos: ' + error.message, 'error');
        
        const tableBody = document.getElementById('depositosTableBody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-danger">
                    <i class="fas fa-exclamation-circle fa-2x mb-3"></i>
                    <p>Erro ao carregar depósitos. Tente novamente mais tarde.</p>
                </td>
            </tr>
        `;
    }
}

// Adicionar novo depósito
async function handleAddDeposito(e) {
    e.preventDefault();
    
    const valorDepositado = parseFloat(document.getElementById('valorDepositado').value);
    const dataDeposito = document.getElementById('dataDeposito').value;
    const descricao = document.getElementById('descricaoDeposito').value;
    const errorElement = document.getElementById('addDepositoError');
    
    try {
        // Limpar erro anterior
        errorElement.classList.add('d-none');
        
        // Validar campos
        if (isNaN(valorDepositado) || valorDepositado <= 0 || !dataDeposito) {
            errorElement.textContent = 'Preencha todos os campos obrigatórios corretamente.';
            errorElement.classList.remove('d-none');
            return;
        }
        
        // Obter usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');
        
        // Inserir depósito
        const { data, error } = await supabase
            .from('depositos')
            .insert([
                {
                    user_id: user.id,
                    valor_depositado: valorDepositado,
                    data_deposito: dataDeposito,
                    descricao: descricao
                }
            ]);
        
        if (error) throw error;
        
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addDepositoModal'));
        modal.hide();
        
        // Limpar formulário
        document.getElementById('addDepositoForm').reset();
        document.getElementById('dataDeposito').value = getCurrentDate();
        
        // Mostrar notificação
        showNotification('Depósito registrado com sucesso!');
        
        // Recarregar depósitos
        loadDepositos();
        
    } catch (error) {
        console.error('Erro ao adicionar depósito:', error);
        errorElement.textContent = 'Erro ao adicionar depósito: ' + error.message;
        errorElement.classList.remove('d-none');
    }
}

// Abrir modal de edição
async function openEditModal(id) {
    try {
        // Obter depósito pelo ID
        const { data: deposito, error } = await supabase
            .from('depositos')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        // Preencher formulário
        document.getElementById('editDepositoId').value = deposito.id;
        document.getElementById('editValorDepositado').value = deposito.valor_depositado;
        document.getElementById('editDataDeposito').value = deposito.data_deposito;
        document.getElementById('editDescricaoDeposito').value = deposito.descricao || '';
        
        // Abrir modal
        const modal = new bootstrap.Modal(document.getElementById('editDepositoModal'));
        modal.show();
        
    } catch (error) {
        console.error('Erro ao abrir modal de edição:', error);
        showNotification('Erro ao carregar dados do depósito: ' + error.message, 'error');
    }
}

// Editar depósito
async function handleEditDeposito(e) {
    e.preventDefault();
    
    const id = document.getElementById('editDepositoId').value;
    const valorDepositado = parseFloat(document.getElementById('editValorDepositado').value);
    const dataDeposito = document.getElementById('editDataDeposito').value;
    const descricao = document.getElementById('editDescricaoDeposito').value;
    const errorElement = document.getElementById('editDepositoError');
    
    try {
        // Limpar erro anterior
        errorElement.classList.add('d-none');
        
        // Validar campos
        if (isNaN(valorDepositado) || valorDepositado <= 0 || !dataDeposito) {
            errorElement.textContent = 'Preencha todos os campos obrigatórios corretamente.';
            errorElement.classList.remove('d-none');
            return;
        }
        
        // Atualizar depósito
        const { data, error } = await supabase
            .from('depositos')
            .update({
                valor_depositado: valorDepositado,
                data_deposito: dataDeposito,
                descricao: descricao
            })
            .eq('id', id);
        
        if (error) throw error;
        
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editDepositoModal'));
        modal.hide();
        
        // Mostrar notificação
        showNotification('Depósito atualizado com sucesso!');
        
        // Recarregar depósitos
        loadDepositos();
        
    } catch (error) {
        console.error('Erro ao editar depósito:', error);
        errorElement.textContent = 'Erro ao atualizar depósito: ' + error.message;
        errorElement.classList.remove('d-none');
    }
}

// Abrir modal de exclusão
function openDeleteModal(id) {
    document.getElementById('deleteDepositoId').value = id;
    const modal = new bootstrap.Modal(document.getElementById('deleteDepositoModal'));
    modal.show();
}

// Excluir depósito
async function handleDeleteDeposito() {
    const id = document.getElementById('deleteDepositoId').value;
    
    try {
        // Excluir depósito
        const { error } = await supabase
            .from('depositos')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteDepositoModal'));
        modal.hide();
        
        // Mostrar notificação
        showNotification('Depósito excluído com sucesso!');
        
        // Recarregar depósitos
        loadDepositos();
        
    } catch (error) {
        console.error('Erro ao excluir depósito:', error);
        showNotification('Erro ao excluir depósito: ' + error.message, 'error');
    }
}

// Expor funções para uso global
window.openEditModal = openEditModal;
window.openDeleteModal = openDeleteModal;
