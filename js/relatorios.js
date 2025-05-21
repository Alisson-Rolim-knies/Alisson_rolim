/**
 * Relatorios.js - Lógica para geração e exportação de relatórios
 */

document.addEventListener('DOMContentLoaded', async function() {
    // Verificar se o usuário está autenticado
    if (!(await requireAuth())) return;
    
    // Inicializar a página
    initPage();
});

// Inicializar a página
function initPage() {
    // Definir data atual nos campos de data
    document.getElementById('dataRelatorio').value = getCurrentDate();
    
    const dataAtual = new Date();
    const anoMes = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('mesRelatorio').value = anoMes;
    
    // Configurar listeners de eventos
    setupEventListeners();
    
    // Gerar relatório inicial
    gerarRelatorio();
}

// Configurar listeners de eventos
function setupEventListeners() {
    // Alternar entre relatório diário e mensal
    document.getElementById('relatorioDiario').addEventListener('change', function() {
        document.getElementById('dataDiariaContainer').classList.remove('d-none');
        document.getElementById('dataMensalContainer').classList.add('d-none');
    });
    
    document.getElementById('relatorioMensal').addEventListener('change', function() {
        document.getElementById('dataDiariaContainer').classList.add('d-none');
        document.getElementById('dataMensalContainer').classList.remove('d-none');
    });
    
    // Botão de gerar relatório
    document.getElementById('btnGerarRelatorio').addEventListener('click', gerarRelatorio);
    
    // Botão de exportar PDF
    document.getElementById('btnExportarPDF').addEventListener('click', exportarPDF);
}

// Gerar relatório
async function gerarRelatorio() {
    try {
        // Mostrar loader
        document.getElementById('relatorioLoader').classList.remove('d-none');
        document.getElementById('relatorioData').classList.add('d-none');
        document.getElementById('relatorioEmpty').classList.add('d-none');
        
        // Obter tipo de relatório e período
        const tipoRelatorio = document.querySelector('input[name="tipoRelatorio"]:checked').value;
        let periodo = {};
        
        if (tipoRelatorio === 'diario') {
            const data = document.getElementById('dataRelatorio').value;
            periodo = { data, tipo: 'diario' };
            document.getElementById('relatorioPeriodo').textContent = `Período: ${formatDate(data)}`;
        } else {
            const mesAno = document.getElementById('mesRelatorio').value;
            const [ano, mes] = mesAno.split('-');
            const dataInicio = `${ano}-${mes}-01`;
            
            // Calcular último dia do mês
            const ultimoDia = new Date(ano, mes, 0).getDate();
            const dataFim = `${ano}-${mes}-${ultimoDia}`;
            
            periodo = { dataInicio, dataFim, tipo: 'mensal' };
            
            // Formatar nome do mês
            const nomeMes = new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'long' });
            document.getElementById('relatorioPeriodo').textContent = `Período: ${nomeMes} de ${ano}`;
        }
        
        // Carregar dados do relatório
        const dados = await carregarDadosRelatorio(periodo);
        
        // Verificar se há dados
        if (!dados || (dados.vistorias.length === 0 && dados.depositos.length === 0 && dados.despesas.length === 0)) {
            document.getElementById('relatorioLoader').classList.add('d-none');
            document.getElementById('relatorioEmpty').classList.remove('d-none');
            return;
        }
        
        // Preencher relatório
        preencherRelatorio(dados);
        
        // Mostrar relatório
        document.getElementById('relatorioLoader').classList.add('d-none');
        document.getElementById('relatorioData').classList.remove('d-none');
        
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        showNotification('Erro ao gerar relatório: ' + error.message, 'error');
        
        document.getElementById('relatorioLoader').classList.add('d-none');
        document.getElementById('relatorioEmpty').classList.remove('d-none');
    }
}

