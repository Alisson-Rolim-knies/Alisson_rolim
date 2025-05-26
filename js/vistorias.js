/**
 * Vistorias.js - Lógica para gerenciamento de vistorias
 */

document.addEventListener('DOMContentLoaded', async function () {
    // Verificar se o usuário está autenticado
    if (!(await requireAuth())) return;

    // Inicializar a página
    initPage();
});

// Inicializar a página
function initPage() {
    // Definir data atual no campo de data
    document.getElementById('dataVistoria').value = getCurrentDate();

    // Carregar vistorias
    loadVistorias();

    // Configurar listeners de eventos
    setupEventListeners();
}

// Configurar listeners de eventos
function setupEventListeners() {
    // Form de adicionar vistoria
    const addForm = document.getElementById('addVistoriaForm');
    if (addForm) {
        addForm.addEventListener('submit', handleAddVistoria);
    }

    // Form de editar vistoria
    const editForm = document.getElementById('editVistoriaForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditVistoria);
    }

    // Botão de confirmar exclusão
    const deleteBtn = document.getElementById('confirmDeleteVistoria');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleDeleteVistoria);
    }

    // Form de filtro
    const filterForm = document.getElementById('filterForm');
    if (filterForm) {
        filterForm.addEventListener('submit', function (e) {
            e.preventDefault();
            loadVistorias();
        });
    }

    // Botão de limpar filtros
    const clearBtn = document.getElementById('btnClearFilters');
    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            document.getElementById('filterTipoVeiculo').value = '';
            document.getElementById('filterMetodoPagamento').value = '';
            document.getElementById('filterData').value = '';
            loadVistorias();
        });
    }

    // Mostrar/esconder campos de valores mistos ao selecionar método de pagamento
    const metodoPagamento = document.getElementById('metodoPagamento');
    if (metodoPagamento) {
        metodoPagamento.addEventListener('change', function () {
            const valoresMistoContainer = document.getElementById('valoresMistoContainer');
            if (this.value === 'Misto') {
                valoresMistoContainer.classList.remove('d-none');
                // Preencher valores iniciais
                atualizarValoresMisto();
            } else {
                valoresMistoContainer.classList.add('d-none');
            }
        });
    }

    // Atualizar valor total ao alterar valores de PIX ou Dinheiro
    const valorPix = document.getElementById('valorPix');
    const valorDinheiro = document.getElementById('valorDinheiro');
    if (valorPix && valorDinheiro) {
        valorPix.addEventListener('input', atualizarValoresMisto);
        valorDinheiro.addEventListener('input', atualizarValoresMisto);
    }

    // Mostrar/esconder campos de valores mistos ao selecionar método de pagamento (edição)
    const editMetodoPagamento = document.getElementById('editMetodoPagamento');
    if (editMetodoPagamento) {
        editMetodoPagamento.addEventListener('change', function () {
            const editValoresMistoContainer = document.getElementById('editValoresMistoContainer');
            if (this.value === 'Misto') {
                editValoresMistoContainer.classList.remove('d-none');
                // Preencher valores iniciais
                atualizarValoresMistoEdit();
            } else {
                editValoresMistoContainer.classList.add('d-none');
            }
        });
    }

    // Atualizar valor total ao alterar valores de PIX ou Dinheiro (edição)
    const editValorPix = document.getElementById('editValorPix');
    const editValorDinheiro = document.getElementById('editValorDinheiro');
    if (editValorPix && editValorDinheiro) {
        editValorPix.addEventListener('input', atualizarValoresMistoEdit);
        editValorDinheiro.addEventListener('input', atualizarValoresMistoEdit);
    }

    // Atualizar valores mistos ao selecionar tipo de veículo
    const tipoVeiculo = document.getElementById('tipoVeiculo');
    if (tipoVeiculo) {
        tipoVeiculo.addEventListener('change', function () {
            if (document.getElementById('metodoPagamento').value === 'Misto') {
                atualizarValoresMisto();
            }
        });
    }

    // Atualizar valores mistos ao selecionar tipo de veículo (edição)
    const editTipoVeiculo = document.getElementById('editTipoVeiculo');
    if (editTipoVeiculo) {
        editTipoVeiculo.addEventListener('change', function () {
            if (document.getElementById('editMetodoPagamento').value === 'Misto') {
                atualizarValoresMistoEdit();
            }
        });
    }
}

