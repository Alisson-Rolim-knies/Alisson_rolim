/**
 * Resumo Mensal - Lógica para exibição do resumo financeiro mensal
 */

document.addEventListener('DOMContentLoaded', async function () {
    // Verificar se o usuário está autenticado
    if (!(await requireAuth())) return;

    // Inicializar a página
    initPage();
});

// Inicializar a página
function initPage() {
    try {
        // Preencher seletores de mês e ano
        preencherSeletorAno();
        definirMesAnoAtual();

        // Carregar resumo para o mês atual
        carregarResumoMensal();

        // Configurar listeners de eventos
        setupEventListeners();
    } catch (error) {
        console.error("Erro ao inicializar página:", error);
        showNotification("Erro ao inicializar página: " + error.message, "error");
    }
}

// Preencher seletor de ano
function preencherSeletorAno() {
    try {
        const anoAtual = new Date().getFullYear();
        const seletorAno = document.getElementById('anoResumo');

        // Verificar se o elemento existe antes de manipular
        if (!seletorAno) {
            console.error('Elemento seletorAno não encontrado');
            return;
        }

        // Limpar opções existentes
        seletorAno.innerHTML = '';

        // Adicionar anos (atual e 5 anos anteriores)
        for (let i = 0; i < 6; i++) {
            const ano = anoAtual - i;
            const option = document.createElement('option');
            option.value = ano;
            option.textContent = ano;
            seletorAno.appendChild(option);
        }
    } catch (error) {
        console.error("Erro ao preencher seletor de ano:", error);
    }
}

// Definir mês e ano atual nos seletores
function definirMesAnoAtual() {
    try {
        const dataAtual = new Date();
        const mesAtual = (dataAtual.getMonth() + 1).toString().padStart(2, '0');
        const anoAtual = dataAtual.getFullYear();

        const mesResumoElement = document.getElementById('mesResumo');
        const anoResumoElement = document.getElementById('anoResumo');

        // Verificar se os elementos existem antes de manipular
        if (mesResumoElement) {
            mesResumoElement.value = mesAtual;
        } else {
            console.warn('Elemento mesResumo não encontrado');
        }

        if (anoResumoElement) {
            anoResumoElement.value = anoAtual;
        } else {
            console.warn('Elemento anoResumo não encontrado');
        }
    } catch (error) {
        console.error("Erro ao definir mês e ano atual:", error);
    }
}

// Configurar listeners de eventos
function setupEventListeners() {
    try {
        // Botão de atualizar resumo
        const btnAtualizar = document.getElementById('btnAtualizarResumo');
        if (btnAtualizar) {
            btnAtualizar.addEventListener('click', carregarResumoMensal);
        } else {
            console.warn('Elemento btnAtualizarResumo não encontrado');
        }
    } catch (error) {
        console.error("Erro ao configurar event listeners:", error);
    }
}

// Carregar resumo mensal
async function carregarResumoMensal() {
    try {
        // Obter mês e ano selecionados
        const mesResumoElement = document.getElementById('mesResumo');
        const anoResumoElement = document.getElementById('anoResumo');

        // Verificar se os elementos existem
        if (!mesResumoElement || !anoResumoElement) {
            throw new Error('Elementos de seleção de mês ou ano não encontrados');
        }

        const mesSelecionado = mesResumoElement.value;
        const anoSelecionado = anoResumoElement.value;

        // Elementos de UI
        const resumoLoaderElement = document.getElementById('resumoLoader');
        const resumoContentElement = document.getElementById('resumoContent');
        const semDadosMsgElement = document.getElementById('semDadosMsg');

        // Mostrar loader e esconder conteúdo (com verificação de existência)
        toggleElementDisplay(resumoLoaderElement, true);
        toggleElementDisplay(resumoContentElement, false);
        toggleElementDisplay(semDadosMsgElement, false);

        // Obter usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        // Carregar dados do mês
        const dados = await carregarDadosDoMes(user.id, mesSelecionado, anoSelecionado);

        // Verificar se há dados
        if (!dados.temDados) {
            toggleElementDisplay(resumoLoaderElement, false);
            toggleElementDisplay(semDadosMsgElement, true);
            return;
        }

        // Preencher resumo com os dados
        preencherResumoMensal(dados);

        // Esconder loader e mostrar conteúdo
        toggleElementDisplay(resumoLoaderElement, false);
        toggleElementDisplay(resumoContentElement, true);

    } catch (error) {
        console.error('Erro ao carregar resumo mensal:', error);
        showNotification('Erro ao carregar resumo mensal: ' + error.message, 'error');

        const resumoLoaderElement = document.getElementById('resumoLoader');
        const semDadosMsgElement = document.getElementById('semDadosMsg');

        toggleElementDisplay(resumoLoaderElement, false);
        toggleElementDisplay(semDadosMsgElement, true);
    }
}