// Carregar dados do relatório
async function carregarDadosRelatorio(periodo) {
    try {
        // Obter usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');
        
        // Construir queries
        let queryVistorias, queryDepositos, queryDespesas;
        
        if (periodo.tipo === 'diario') {
            // Queries para relatório diário
            // Corrigido para garantir que a comparação de data funcione corretamente
            const dataInicio = periodo.data;
            const dataFim = periodo.data;
            
            queryVistorias = supabase
                .from('vistorias')
                .select('*')
                .eq('user_id', user.id)
                .gte('data_vistoria', dataInicio)
                .lte('data_vistoria', dataFim);
                
            queryDepositos = supabase
                .from('depositos')
                .select('*')
                .eq('user_id', user.id)
                .gte('data_deposito', dataInicio)
                .lte('data_deposito', dataFim);
                
            queryDespesas = supabase
                .from('despesas')
                .select('*')
                .eq('user_id', user.id)
                .gte('data_despesa', dataInicio)
                .lte('data_despesa', dataFim);
        } else {
            // Queries para relatório mensal
            queryVistorias = supabase
                .from('vistorias')
                .select('*')
                .eq('user_id', user.id)
                .gte('data_vistoria', periodo.dataInicio)
                .lte('data_vistoria', periodo.dataFim);
                
            queryDepositos = supabase
                .from('depositos')
                .select('*')
                .eq('user_id', user.id)
                .gte('data_deposito', periodo.dataInicio)
                .lte('data_deposito', periodo.dataFim);
                
            queryDespesas = supabase
                .from('despesas')
                .select('*')
                .eq('user_id', user.id)
                .gte('data_despesa', periodo.dataInicio)
                .lte('data_despesa', periodo.dataFim);
        }
        
        // Executar queries em paralelo
        const [vistoriasResult, depositosResult, despesasResult] = await Promise.all([
            queryVistorias,
            queryDepositos,
            queryDespesas
        ]);
        
        // Verificar erros
        if (vistoriasResult.error) throw vistoriasResult.error;
        if (depositosResult.error) throw depositosResult.error;
        if (despesasResult.error) throw despesasResult.error;
        
        // Retornar dados
        return {
            vistorias: vistoriasResult.data || [],
            depositos: depositosResult.data || [],
            despesas: despesasResult.data || []
        };
        
    } catch (error) {
        console.error('Erro ao carregar dados do relatório:', error);
        throw error;
    }
}