// Atualizar valores mistos e mostrar valor total
function atualizarValoresMisto() {
    const tipoVeiculo = document.getElementById('tipoVeiculo').value;
    const valorPix = parseFloat(document.getElementById('valorPix').value) || 0;
    const valorDinheiro = parseFloat(document.getElementById('valorDinheiro').value) || 0;
    const valorTotalInfo = document.getElementById('valorTotalInfo');

    // Valores para cada tipo de veículo
    const precos = {
        carro: 230.00,
        moto: 190.00,
        caminhao: 280.00
    };

    const valorTotal = precos[tipoVeiculo] || 0;
    const valorAtual = valorPix + valorDinheiro;

    // Atualizar informação de valor total
    valorTotalInfo.textContent = `Valor total: ${formatCurrency(valorAtual)} / Esperado: ${formatCurrency(valorTotal)}`;

    // Destacar se o valor não bate com o esperado
    if (valorTotal > 0 && Math.abs(valorTotal - valorAtual) > 0.01) {
        valorTotalInfo.parentElement.classList.remove('alert-info');
        valorTotalInfo.parentElement.classList.add('alert-warning');
    } else {
        valorTotalInfo.parentElement.classList.remove('alert-warning');
        valorTotalInfo.parentElement.classList.add('alert-info');
    }
}

// Atualizar valores mistos e mostrar valor total (edição)
function atualizarValoresMistoEdit() {
    const tipoVeiculo = document.getElementById('editTipoVeiculo').value;
    const valorPix = parseFloat(document.getElementById('editValorPix').value) || 0;
    const valorDinheiro = parseFloat(document.getElementById('editValorDinheiro').value) || 0;
    const valorTotalInfo = document.getElementById('editValorTotalInfo');

    // Valores para cada tipo de veículo
    const precos = {
        carro: 230.00,
        moto: 190.00,
        caminhao: 280.00
    };

    const valorTotal = precos[tipoVeiculo] || 0;
    const valorAtual = valorPix + valorDinheiro;

    // Atualizar informação de valor total
    valorTotalInfo.textContent = `Valor total: ${formatCurrency(valorAtual)} / Esperado: ${formatCurrency(valorTotal)}`;

    // Destacar se o valor não bate com o esperado
    if (valorTotal > 0 && Math.abs(valorTotal - valorAtual) > 0.01) {
        valorTotalInfo.parentElement.classList.remove('alert-info');
        valorTotalInfo.parentElement.classList.add('alert-warning');
    } else {
        valorTotalInfo.parentElement.classList.remove('alert-warning');
        valorTotalInfo.parentElement.classList.add('alert-info');
    }
}

