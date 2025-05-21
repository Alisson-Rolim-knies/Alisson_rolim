/**
 * Resumo Mensal - Lógica para exibição do resumo financeiro mensal
 */

document.addEventListener('DOMContentLoaded', async function() {
    // Verificar se o usuário está autenticado
    if (!(await requireAuth())) return;
    
    // Inicializar a página
    initPage();
});

// Inicializar a página
function initPage() {
    // Preencher seletores de mês e ano
    preencherSeletorAno();
    definirMesAnoAtual();
    
    // Carregar resumo para o mês atual
    carregarResumoMensal();
    
    // Configurar listeners de eventos
    setupEventListeners();
}

// Preencher seletor de ano
function preencherSeletorAno() {
    const anoAtual = new Date().getFullYear();
    const seletorAno = document.getElementById('anoResumo');
    
    // Adicionar anos (atual e 5 anos anteriores)
    for (let i = 0; i < 6; i++) {
        const ano = anoAtual - i;
        const option = document.createElement('option');
        option.value = ano;
        option.textContent = ano;
        seletorAno.appendChild(option);
    }
}

// Definir mês e ano atual nos seletores
function definirMesAnoAtual() {
    const dataAtual = new Date();
    const mesAtual = (dataAtual.getMonth() + 1).toString().padStart(2, '0');
    const anoAtual = dataAtual.getFullYear();
    
    document.getElementById('mesResumo').value = mesAtual;
    document.getElementById('anoResumo').value = anoAtual;
}

// Configurar listeners de eventos
function setupEventListeners() {
    // Botão de atualizar resumo
    const btnAtualizar = document.getElementById('btnAtualizarResumo');
    if (btnAtualizar) {
        btnAtualizar.addEventListener('click', carregarResumoMensal);
    }
}

// Carregar resumo mensal
async function carregarResumoMensal() {
    try {
        // Obter mês e ano selecionados
        const mesSelecionado = document.getElementById('mesResumo').value;
        const anoSelecionado = document.getElementById('anoResumo').value;
        
        // Mostrar loader e esconder conteúdo
        document.getElementById('resumoLoader').classList.remove('d-none');
        document.getElementById('resumoContent').classList.add('d-none');
        document.getElementById('semDadosMsg').classList.add('d-none');
        
        // Obter usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');
        
        // Carregar dados do mês
        const dados = await carregarDadosDoMes(user.id, mesSelecionado, anoSelecionado);
        
        // Verificar se há dados
        if (!dados.temDados) {
            document.getElementById('resumoLoader').classList.add('d-none');
            document.getElementById('semDadosMsg').classList.remove('d-none');
            return;
        }
        
        // Preencher resumo com os dados
        preencherResumoMensal(dados);
        
        // Esconder loader e mostrar conteúdo
        document.getElementById('resumoLoader').classList.add('d-none');
        document.getElementById('resumoContent').classList.remove('d-none');
        
    } catch (error) {
        console.error('Erro ao carregar resumo mensal:', error);
        showNotification('Erro ao carregar resumo mensal: ' + error.message, 'error');
        
        document.getElementById('resumoLoader').classList.add('d-none');
        document.getElementById('semDadosMsg').classList.remove('d-none');
    }
}

