/**
 * Resumo Diário - Lógica para exibição do resumo financeiro diário
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
    document.getElementById('dataResumo').value = getCurrentDate();
    
    // Carregar resumo para a data atual
    carregarResumoDiario();
    
    // Configurar listeners de eventos
    setupEventListeners();
}

// Configurar listeners de eventos
function setupEventListeners() {
    // Botão de atualizar resumo
    const btnAtualizar = document.getElementById('btnAtualizarResumo');
    if (btnAtualizar) {
        btnAtualizar.addEventListener('click', carregarResumoDiario);
    }
}

// Carregar resumo diário
async function carregarResumoDiario() {
    try {
        // Obter data selecionada
        const dataSelecionada = document.getElementById('dataResumo').value;
        
        // Mostrar loader e esconder conteúdo
        document.getElementById('resumoLoader').classList.remove('d-none');
        document.getElementById('resumoContent').classList.add('d-none');
        document.getElementById('semDadosMsg').classList.add('d-none');
        
        // Obter usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');
        
        // Carregar dados do dia
        const dados = await carregarDadosDoDia(user.id, dataSelecionada);
        
        // Verificar se há dados
        if (!dados.temDados) {
            document.getElementById('resumoLoader').classList.add('d-none');
            document.getElementById('semDadosMsg').classList.remove('d-none');
            return;
        }
        
        // Preencher resumo com os dados
        preencherResumoDiario(dados);
        
        // Esconder loader e mostrar conteúdo
        document.getElementById('resumoLoader').classList.add('d-none');
        document.getElementById('resumoContent').classList.remove('d-none');
        
    } catch (error) {
        console.error('Erro ao carregar resumo diário:', error);
        showNotification('Erro ao carregar resumo diário: ' + error.message, 'error');
        
        document.getElementById('resumoLoader').classList.add('d-none');
        document.getElementById('semDadosMsg').classList.remove('d-none');
    }
}

// Carregar dados do dia
async function carregarDadosDoDia(userId, data) {
    try {
        // Executar queries em paralelo
        const [vistoriasResult, depositosResult, despesasResult] = await Promise.all([
            // Buscar vistorias do dia
            supabase
                .from('vistorias')
                .select('*')
                .eq('user_id', userId)
                .eq('data_vistoria', data),
                
            // Buscar depósitos do dia
            supabase
                .from('depositos')
                .select('*')
                .eq('user_id', userId)
                .eq('data_deposito', data),
                
            // Buscar despesas do dia
            supabase
                .from('despesas')
                .select('*')
                .eq('user_id', userId)
                .eq('data_despesa', data)
        ]);
        
        // Verificar erros
        if (vistoriasResult.error) throw vistoriasResult.error;
        if (depositosResult.error) throw depositosResult.error;
        if (despesasResult.error) throw despesasResult.error;
        
        // Verificar se há dados
        const vistorias = vistoriasResult.data || [];
        const depositos = depositosResult.data || [];
        const despesas = despesasResult.data || [];
        
        const temDados = vistorias.length > 0 || depositos.length > 0 || despesas.length > 0;
        
        // Calcular totais
        const totais = calcularTotais(vistorias, depositos, despesas);
        
        return {
            temDados,
            vistorias,
            depositos,
            despesas,
            totais
        };
        
    } catch (error) {
        console.error('Erro ao carregar dados do dia:', error);
        throw error;
    }
}

// Calcular totais
function calcularTotais(vistorias, depositos, despesas) {
    // Valores para cada tipo de veículo
    const precos = {
        carro: 230.00,
        moto: 190.00,
        caminhao: 280.00
    };
    
    // Contadores
    let totalPix = 0;
    let totalDinheiro = 0;
    let totalDepositado = 0;
    let totalDespesas = 0;
    let contadorCarros = 0;
    let contadorMotos = 0;
    let contadorCaminhoes = 0;
    
    // Processar vistorias
    vistorias.forEach(vistoria => {
        const valor = precos[vistoria.tipo_veiculo] || 0;
        
        // Contar por tipo de veículo
        if (vistoria.tipo_veiculo === 'carro') contadorCarros++;
        else if (vistoria.tipo_veiculo === 'moto') contadorMotos++;
        else if (vistoria.tipo_veiculo === 'caminhao') contadorCaminhoes++;
        
        // Calcular por método de pagamento
        if (vistoria.metodo_pagamento === 'PIX') {
            totalPix += valor;
        } else if (vistoria.metodo_pagamento === 'Dinheiro') {
            totalDinheiro += valor;
        } else if (vistoria.metodo_pagamento === 'Misto') {
            // Usar valores específicos se disponíveis, caso contrário dividir igualmente
            if (vistoria.valor_pix !== null && vistoria.valor_dinheiro !== null) {
                totalPix += parseFloat(vistoria.valor_pix || 0);
                totalDinheiro += parseFloat(vistoria.valor_dinheiro || 0);
            } else {
                // Dividir igualmente (compatibilidade com registros antigos)
                totalPix += valor / 2;
                totalDinheiro += valor / 2;
            }
        }
    });
    
    // Processar depósitos
    depositos.forEach(deposito => {
        totalDepositado += parseFloat(deposito.valor_depositado || 0);
    });
    
    // Processar despesas
    despesas.forEach(despesa => {
        totalDespesas += parseFloat(despesa.valor_despesa || 0);
    });
    
    // Calcular totais finais
    const totalDia = totalPix + totalDinheiro;
    const faltaDepositar = totalDinheiro - totalDepositado - totalDespesas;
    const lucroEstimado = totalDia - totalDespesas; // Novo: Cálculo do lucro estimado (PIX + Dinheiro - Despesas)
    
    // Calcular percentuais
    const percentualPix = totalDia > 0 ? (totalPix / totalDia) * 100 : 0;
    const percentualDinheiro = totalDia > 0 ? (totalDinheiro / totalDia) * 100 : 0;
    const percentualDepositado = totalDinheiro > 0 ? (totalDepositado / totalDinheiro) * 100 : 0;
    const percentualDespesas = totalDinheiro > 0 ? (totalDespesas / totalDinheiro) * 100 : 0;
    const percentualFaltaDepositar = totalDinheiro > 0 ? (faltaDepositar / totalDinheiro) * 100 : 0;
    
    return {
        totalDia,
        totalPix,
        totalDinheiro,
        lucroEstimado, // Novo: Adicionado lucro estimado
        totalDepositado,
        totalDespesas,
        faltaDepositar,
        percentualPix,
        percentualDinheiro,
        percentualDepositado,
        percentualDespesas,
        percentualFaltaDepositar,
        contadorCarros,
        contadorMotos,
        contadorCaminhoes,
        totalVistorias: vistorias.length,
        totalDepositos: depositos.length,
        totalDespesasCount: despesas.length
    };
}

// Preencher resumo diário
function preencherResumoDiario(dados) {
    const { totais, vistorias, depositos, despesas } = dados;
    
    // Preencher cards de resumo
    document.getElementById('totalDia').textContent = formatCurrency(totais.totalDia);
    document.getElementById('totalVistoriasInfo').textContent = `${totais.totalVistorias} vistoria${totais.totalVistorias !== 1 ? 's' : ''} realizada${totais.totalVistorias !== 1 ? 's' : ''}`;
    
    // Novo: Preencher lucro estimado e total de vistorias
    document.getElementById('lucroEstimado').textContent = formatCurrency(totais.lucroEstimado);
    document.getElementById('totalVistoriasCount').textContent = `${totais.totalVistorias} vistoria${totais.totalVistorias !== 1 ? 's' : ''}`;
    
    document.getElementById('totalPix').textContent = formatCurrency(totais.totalPix);
    document.getElementById('percentualPix').textContent = `${totais.percentualPix.toFixed(1)}% do total`;
    
    document.getElementById('totalDinheiro').textContent = formatCurrency(totais.totalDinheiro);
    document.getElementById('percentualDinheiro').textContent = `${totais.percentualDinheiro.toFixed(1)}% do total`;
    
    document.getElementById('totalDepositado').textContent = formatCurrency(totais.totalDepositado);
    document.getElementById('percentualDepositado').textContent = `${totais.percentualDepositado.toFixed(1)}% do dinheiro`;
    
    document.getElementById('totalDespesas').textContent = formatCurrency(totais.totalDespesas);
    document.getElementById('percentualDespesas').textContent = `${totais.percentualDespesas.toFixed(1)}% do dinheiro`;
    
    document.getElementById('faltaDepositar').textContent = formatCurrency(totais.faltaDepositar);
    document.getElementById('percentualFaltaDepositar').textContent = `${totais.percentualFaltaDepositar.toFixed(1)}% do dinheiro`;
    
    // Preencher badges
    document.getElementById('totalVistoriasBadge').textContent = totais.totalVistorias;
    document.getElementById('totalDepositosBadge').textContent = totais.totalDepositos;
    document.getElementById('totalDespesasBadge').textContent = totais.totalDespesasCount;
    
    // Gerar gráficos
    gerarGraficoReceitas(totais.totalPix, totais.totalDinheiro);
    gerarGraficoVistorias(totais.contadorCarros, totais.contadorMotos, totais.contadorCaminhoes);
    
    // Preencher tabelas de detalhamento
    preencherTabelaVistorias(vistorias);
    preencherTabelaDepositos(depositos);
    preencherTabelaDespesas(despesas);
}

// Gerar gráfico de receitas
function gerarGraficoReceitas(totalPix, totalDinheiro) {
    const ctx = document.getElementById('graficoReceitas').getContext('2d');
    
    // Destruir gráfico anterior se existir
    try {
        if (window.graficoReceitas && typeof window.graficoReceitas.destroy === 'function') {
            window.graficoReceitas.destroy();
        }
    } catch (error) {
        console.log('Erro ao destruir gráfico anterior:', error);
        // Continuar mesmo se houver erro
    }
    
    // Criar novo gráfico
    window.graficoReceitas = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['PIX', 'Dinheiro'],
            datasets: [{
                data: [totalPix, totalDinheiro],
                backgroundColor: ['#4CAF50', '#2196F3'],
                borderColor: ['#388E3C', '#1976D2'],
                borderWidth: 1,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Gerar gráfico de vistorias por tipo de veículo
function gerarGraficoVistorias(carros, motos, caminhoes) {
    const ctx = document.getElementById('graficoVistorias').getContext('2d');
    
    // Destruir gráfico anterior se existir
    try {
        if (window.graficoVistorias && typeof window.graficoVistorias.destroy === 'function') {
            window.graficoVistorias.destroy();
        }
    } catch (error) {
        console.log('Erro ao destruir gráfico anterior:', error);
        // Continuar mesmo se houver erro
    }
    
    // Criar novo gráfico
    window.graficoVistorias = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Carros', 'Motos', 'Caminhões'],
            datasets: [{
                label: 'Quantidade',
                data: [carros, motos, caminhoes],
                backgroundColor: ['#FF6600', '#9C27B0', '#607D8B'],
                borderColor: ['#E65100', '#7B1FA2', '#455A64'],
                borderWidth: 1,
                borderRadius: 6,
                maxBarThickness: 60
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        font: {
                            size: 12
                        }
                    },
                    grid: {
                        display: true,
                        drawBorder: false
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        font: {
                            size: 12
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw}`;
                        }
                    }
                }
            }
        }
    });
}

// Preencher tabela de vistorias
function preencherTabelaVistorias(vistorias) {
    const tableBody = document.getElementById('tabelaVistorias');
    const semVistoriasMsg = document.getElementById('semVistoriasMsg');
    
    if (!vistorias || vistorias.length === 0) {
        tableBody.innerHTML = '';
        semVistoriasMsg.classList.remove('d-none');
        return;
    }
    
    semVistoriasMsg.classList.add('d-none');
    
    // Valores para cada tipo de veículo
    const precos = {
        carro: 230.00,
        moto: 190.00,
        caminhao: 280.00
    };
    
    // Preencher tabela
    tableBody.innerHTML = vistorias.map(vistoria => {
        const valor = precos[vistoria.tipo_veiculo] || 0;
        const tipoFormatado = getTipoVeiculoFormatado(vistoria.tipo_veiculo);
        
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
                <td>${tipoFormatado}</td>
                <td>${formatCurrency(valor)}</td>
                <td>${vistoria.metodo_pagamento}</td>
                <td>${valorPix}</td>
                <td>${valorDinheiro}</td>
            </tr>
        `;
    }).join('');
}

// Preencher tabela de depósitos
function preencherTabelaDepositos(depositos) {
    const tableBody = document.getElementById('tabelaDepositos');
    const semDepositosMsg = document.getElementById('semDepositosMsg');
    
    if (!depositos || depositos.length === 0) {
        tableBody.innerHTML = '';
        semDepositosMsg.classList.remove('d-none');
        return;
    }
    
    semDepositosMsg.classList.add('d-none');
    
    // Preencher tabela
    tableBody.innerHTML = depositos.map(deposito => {
        return `
            <tr>
                <td>${formatCurrency(deposito.valor_depositado)}</td>
                <td>${deposito.descricao || '-'}</td>
            </tr>
        `;
    }).join('');
}

// Preencher tabela de despesas
function preencherTabelaDespesas(despesas) {
    const tableBody = document.getElementById('tabelaDespesas');
    const semDespesasMsg = document.getElementById('semDespesasMsg');
    
    if (!despesas || despesas.length === 0) {
        tableBody.innerHTML = '';
        semDespesasMsg.classList.remove('d-none');
        return;
    }
    
    semDespesasMsg.classList.add('d-none');
    
    // Preencher tabela
    tableBody.innerHTML = despesas.map(despesa => {
        return `
            <tr>
                <td>${formatCurrency(despesa.valor_despesa)}</td>
                <td>${despesa.descricao || '-'}</td>
            </tr>
        `;
    }).join('');
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