// Carregar vistorias do Supabase
async function loadVistorias() {
    try {
        // Mostrar loader
        const tableBody = document.getElementById('vistoriasTableBody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    <div class="loader"></div>
                    <p>Carregando vistorias...</p>
                </td>
            </tr>
        `;

        // Obter usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        // Construir query
        let query = supabase
            .from('vistorias')
            .select('*')
            .eq('user_id', user.id)
            .order('data_vistoria', { ascending: false });

        // Aplicar filtros
        const tipoVeiculo = document.getElementById('filterTipoVeiculo').value;
        const metodoPagamento = document.getElementById('filterMetodoPagamento').value;
        const data = document.getElementById('filterData').value;

        if (tipoVeiculo) {
            query = query.eq('tipo_veiculo', tipoVeiculo);
        }

        if (metodoPagamento) {
            query = query.eq('metodo_pagamento', metodoPagamento);
        }

        if (data) {
            query = query.eq('data_vistoria', data);
        }

        // Executar query
        const { data: vistorias, error } = await query;

        if (error) throw error;

        // Verificar se há vistorias
        if (!vistorias || vistorias.length === 0) {
            document.getElementById('emptyMessage').classList.remove('d-none');
            tableBody.innerHTML = '';
            return;
        }

        // Esconder mensagem de vazio
        document.getElementById('emptyMessage').classList.add('d-none');

        // Valores para cada tipo de veículo
        const precos = {
            carro: 230.00,
            moto: 190.00,
            caminhao: 280.00,

        };

        // Renderizar vistorias
        tableBody.innerHTML = vistorias.map(vistoria => {
            const valor = precos[vistoria.tipo_veiculo] || 0;

            // Valores de PIX e Dinheiro
            let valorPix = '-';
            let valorDinheiro = '-';

            if (vistoria.metodo_pagamento === 'PIX') {
                valorPix = formatCurrency(valor);
                valorDinheiro = formatCurrency(0);
            } else if (vistoria.metodo_pagamento === 'Dinheiro') {
                valorPix = formatCurrency(0);
                valorDinheiro = formatCurrency(valor);
            } else if (vistoria.metodo_pagamento === 'Misto') {
                valorPix = formatCurrency(vistoria.valor_pix || valor / 2);
                valorDinheiro = formatCurrency(vistoria.valor_dinheiro || valor / 2);
            }

            return `
                <tr>
                    <td>${formatDate(vistoria.data_vistoria)}</td>
                    <td>${getTipoVeiculoFormatado(vistoria.tipo_veiculo)}</td>
                    <td>${formatCurrency(valor)}</td>
                    <td>${vistoria.metodo_pagamento}</td>
                    <td>${valorPix}</td>
                    <td>${valorDinheiro}</td>
                    <td>${vistoria.observacoes || '-'}</td>
                    <td class="table-actions">
                        <button class="btn btn-sm btn-primary" onclick="openEditModal('${vistoria.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="openDeleteModal('${vistoria.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Erro ao carregar vistorias:', error);
        showNotification('Erro ao carregar vistorias: ' + error.message, 'error');

        const tableBody = document.getElementById('vistoriasTableBody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-danger">
                    <i class="fas fa-exclamation-circle fa-2x mb-3"></i>
                    <p>Erro ao carregar vistorias. Tente novamente mais tarde.</p>
                </td>
            </tr>
        `;
    }
}

// Adicionar nova vistoria
async function handleAddVistoria(e) {
    e.preventDefault();

    const tipoVeiculo = document.getElementById('tipoVeiculo').value;
    const metodoPagamento = document.getElementById('metodoPagamento').value;
    const dataVistoria = document.getElementById('dataVistoria').value;
    const observacoes = document.getElementById('observacoes').value;
    const errorElement = document.getElementById('addVistoriaError');

    try {
        // Limpar erro anterior
        errorElement.classList.add('d-none');

        // Validar campos
        if (!tipoVeiculo || !metodoPagamento || !dataVistoria) {
            errorElement.textContent = 'Preencha todos os campos obrigatórios.';
            errorElement.classList.remove('d-none');
            return;
        }

        // Valores para cada tipo de veículo
        const precos = {
            carro: 230.00,
            moto: 190.00,
            caminhao: 280.00
        };

        // Preparar dados para inserção
        const vistoriaData = {
            user_id: (await supabase.auth.getUser()).data.user.id,
            tipo_veiculo: tipoVeiculo,
            metodo_pagamento: metodoPagamento,
            data_vistoria: dataVistoria,
            observacoes: observacoes,
            valor_pix: null,
            valor_dinheiro: null
        };

        // Adicionar valores de PIX e Dinheiro se for misto
        if (metodoPagamento === 'Misto') {
            const valorPix = parseFloat(document.getElementById('valorPix').value) || 0;
            const valorDinheiro = parseFloat(document.getElementById('valorDinheiro').value) || 0;
            const valorTotal = precos[tipoVeiculo] || 0;

            // Validar valores
            if (valorPix <= 0 || valorDinheiro <= 0) {
                errorElement.textContent = 'Para pagamento misto, informe os valores de PIX e Dinheiro.';
                errorElement.classList.remove('d-none');
                return;
            }

            // Verificar se o valor total está correto
            const valorAtual = valorPix + valorDinheiro;
            if (Math.abs(valorTotal - valorAtual) > 0.01) {
                errorElement.textContent = `A soma dos valores (${formatCurrency(valorAtual)}) deve ser igual ao valor da vistoria (${formatCurrency(valorTotal)}).`;
                errorElement.classList.remove('d-none');
                return;
            }

            vistoriaData.valor_pix = valorPix;
            vistoriaData.valor_dinheiro = valorDinheiro;
        } else if (metodoPagamento === 'PIX') {
            vistoriaData.valor_pix = precos[tipoVeiculo] || 0;
            vistoriaData.valor_dinheiro = 0;
        } else if (metodoPagamento === 'Dinheiro') {
            vistoriaData.valor_pix = 0;
            vistoriaData.valor_dinheiro = precos[tipoVeiculo] || 0;
        }

        // Inserir vistoria
        const { data, error } = await supabase
            .from('vistorias')
            .insert([vistoriaData]);

        if (error) throw error;

        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addVistoriaModal'));
        modal.hide();

        // Limpar formulário
        document.getElementById('addVistoriaForm').reset();
        document.getElementById('dataVistoria').value = getCurrentDate();
        document.getElementById('valoresMistoContainer').classList.add('d-none');

        // Mostrar notificação
        showNotification('Vistoria registrada com sucesso!');

        // Recarregar vistorias
        loadVistorias();

    } catch (error) {
        console.error('Erro ao adicionar vistoria:', error);
        errorElement.textContent = 'Erro ao adicionar vistoria: ' + error.message;
        errorElement.classList.remove('d-none');
    }
}

// Abrir modal de edição
async function openEditModal(id) {
    try {
        // Obter vistoria pelo ID
        const { data: vistoria, error } = await supabase
            .from('vistorias')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // Preencher formulário
        document.getElementById('editVistoriaId').value = vistoria.id;
        document.getElementById('editTipoVeiculo').value = vistoria.tipo_veiculo;
        document.getElementById('editMetodoPagamento').value = vistoria.metodo_pagamento;
        document.getElementById('editDataVistoria').value = vistoria.data_vistoria;
        document.getElementById('editObservacoes').value = vistoria.observacoes || '';

        // Mostrar/esconder campos de valores mistos
        const editValoresMistoContainer = document.getElementById('editValoresMistoContainer');
        if (vistoria.metodo_pagamento === 'Misto') {
            editValoresMistoContainer.classList.remove('d-none');

            // Preencher valores de PIX e Dinheiro
            document.getElementById('editValorPix').value = vistoria.valor_pix || '';
            document.getElementById('editValorDinheiro').value = vistoria.valor_dinheiro || '';

            // Atualizar informação de valor total
            atualizarValoresMistoEdit();
        } else {
            editValoresMistoContainer.classList.add('d-none');
        }

        // Abrir modal
        const modal = new bootstrap.Modal(document.getElementById('editVistoriaModal'));
        modal.show();

    } catch (error) {
        console.error('Erro ao abrir modal de edição:', error);
        showNotification('Erro ao carregar dados da vistoria: ' + error.message, 'error');
    }
}

// Editar vistoria
async function handleEditVistoria(e) {
    e.preventDefault();

    const id = document.getElementById('editVistoriaId').value;
    const tipoVeiculo = document.getElementById('editTipoVeiculo').value;
    const metodoPagamento = document.getElementById('editMetodoPagamento').value;
    const dataVistoria = document.getElementById('editDataVistoria').value;
    const observacoes = document.getElementById('editObservacoes').value;
    const errorElement = document.getElementById('editVistoriaError');

    try {
        // Limpar erro anterior
        errorElement.classList.add('d-none');

        // Validar campos
        if (!tipoVeiculo || !metodoPagamento || !dataVistoria) {
            errorElement.textContent = 'Preencha todos os campos obrigatórios.';
            errorElement.classList.remove('d-none');
            return;
        }

        // Valores para cada tipo de veículo
        const precos = {
            carro: 230.00,
            moto: 190.00,
            caminhao: 280.00
        };

        // Preparar dados para atualização
        const vistoriaData = {
            tipo_veiculo: tipoVeiculo,
            metodo_pagamento: metodoPagamento,
            data_vistoria: dataVistoria,
            observacoes: observacoes,
            valor_pix: null,
            valor_dinheiro: null
        };

        // Adicionar valores de PIX e Dinheiro se for misto
        if (metodoPagamento === 'Misto') {
            const valorPix = parseFloat(document.getElementById('editValorPix').value) || 0;
            const valorDinheiro = parseFloat(document.getElementById('editValorDinheiro').value) || 0;
            const valorTotal = precos[tipoVeiculo] || 0;

            // Validar valores
            if (valorPix <= 0 || valorDinheiro <= 0) {
                errorElement.textContent = 'Para pagamento misto, informe os valores de PIX e Dinheiro.';
                errorElement.classList.remove('d-none');
                return;
            }

            // Verificar se o valor total está correto
            const valorAtual = valorPix + valorDinheiro;
            if (Math.abs(valorTotal - valorAtual) > 0.01) {
                errorElement.textContent = `A soma dos valores (${formatCurrency(valorAtual)}) deve ser igual ao valor da vistoria (${formatCurrency(valorTotal)}).`;
                errorElement.classList.remove('d-none');
                return;
            }

            vistoriaData.valor_pix = valorPix;
            vistoriaData.valor_dinheiro = valorDinheiro;
        } else if (metodoPagamento === 'PIX') {
            vistoriaData.valor_pix = precos[tipoVeiculo] || 0;
            vistoriaData.valor_dinheiro = 0;
        } else if (metodoPagamento === 'Dinheiro') {
            vistoriaData.valor_pix = 0;
            vistoriaData.valor_dinheiro = precos[tipoVeiculo] || 0;
        }

        // Atualizar vistoria
        const { data, error } = await supabase
            .from('vistorias')
            .update(vistoriaData)
            .eq('id', id);

        if (error) throw error;

        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editVistoriaModal'));
        modal.hide();

        // Mostrar notificação
        showNotification('Vistoria atualizada com sucesso!');

        // Recarregar vistorias
        loadVistorias();

    } catch (error) {
        console.error('Erro ao editar vistoria:', error);
        errorElement.textContent = 'Erro ao editar vistoria: ' + error.message;
        errorElement.classList.remove('d-none');
    }
}

// Abrir modal de exclusão
function openDeleteModal(id) {
    document.getElementById('deleteVistoriaId').value = id;
    const modal = new bootstrap.Modal(document.getElementById('deleteVistoriaModal'));
    modal.show();
}

// Excluir vistoria
async function handleDeleteVistoria() {
    const id = document.getElementById('deleteVistoriaId').value;

    try {
        // Excluir vistoria
        const { error } = await supabase
            .from('vistorias')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteVistoriaModal'));
        modal.hide();

        // Mostrar notificação
        showNotification('Vistoria excluída com sucesso!');

        // Recarregar vistorias
        loadVistorias();

    } catch (error) {
        console.error('Erro ao excluir vistoria:', error);
        showNotification('Erro ao excluir vistoria: ' + error.message, 'error');
    }
}

// Obter nome formatado do tipo de veículo
function getTipoVeiculoFormatado(tipo) {
    const tipos = {
        carro: 'Carro',
        moto: 'Moto',
        caminhao: 'Caminhão'
    };

    return tipos[tipo] || tipo;
}