// Função auxiliar para alternar a exibição de um elemento
function toggleElementDisplay(element, show) {
    if (!element) return;

    if (show) {
        element.classList.remove('d-none');
    } else {
        element.classList.add('d-none');
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
    try {
        // Criar data do primeiro dia do próximo mês e subtrair 1 dia
        const proximoMes = parseInt(mes) === 12 ? 1 : parseInt(mes) + 1;
        const anoProximoMes = parseInt(mes) === 12 ? parseInt(ano) + 1 : parseInt(ano);

        const primeiroDiaProximoMes = new Date(`${anoProximoMes}-${proximoMes.toString().padStart(2, '0')}-01`);
        const ultimoDiaMes = new Date(primeiroDiaProximoMes);
        ultimoDiaMes.setDate(ultimoDiaMes.getDate() - 1);

        return ultimoDiaMes.toISOString().split('T')[0];
    } catch (error) {
        console.error("Erro ao calcular último dia do mês:", error);
        throw error;
    }
}

// Calcular totais mensais
function calcularTotaisMensais(vistorias, depositos, despesas) {
    try {
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
    } catch (error) {
        console.error("Erro ao calcular totais mensais:", error);
        throw error;
    }
}

// Calcular evolução diária
function calcularEvolucaoDiaria(vistorias, ano, mes) {
    try {
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
    } catch (error) {
        console.error("Erro ao calcular evolução diária:", error);
        throw error;
    }
}

// Calcular resumo por tipo de veículo
function calcularResumoVeiculos(vistorias, diasComRegistro) {
    try {
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
    } catch (error) {
        console.error("Erro ao calcular resumo por tipo de veículo:", error);
        throw error;
    }
}

// Função auxiliar para atualizar o textContent de um elemento com segurança
function setTextContentSafely(elementId, text) {
    try {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        } else {
            console.warn(`Elemento com ID '${elementId}' não encontrado ao tentar definir textContent`);
        }
    } catch (error) {
        console.error(`Erro ao definir textContent para ${elementId}:`, error);
    }
}