// Preencher relatório com os dados
function preencherRelatorio(dados) {
    try {
        // Valores para cada tipo de veículo
        const precos = {
            carro: 230.00,
            moto: 190.00,
            caminhao: 280.00
        };
        
        // Calcular totais
        let totalPix = 0;
        let totalDinheiro = 0;
        let totalDepositado = 0;
        let totalDespesas = 0;
        
        // Contadores para gráficos
        let contadorCarros = 0;
        let contadorMotos = 0;
        let contadorCaminhoes = 0;
        
        // Processar vistorias
        dados.vistorias.forEach(vistoria => {
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
        dados.depositos.forEach(deposito => {
            totalDepositado += parseFloat(deposito.valor_depositado || 0);
        });
        
        // Processar despesas
        dados.despesas.forEach(despesa => {
            totalDespesas += parseFloat(despesa.valor_despesa || 0);
        });
        
        // Calcular totais finais
        const totalPeriodo = totalPix + totalDinheiro;
        const faltaDepositar = totalDinheiro - totalDepositado - totalDespesas;
        
        // Atualizar resumo financeiro
        document.getElementById('relatorioTotalPix').textContent = formatCurrency(totalPix);
        document.getElementById('relatorioTotalDinheiro').textContent = formatCurrency(totalDinheiro);
        document.getElementById('relatorioTotalDepositado').textContent = formatCurrency(totalDepositado);
        document.getElementById('relatorioTotalDespesas').textContent = formatCurrency(totalDespesas);
        document.getElementById('relatorioTotalPeriodo').textContent = formatCurrency(totalPeriodo);
        document.getElementById('relatorioFaltaDepositar').textContent = formatCurrency(faltaDepositar);
        
        // Preencher tabelas de detalhamento
        preencherTabelaVistorias(dados.vistorias, precos);
        preencherTabelaDepositos(dados.depositos);
        preencherTabelaDespesas(dados.despesas);
        
        // Gerar gráficos
        gerarGraficoReceitas(totalPix, totalDinheiro);
        gerarGraficoVistorias(contadorCarros, contadorMotos, contadorCaminhoes);
        
    } catch (error) {
        console.error('Erro ao preencher relatório:', error);
        throw error;
    }
}

// Preencher tabela de vistorias
function preencherTabelaVistorias(vistorias, precos) {
    const tableBody = document.getElementById('tabelaVistorias');
    
    if (!vistorias || vistorias.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">Nenhuma vistoria encontrada no período.</td>
            </tr>
        `;
        return;
    }
    
    // Ordenar vistorias por data (mais recente primeiro)
    vistorias.sort((a, b) => new Date(b.data_vistoria) - new Date(a.data_vistoria));
    
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
            // Usar valores específicos se disponíveis, caso contrário dividir igualmente
            if (vistoria.valor_pix !== null && vistoria.valor_dinheiro !== null) {
                valorPix = formatCurrency(vistoria.valor_pix);
                valorDinheiro = formatCurrency(vistoria.valor_dinheiro);
            } else {
                // Dividir igualmente (compatibilidade com registros antigos)
                valorPix = formatCurrency(valor / 2);
                valorDinheiro = formatCurrency(valor / 2);
            }
        }
        
        return `
            <tr>
                <td>${formatDate(vistoria.data_vistoria)}</td>
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
    
    if (!depositos || depositos.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center">Nenhum depósito encontrado no período.</td>
            </tr>
        `;
        return;
    }
    
    // Ordenar depósitos por data (mais recente primeiro)
    depositos.sort((a, b) => new Date(b.data_deposito) - new Date(a.data_deposito));
    
    // Preencher tabela
    tableBody.innerHTML = depositos.map(deposito => {
        return `
            <tr>
                <td>${formatDate(deposito.data_deposito)}</td>
                <td>${formatCurrency(deposito.valor_depositado)}</td>
                <td>${deposito.descricao || '-'}</td>
            </tr>
        `;
    }).join('');
}

// Preencher tabela de despesas
function preencherTabelaDespesas(despesas) {
    const tableBody = document.getElementById('tabelaDespesas');
    
    if (!despesas || despesas.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center">Nenhuma despesa encontrada no período.</td>
            </tr>
        `;
        return;
    }
    
    // Ordenar despesas por data (mais recente primeiro)
    despesas.sort((a, b) => new Date(b.data_despesa) - new Date(a.data_despesa));
    
    // Preencher tabela
    tableBody.innerHTML = despesas.map(despesa => {
        return `
            <tr>
                <td>${formatDate(despesa.data_despesa)}</td>
                <td>${formatCurrency(despesa.valor_despesa)}</td>
                <td>${despesa.descricao || '-'}</td>
            </tr>
        `;
    }).join('');
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
                backgroundColor: ['#FF9800', '#9C27B0', '#F44336'],
                borderColor: ['#F57C00', '#7B1FA2', '#D32F2F'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
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
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${context.label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Exportar relatório para PDF
async function exportarPDF() {
    try {
        // Mostrar notificação
        showNotification('Gerando PDF, aguarde...');
        
        // Obter elemento do relatório
        const relatorioElement = document.getElementById('relatorioContent');
        
        // Remover botão de exportar temporariamente
        const btnExportar = document.getElementById('btnExportarPDF');
        const btnParent = btnExportar.parentNode;
        btnParent.removeChild(btnExportar);
        
        // Importar jsPDF
        const { jsPDF } = window.jspdf;
        
        // Criar instância do PDF
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        // Capturar elemento como imagem
        const canvas = await html2canvas(relatorioElement, {
            scale: 2,
            useCORS: true,
            logging: false
        });
        
        // Obter dados da imagem
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        // Calcular dimensões
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 295; // A4 height in mm
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;
        
        // Adicionar primeira página
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        // Adicionar páginas adicionais se necessário
        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        // Obter período do relatório
        const periodo = document.getElementById('relatorioPeriodo').textContent.replace('Período: ', '');
        
        // Salvar PDF
        pdf.save(`Relatório Financeiro - ${periodo}.pdf`);
        
        // Restaurar botão de exportar
        btnParent.appendChild(btnExportar);
        
        // Mostrar notificação de sucesso
        showNotification('PDF gerado com sucesso!');
        
    } catch (error) {
        console.error('Erro ao exportar PDF:', error);
        showNotification('Erro ao exportar PDF: ' + error.message, 'error');
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