// Carregar dados do mês
async function carregarDadosDoMes(userId, mes, ano) {
    try {
        // Calcular primeiro e último dia do mês
        const primeiroDia = `${ano}-${mes}-01`;
        const ultimoDia = calcularUltimoDiaDoMes(ano, mes);
        
        // Executar queries em paralelo
        const [vistoriasResult, depositosResult, despesasResult] = await Promise.all([
            // Buscar vistorias do mês
            supabase
                .from('vistorias')
                .select('*')
                .eq('user_id', userId)
                .gte('data_vistoria', primeiroDia)
                .lte('data_vistoria', ultimoDia),
                
            // Buscar depósitos do mês
            supabase
                .from('depositos')
                .select('*')
                .eq('user_id', userId)
                .gte('data_deposito', primeiroDia)
                .lte('data_deposito', ultimoDia),
                
            // Buscar despesas do mês
            supabase
                .from('despesas')
                .select('*')
                .eq('user_id', userId)
                .gte('data_despesa', primeiroDia)
                .lte('data_despesa', ultimoDia)
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
        const totais = calcularTotaisMensais(vistorias, depositos, despesas);
        
        // Calcular dados para evolução diária
        const dadosEvolucaoDiaria = calcularEvolucaoDiaria(vistorias, ano, mes);
        
        // Calcular resumo por tipo de veículo
        const resumoVeiculos = calcularResumoVeiculos(vistorias, dadosEvolucaoDiaria.diasComRegistro);
        
        return {
            temDados,
            vistorias,
            depositos,
            despesas,
            totais,
            dadosEvolucaoDiaria,
            resumoVeiculos,
            mes,
            ano
        };
        
    } catch (error) {
        console.error('Erro ao carregar dados do mês:', error);
        throw error;
    }
}

// Calcular último dia do mês
function calcularUltimoDiaDoMes(ano, mes) {
    // Criar data do primeiro dia do próximo mês e subtrair 1 dia
    const proximoMes = parseInt(mes) === 12 ? 1 : parseInt(mes) + 1;
    const anoProximoMes = parseInt(mes) === 12 ? parseInt(ano) + 1 : parseInt(ano);
    
    const primeiroDiaProximoMes = new Date(`${anoProximoMes}-${proximoMes.toString().padStart(2, '0')}-01`);
    const ultimoDiaMes = new Date(primeiroDiaProximoMes);
    ultimoDiaMes.setDate(ultimoDiaMes.getDate() - 1);
    
    return ultimoDiaMes.toISOString().split('T')[0];
}

// Calcular totais mensais
function calcularTotaisMensais(vistorias, depositos, despesas) {
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
    const totalMes = totalPix + totalDinheiro;
    const faltaDepositar = totalDinheiro - totalDepositado - totalDespesas;
    
    // Calcular percentuais
    const percentualPix = totalMes > 0 ? (totalPix / totalMes) * 100 : 0;
    const percentualDinheiro = totalMes > 0 ? (totalDinheiro / totalMes) * 100 : 0;
    const percentualDepositado = totalDinheiro > 0 ? (totalDepositado / totalDinheiro) * 100 : 0;
    const percentualDespesas = totalDinheiro > 0 ? (totalDespesas / totalDinheiro) * 100 : 0;
    const percentualFaltaDepositar = totalDinheiro > 0 ? (faltaDepositar / totalDinheiro) * 100 : 0;
    
    return {
        totalMes,
        totalPix,
        totalDinheiro,
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

// Calcular evolução diária
function calcularEvolucaoDiaria(vistorias, ano, mes) {
    // Valores para cada tipo de veículo
    const precos = {
        carro: 230.00,
        moto: 190.00,
        caminhao: 280.00
    };
    
    // Obter número de dias no mês
    const ultimoDia = new Date(ano, mes, 0).getDate();
    
    // Inicializar arrays para gráfico
    const labels = [];
    const dadosVistorias = [];
    const dadosPix = [];
    const dadosDinheiro = [];
    
    // Inicializar contadores por dia
    const valoresPorDia = {};
    const pixPorDia = {};
    const dinheiroPorDia = {};
    
    // Inicializar todos os dias do mês com zero
    for (let dia = 1; dia <= ultimoDia; dia++) {
        const diaFormatado = dia.toString().padStart(2, '0');
        const dataFormatada = `${ano}-${mes}-${diaFormatado}`;
        
        valoresPorDia[dataFormatada] = 0;
        pixPorDia[dataFormatada] = 0;
        dinheiroPorDia[dataFormatada] = 0;
    }
    
    // Processar vistorias
    vistorias.forEach(vistoria => {
        const data = vistoria.data_vistoria;
        const valor = precos[vistoria.tipo_veiculo] || 0;
        
        // Incrementar valor total do dia
        valoresPorDia[data] = (valoresPorDia[data] || 0) + valor;
        
        // Incrementar valores por método de pagamento
        if (vistoria.metodo_pagamento === 'PIX') {
            pixPorDia[data] = (pixPorDia[data] || 0) + valor;
        } else if (vistoria.metodo_pagamento === 'Dinheiro') {
            dinheiroPorDia[data] = (dinheiroPorDia[data] || 0) + valor;
        } else if (vistoria.metodo_pagamento === 'Misto') {
            // Usar valores específicos se disponíveis, caso contrário dividir igualmente
            if (vistoria.valor_pix !== null && vistoria.valor_dinheiro !== null) {
                pixPorDia[data] = (pixPorDia[data] || 0) + parseFloat(vistoria.valor_pix || 0);
                dinheiroPorDia[data] = (dinheiroPorDia[data] || 0) + parseFloat(vistoria.valor_dinheiro || 0);
            } else {
                // Dividir igualmente (compatibilidade com registros antigos)
                pixPorDia[data] = (pixPorDia[data] || 0) + (valor / 2);
                dinheiroPorDia[data] = (dinheiroPorDia[data] || 0) + (valor / 2);
            }
        }
    });
    
    // Contar dias com registro
    let diasComRegistro = 0;
    
    // Preencher arrays para gráfico
    for (let dia = 1; dia <= ultimoDia; dia++) {
        const diaFormatado = dia.toString().padStart(2, '0');
        const dataFormatada = `${ano}-${mes}-${diaFormatado}`;
        
        labels.push(diaFormatado);
        dadosVistorias.push(valoresPorDia[dataFormatada] || 0);
        dadosPix.push(pixPorDia[dataFormatada] || 0);
        dadosDinheiro.push(dinheiroPorDia[dataFormatada] || 0);
        
        // Contar dias com registro
        if (valoresPorDia[dataFormatada] > 0) {
            diasComRegistro++;
        }
    }
    
    return {
        labels,
        dadosVistorias,
        dadosPix,
        dadosDinheiro,
        diasComRegistro
    };
}

// Calcular resumo por tipo de veículo
function calcularResumoVeiculos(vistorias, diasComRegistro) {
    // Valores para cada tipo de veículo
    const precos = {
        carro: 230.00,
        moto: 190.00,
        caminhao: 280.00
    };
    
    // Inicializar contadores
    const resumo = {
        carro: { quantidade: 0, valor: 0 },
        moto: { quantidade: 0, valor: 0 },
        caminhao: { quantidade: 0, valor: 0 }
    };
    
    // Processar vistorias
    vistorias.forEach(vistoria => {
        const tipo = vistoria.tipo_veiculo;
        const valor = precos[tipo] || 0;
        
        if (resumo[tipo]) {
            resumo[tipo].quantidade++;
            resumo[tipo].valor += valor;
        }
    });
    
    // Calcular total geral
    const totalGeral = Object.values(resumo).reduce((total, item) => total + item.valor, 0);
    
    // Calcular médias e percentuais
    Object.keys(resumo).forEach(tipo => {
        resumo[tipo].mediaDiaria = diasComRegistro > 0 ? resumo[tipo].quantidade / diasComRegistro : 0;
        resumo[tipo].percentual = totalGeral > 0 ? (resumo[tipo].valor / totalGeral) * 100 : 0;
    });
    
    return {
        resumo,
        totalGeral
    };
}

// Preencher resumo mensal
function preencherResumoMensal(dados) {
    const { totais, resumoVeiculos, dadosEvolucaoDiaria, mes, ano } = dados;
    
    // Preencher cards de resumo
    document.getElementById('totalMes').textContent = formatCurrency(totais.totalMes);
    document.getElementById('totalVistoriasInfo').textContent = `${totais.totalVistorias} vistoria${totais.totalVistorias !== 1 ? 's' : ''} realizada${totais.totalVistorias !== 1 ? 's' : ''}`;
    
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
    
    // Gerar gráficos
    gerarGraficoReceitas(totais.totalPix, totais.totalDinheiro);
    gerarGraficoVistorias(totais.contadorCarros, totais.contadorMotos, totais.contadorCaminhoes);
    gerarGraficoEvolucaoDiaria(dadosEvolucaoDiaria, mes, ano);
    
    // Preencher tabela de resumo por tipo de veículo
    preencherTabelaResumoVeiculos(resumoVeiculos);
}

// Gerar gráfico de receitas
function gerarGraficoReceitas(totalPix, totalDinheiro) {
    const ctx = document.getElementById('graficoReceitas').getContext('2d');
    
    // Destruir gráfico anterior se existir
    if (window.graficoReceitas && typeof window.graficoReceitas.destroy === 'function') {
        window.graficoReceitas.destroy();
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
    if (window.graficoVistorias && typeof window.graficoVistorias.destroy === 'function') {
        window.graficoVistorias.destroy();
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

// Gerar gráfico de evolução diária
function gerarGraficoEvolucaoDiaria(dados, mes, ano) {
    const ctx = document.getElementById('graficoEvolucaoDiaria').getContext('2d');
    
    // Destruir gráfico anterior se existir
    if (window.graficoEvolucaoDiaria && typeof window.graficoEvolucaoDiaria.destroy === 'function') {
        window.graficoEvolucaoDiaria.destroy();
    }
    
    // Obter nome do mês
    const nomeMes = new Date(`${ano}-${mes}-01`).toLocaleString('pt-BR', { month: 'long' });
    
    // Criar novo gráfico
    window.graficoEvolucaoDiaria = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dados.labels,
            datasets: [
                {
                    label: 'Total',
                    data: dados.dadosVistorias,
                    backgroundColor: 'rgba(255, 102, 0, 0.2)',
                    borderColor: 'rgba(255, 102, 0, 1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 5
                },
                {
                    label: 'PIX',
                    data: dados.dadosPix,
                    backgroundColor: 'rgba(76, 175, 80, 0.2)',
                    borderColor: 'rgba(76, 175, 80, 1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 5
                },
                {
                    label: 'Dinheiro',
                    data: dados.dadosDinheiro,
                    backgroundColor: 'rgba(33, 150, 243, 0.2)',
                    borderColor: 'rgba(33, 150, 243, 1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        },
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
                    position: 'top',
                    labels: {
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                        },
                        title: function(context) {
                            return `Dia ${context[0].label} de ${nomeMes}`;
                        }
                    }
                }
            }
        }
    });
}

// Preencher tabela de resumo por tipo de veículo
function preencherTabelaResumoVeiculos(resumoVeiculos) {
    const tableBody = document.getElementById('tabelaResumoVeiculos');
    const { resumo, totalGeral } = resumoVeiculos;
    
    // Mapear tipos para nomes formatados
    const tiposFormatados = {
        carro: 'Carros',
        moto: 'Motos',
        caminhao: 'Caminhões'
    };
    
    // Preencher tabela
    tableBody.innerHTML = Object.keys(resumo).map(tipo => {
        const item = resumo[tipo];
        return `
            <tr>
                <td>${tiposFormatados[tipo] || tipo}</td>
                <td>${item.quantidade}</td>
                <td>${formatCurrency(item.valor)}</td>
                <td>${item.percentual.toFixed(1)}%</td>
                <td>${item.mediaDiaria.toFixed(1)}</td>
            </tr>
        `;
    }).join('');
    
    // Preencher linha de total
    document.getElementById('tabelaResumoTotal').textContent = formatCurrency(totalGeral);
}