// Preencher resumo mensal
function preencherResumoMensal(dados) {
    try {
        const { totais, resumoVeiculos, dadosEvolucaoDiaria, mes, ano } = dados;

        // Preencher cards de resumo com verificação de existência
        setTextContentSafely('totalMes', formatCurrency(totais.totalMes));
        setTextContentSafely('totalVistoriasInfo', `${totais.totalVistorias} vistoria${totais.totalVistorias !== 1 ? 's' : ''} realizada${totais.totalVistorias !== 1 ? 's' : ''}`);

        // Adicionar lucro estimado
        const lucroEstimado = totais.totalMes - totais.totalDespesas;
        setTextContentSafely('lucroEstimado', formatCurrency(lucroEstimado));
        setTextContentSafely('totalVistoriasCount', `${totais.totalVistorias} vistoria${totais.totalVistorias !== 1 ? 's' : ''}`);

        setTextContentSafely('totalPix', formatCurrency(totais.totalPix));
        setTextContentSafely('percentualPix', `${totais.percentualPix.toFixed(1)}% do total`);

        setTextContentSafely('totalDinheiro', formatCurrency(totais.totalDinheiro));
        setTextContentSafely('percentualDinheiro', `${totais.percentualDinheiro.toFixed(1)}% do total`);

        setTextContentSafely('totalDepositado', formatCurrency(totais.totalDepositado));
        setTextContentSafely('percentualDepositado', `${totais.percentualDepositado.toFixed(1)}% do dinheiro`);

        setTextContentSafely('totalDespesas', formatCurrency(totais.totalDespesas));
        setTextContentSafely('percentualDespesas', `${totais.percentualDespesas.toFixed(1)}% do dinheiro`);

        setTextContentSafely('faltaDepositar', formatCurrency(totais.faltaDepositar));
        setTextContentSafely('percentualFaltaDepositar', `${totais.percentualFaltaDepositar.toFixed(1)}% do dinheiro`);

        // Gerar gráficos - com verificação de existência do Chart.js
        if (typeof Chart !== 'undefined') {
            // Forçar a renderização dos gráficos após um pequeno atraso para garantir que o DOM esteja pronto
            setTimeout(() => {
                try {
                    console.log("Gerando gráfico de receitas com dados:", totais.totalPix, totais.totalDinheiro);
                    gerarGraficoReceitas(totais.totalPix, totais.totalDinheiro);
                    
                    console.log("Gerando gráfico de vistorias com dados:", totais.contadorCarros, totais.contadorMotos, totais.contadorCaminhoes);
                    gerarGraficoVistorias(totais.contadorCarros, totais.contadorMotos, totais.contadorCaminhoes);
                    
                    console.log("Gerando gráfico de evolução diária");
                    gerarGraficoEvolucaoDiaria(dadosEvolucaoDiaria, mes, ano);
                } catch (chartError) {
                    console.error("Erro ao renderizar gráficos:", chartError);
                    showNotification("Erro ao renderizar gráficos: " + chartError.message, "error");
                }
            }, 100);
        } else {
            console.error("Chart.js não está disponível. Os gráficos não serão gerados.");
            showNotification("Erro ao gerar gráficos: Chart.js não está disponível", "error");
        }

        // Preencher tabela de resumo por tipo de veículo
        preencherTabelaResumoVeiculos(resumoVeiculos);
    } catch (error) {
        console.error("Erro ao preencher resumo mensal:", error);
        showNotification("Erro ao preencher resumo mensal: " + error.message, "error");
    }
}

