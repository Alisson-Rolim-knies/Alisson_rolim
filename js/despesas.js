/**
 * Despesas.js - Lógica para gerenciamento de despesas
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
    document.getElementById('dataDespesa').value = getCurrentDate();
    
    // Carregar despesas
    loadDespesas();
    
    // Configurar listeners de eventos
    setupEventListeners();
}

// Configurar listeners de eventos
function setupEventListeners() {
    // Form de adicionar despesa
    const addForm = document.getElementById('addDespesaForm');
    if (addForm) {
        addForm.addEventListener('submit', handleAddDespesa);
    }
    
    // Form de editar despesa
    const editForm = document.getElementById('editDespesaForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditDespesa);
    }
    
    // Botão de confirmar exclusão
    const deleteBtn = document.getElementById('confirmDeleteDespesa');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleDeleteDespesa);
    }
    
    // Form de filtro
    const filterForm = document.getElementById('filterForm');
    if (filterForm) {
        filterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            loadDespesas();
        });
    }
    
    // Botão de limpar filtros
    const clearBtn = document.getElementById('btnClearFilters');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            document.getElementById('filterDataInicio').value = '';
            document.getElementById('filterDataFim').value = '';
            loadDespesas();
        });
    }
}

// Carregar despesas do Supabase
async function loadDespesas() {
    try {
        // Mostrar loader
        const tableBody = document.getElementById('despesasTableBody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">
                    <div class="loader"></div>
                    <p>Carregando despesas...</p>
                </td>
            </tr>
        `;
        
        // Obter usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');
        
        // Construir query
        let query = supabase
            .from('despesas')
            .select('*')
            .eq('user_id', user.id)
            .order('data_despesa', { ascending: false });
        
        // Aplicar filtros
        const dataInicio = document.getElementById('filterDataInicio').value;
        const dataFim = document.getElementById('filterDataFim').value;
        
        if (dataInicio) {
            query = query.gte('data_despesa', dataInicio);
        }
        
        if (dataFim) {
            query = query.lte('data_despesa', dataFim);
        }
        
        // Executar query
        const { data: despesas, error } = await query;
        
        if (error) throw error;
        
        // Verificar se há despesas
        if (!despesas || despesas.length === 0) {
            document.getElementById('emptyMessage').classList.remove('d-none');
            tableBody.innerHTML = '';
            return;
        }
        
        // Esconder mensagem de vazio
        document.getElementById('emptyMessage').classList.add('d-none');
        
        // Renderizar despesas
        tableBody.innerHTML = despesas.map(despesa => {
            return `
                <tr>
                    <td>${formatDate(despesa.data_despesa)}</td>
                    <td>${formatCurrency(despesa.valor_despesa)} <span class="badge bg-primary">Dinheiro</span></td>
                    <td>${despesa.descricao || '-'}</td>
                    <td class="table-actions">
                        <button class="btn btn-sm btn-primary" onclick="openEditModal('${despesa.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="openDeleteModal('${despesa.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Erro ao carregar despesas:', error);
        showNotification('Erro ao carregar despesas: ' + error.message, 'error');
        
        const tableBody = document.getElementById('despesasTableBody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-danger">
                    <i class="fas fa-exclamation-circle fa-2x mb-3"></i>
                    <p>Erro ao carregar despesas. Tente novamente mais tarde.</p>
                </td>
            </tr>
        `;
    }
}

// Adicionar nova despesa
async function handleAddDespesa(e) {
    e.preventDefault();
    
    const valorDespesa = parseFloat(document.getElementById('valorDespesa').value);
    const dataDespesa = document.getElementById('dataDespesa').value;
    const descricao = document.getElementById('descricaoDespesa').value;
    const errorElement = document.getElementById('addDespesaError');
    
    try {
        // Limpar erro anterior
        errorElement.classList.add('d-none');
        
        // Validar campos
        if (isNaN(valorDespesa) || valorDespesa <= 0 || !dataDespesa) {
            errorElement.textContent = 'Preencha todos os campos obrigatórios corretamente.';
            errorElement.classList.remove('d-none');
            return;
        }
        
        // Obter usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');
        
        // Inserir despesa - removendo o campo origem_despesa que está causando o erro
        const { data, error } = await supabase
            .from('despesas')
            .insert([
                {
                    user_id: user.id,
                    valor_despesa: valorDespesa,
                    data_despesa: dataDespesa,
                    descricao: descricao
                }
            ]);
        
        if (error) throw error;
        
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addDespesaModal'));
        modal.hide();
        
        // Limpar formulário
        document.getElementById('addDespesaForm').reset();
        document.getElementById('dataDespesa').value = getCurrentDate();
        
        // Mostrar notificação
        showNotification('Despesa registrada com sucesso!');
        
        // Recarregar despesas
        loadDespesas();
        
    } catch (error) {
        console.error('Erro ao adicionar despesa:', error);
        errorElement.textContent = 'Erro ao adicionar despesa: ' + error.message;
        errorElement.classList.remove('d-none');
    }
}

// Abrir modal de edição
async function openEditModal(id) {
    try {
        // Obter despesa pelo ID
        const { data: despesa, error } = await supabase
            .from('despesas')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        // Preencher formulário
        document.getElementById('editDespesaId').value = despesa.id;
        document.getElementById('editValorDespesa').value = despesa.valor_despesa;
        document.getElementById('editDataDespesa').value = despesa.data_despesa;
        document.getElementById('editDescricaoDespesa').value = despesa.descricao || '';
        
        // Abrir modal
        const modal = new bootstrap.Modal(document.getElementById('editDespesaModal'));
        modal.show();
        
    } catch (error) {
        console.error('Erro ao abrir modal de edição:', error);
        showNotification('Erro ao carregar dados da despesa: ' + error.message, 'error');
    }
}

// Editar despesa
async function handleEditDespesa(e) {
    e.preventDefault();
    
    const id = document.getElementById('editDespesaId').value;
    const valorDespesa = parseFloat(document.getElementById('editValorDespesa').value);
    const dataDespesa = document.getElementById('editDataDespesa').value;
    const descricao = document.getElementById('editDescricaoDespesa').value;
    const errorElement = document.getElementById('editDespesaError');
    
    try {
        // Limpar erro anterior
        errorElement.classList.add('d-none');
        
        // Validar campos
        if (isNaN(valorDespesa) || valorDespesa <= 0 || !dataDespesa) {
            errorElement.textContent = 'Preencha todos os campos obrigatórios corretamente.';
            errorElement.classList.remove('d-none');
            return;
        }
        
        // Obter usuário atual para garantir que a atualização seja feita apenas em registros do usuário
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');
        
        // Atualizar despesa - removendo o campo origem_despesa que está causando o erro
        const { data, error } = await supabase
            .from('despesas')
            .update({
                valor_despesa: valorDespesa,
                data_despesa: dataDespesa,
                descricao: descricao
            })
            .eq('id', id)
            .eq('user_id', user.id); // Garantir que a despesa pertence ao usuário atual
        
        if (error) throw error;
        
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editDespesaModal'));
        if (modal) {
            modal.hide();
        } else {
            // Caso o modal não seja encontrado, fechar manualmente
            document.getElementById('editDespesaModal').classList.remove('show');
            document.body.classList.remove('modal-open');
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) backdrop.remove();
        }
        
        // Mostrar notificação
        showNotification('Despesa atualizada com sucesso!');
        
        // Recarregar despesas
        loadDespesas();
        
    } catch (error) {
        console.error('Erro ao editar despesa:', error);
        errorElement.textContent = 'Erro ao atualizar despesa: ' + error.message;
        errorElement.classList.remove('d-none');
    }
}

// Abrir modal de exclusão
function openDeleteModal(id) {
    document.getElementById('deleteDespesaId').value = id;
    const modal = new bootstrap.Modal(document.getElementById('deleteDespesaModal'));
    modal.show();
}

// Excluir despesa
async function handleDeleteDespesa() {
    const id = document.getElementById('deleteDespesaId').value;
    
    try {
        // Excluir despesa
        const { error } = await supabase
            .from('despesas')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteDespesaModal'));
        modal.hide();
        
        // Mostrar notificação
        showNotification('Despesa excluída com sucesso!');
        
        // Recarregar despesas
        loadDespesas();
        
    } catch (error) {
        console.error('Erro ao excluir despesa:', error);
        showNotification('Erro ao excluir despesa: ' + error.message, 'error');
    }
}

// Expor funções para uso global
window.openEditModal = openEditModal;
window.openDeleteModal = openDeleteModal;