// Gerar gráfico de receitas
function gerarGraficoReceitas(totalPix, totalDinheiro) {
    try {
        console.log("Iniciando geração do gráfico de receitas com valores:", totalPix, totalDinheiro);
        
        const ctx = document.getElementById('graficoReceitas');
        if (!ctx) {
            console.warn('Elemento graficoReceitas não encontrado');
            return;
        }

        // Verificar se o contexto é válido para desenho
        if (!ctx.getContext) {
            console.error('Contexto de desenho não disponível para graficoReceitas');
            return;
        }

        // Destruir gráfico anterior se existir
        if (window.graficoReceitas) {
            console.log("Destruindo gráfico de receitas anterior");
            window.graficoReceitas.destroy();
        }

        // Garantir que há dados para mostrar
        if (totalPix === 0 && totalDinheiro === 0) {
            console.warn('Sem dados para mostrar no gráfico de receitas');
            // Criar um gráfico vazio com mensagem
            window.graficoReceitas = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['Sem dados'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#e0e0e0'],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: function () {
                                    return 'Sem dados para exibir';
                                }
                            }
                        }
                    }
                }
            });
            return;
        }

        // Criar o gráfico com dados
        window.graficoReceitas = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['PIX', 'Dinheiro'],
                datasets: [{
                    data: [totalPix, totalDinheiro],
                    backgroundColor: ['#4CAF50', '#2196F3'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error("Erro ao gerar gráfico de receitas:", error);
    }
}

// Gerar gráfico de vistorias
function gerarGraficoVistorias(carros, motos, caminhoes) {
    try {
        const ctx = document.getElementById('graficoVistorias');
        if (!ctx) {
            console.warn('Elemento graficoVistorias não encontrado');
            return;
        }

        // Verificar se o contexto é válido para desenho
        if (!ctx.getContext) {
            console.error('Contexto de desenho não disponível para graficoVistorias');
            return;
        }

        // Destruir gráfico anterior se existir
        if (window.graficoVistorias) {
            window.graficoVistorias.destroy();
        }

        // Garantir que há dados para mostrar
        if (carros === 0 && motos === 0 && caminhoes === 0) {
            console.warn('Sem dados para mostrar no gráfico de vistorias');
            // Criar um gráfico vazio com mensagem
            window.graficoVistorias = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['Sem dados'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#e0e0e0'],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: function () {
                                    return 'Sem dados para exibir';
                                }
                            }
                        }
                    }
                }
            });
            return;
        }

        // Criar o gráfico com dados
        window.graficoVistorias = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Carros', 'Motos', 'Caminhões'],
                datasets: [{
                    data: [carros, motos, caminhoes],
                    backgroundColor: ['#FF9800', '#9C27B0', '#F44336'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error("Erro ao gerar gráfico de vistorias:", error);
    }
}

// Gerar gráfico de evolução diária
function gerarGraficoEvolucaoDiaria(dados, mes, ano) {
    try {
        const ctx = document.getElementById('graficoEvolucaoDiaria');
        if (!ctx) {
            console.warn('Elemento graficoEvolucaoDiaria não encontrado');
            return;
        }

        // Verificar se o contexto é válido para desenho
        if (!ctx.getContext) {
            console.error('Contexto de desenho não disponível para graficoEvolucaoDiaria');
            return;
        }

        // Destruir gráfico anterior se existir
        if (window.graficoEvolucaoDiaria) {
            window.graficoEvolucaoDiaria.destroy();
        }

        // Verificar se há dados para mostrar
        const temDados = dados.dadosVistorias.some(valor => valor > 0);
        if (!temDados) {
            console.warn('Sem dados para mostrar no gráfico de evolução diária');
            // Criar um gráfico vazio com mensagem
            window.graficoEvolucaoDiaria = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Sem dados'],
                    datasets: [{
                        label: 'Sem dados para exibir',
                        data: [0],
                        backgroundColor: '#e0e0e0',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Sem dados disponíveis para o período selecionado'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            return;
        }

        // Formatar mês para exibição
        const nomeMes = new Date(ano, mes - 1, 1).toLocaleString('pt-BR', { month: 'long' });

        // Criar o gráfico com dados
        window.graficoEvolucaoDiaria = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dados.labels,
                datasets: [
                    {
                        label: 'Total',
                        data: dados.dadosVistorias,
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                        type: 'line',
                        fill: false,
                        tension: 0.4,
                        order: 0
                    },
                    {
                        label: 'PIX',
                        data: dados.dadosPix,
                        backgroundColor: 'rgba(76, 175, 80, 0.5)',
                        borderColor: 'rgba(76, 175, 80, 1)',
                        borderWidth: 1,
                        order: 1
                    },
                    {
                        label: 'Dinheiro',
                        data: dados.dadosDinheiro,
                        backgroundColor: 'rgba(33, 150, 243, 0.5)',
                        borderColor: 'rgba(33, 150, 243, 1)',
                        borderWidth: 1,
                        order: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 12
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: `Evolução diária - ${nomeMes} de ${ano}`,
                        font: {
                            size: 14
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.dataset.label || '';
                                const value = context.raw || 0;
                                return `${label}: ${formatCurrency(value)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Dia'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Valor (R$)'
                        },
                        ticks: {
                            callback: function (value) {
                                return formatCurrency(value);
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error("Erro ao gerar gráfico de evolução diária:", error);
    }
}

// Preencher tabela de resumo por tipo de veículo
function preencherTabelaResumoVeiculos(resumoVeiculos) {
    try {
        const tabelaBody = document.getElementById('tabelaResumoVeiculos');
        if (!tabelaBody) {
            console.warn('Elemento tabelaResumoVeiculos não encontrado');
            return;
        }

        // Limpar tabela
        tabelaBody.innerHTML = '';

        // Verificar se há dados para mostrar
        const temDados = Object.values(resumoVeiculos.resumo).some(item => item.quantidade > 0);
        if (!temDados) {
            // Adicionar linha de "sem dados"
            const rowSemDados = document.createElement('tr');
            const cellSemDados = document.createElement('td');
            cellSemDados.textContent = 'Sem dados para exibir';
            cellSemDados.colSpan = 5;
            cellSemDados.classList.add('text-center', 'text-muted');
            rowSemDados.appendChild(cellSemDados);
            tabelaBody.appendChild(rowSemDados);
            return;
        }

        // Mapear tipos para nomes amigáveis
        const tiposVeiculos = {
            carro: 'Carros',
            moto: 'Motos',
            caminhao: 'Caminhões'
        };

        // Adicionar linhas para cada tipo de veículo
        Object.keys(resumoVeiculos.resumo).forEach(tipo => {
            const dados = resumoVeiculos.resumo[tipo];

            // Pular tipos sem registros
            if (dados.quantidade === 0) return;

            const row = document.createElement('tr');

            // Tipo de veículo
            const cellTipo = document.createElement('td');
            cellTipo.textContent = tiposVeiculos[tipo] || tipo;
            row.appendChild(cellTipo);

            // Quantidade
            const cellQuantidade = document.createElement('td');
            cellQuantidade.textContent = dados.quantidade;
            cellQuantidade.classList.add('text-center');
            row.appendChild(cellQuantidade);

            // Valor total
            const cellValor = document.createElement('td');
            cellValor.textContent = formatCurrency(dados.valor);
            cellValor.classList.add('text-end');
            row.appendChild(cellValor);

            // Média diária
            const cellMedia = document.createElement('td');
            cellMedia.textContent = dados.mediaDiaria.toFixed(1);
            cellMedia.classList.add('text-center');
            row.appendChild(cellMedia);

            // Percentual
            const cellPercentual = document.createElement('td');
            cellPercentual.textContent = `${dados.percentual.toFixed(1)}%`;
            cellPercentual.classList.add('text-center');
            row.appendChild(cellPercentual);

            tabelaBody.appendChild(row);
        });

        // Adicionar linha de total
        const rowTotal = document.createElement('tr');
        rowTotal.classList.add('table-secondary', 'fw-bold');

        // Tipo (Total)
        const cellTipoTotal = document.createElement('td');
        cellTipoTotal.textContent = 'Total';
        rowTotal.appendChild(cellTipoTotal);

        // Quantidade total
        const totalQuantidade = Object.values(resumoVeiculos.resumo).reduce((total, item) => total + item.quantidade, 0);
        const cellQuantidadeTotal = document.createElement('td');
        cellQuantidadeTotal.textContent = totalQuantidade;
        cellQuantidadeTotal.classList.add('text-center');
        rowTotal.appendChild(cellQuantidadeTotal);

        // Valor total
        const cellValorTotal = document.createElement('td');
        cellValorTotal.textContent = formatCurrency(resumoVeiculos.totalGeral);
        cellValorTotal.classList.add('text-end');
        rowTotal.appendChild(cellValorTotal);

        // Média diária (vazio)
        const cellMediaTotal = document.createElement('td');
        cellMediaTotal.textContent = '-';
        cellMediaTotal.classList.add('text-center');
        rowTotal.appendChild(cellMediaTotal);

        // Percentual (100%)
        const cellPercentualTotal = document.createElement('td');
        cellPercentualTotal.textContent = '100%';
        cellPercentualTotal.classList.add('text-center');
        rowTotal.appendChild(cellPercentualTotal);

        tabelaBody.appendChild(rowTotal);
    } catch (error) {
        console.error("Erro ao preencher tabela de resumo por tipo de veículo:", error);
    }
}
