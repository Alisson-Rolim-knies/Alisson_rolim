/**
 * Dashboard.js - Lógica para o dashboard na página inicial
 */

document.addEventListener('DOMContentLoaded', async function() {
    // Verificar autenticação antes de carregar o dashboard
    const isAuthenticated = await updateUIAuth();
    
    if (isAuthenticated) {
        loadDashboardData();
    }
});

// Função para carregar os dados do dashboard
async function loadDashboardData() {
    try {
        // Obter a data atual
        const today = getCurrentDate();
        
        // Carregar contagens
        await loadCounts();
        
        // Carregar resumo financeiro do dia
        await loadFinancialSummary(today);
        
        // Carregar resumo financeiro do mês
        await loadMonthlyFinancialSummary();
    } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        showNotification('Erro ao carregar dados do dashboard', 'error');
    }
}

// Função para carregar contagens de vistorias, depósitos e despesas
async function loadCounts() {
    try {
        // Obter usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Contar vistorias
        const { count: vistoriasCount, error: vistoriasError } = await supabase
            .from('vistorias')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
            
        if (vistoriasError) throw vistoriasError;
        
        // Contar depósitos
        const { count: depositosCount, error: depositosError } = await supabase
            .from('depositos')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
            
        if (depositosError) throw depositosError;
        
        // Contar despesas
        const { count: despesasCount, error: despesasError } = await supabase
            .from('despesas')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
            
        if (despesasError) throw despesasError;
        
        // Atualizar a UI
        document.getElementById('dashboardVistorias').textContent = `${vistoriasCount || 0} registros`;
        document.getElementById('dashboardDepositos').textContent = `${depositosCount || 0} registros`;
        document.getElementById('dashboardDespesas').textContent = `${despesasCount || 0} registros`;
        
    } catch (error) {
        console.error('Erro ao carregar contagens:', error);
        document.getElementById('dashboardVistorias').textContent = 'Erro ao carregar';
        document.getElementById('dashboardDepositos').textContent = 'Erro ao carregar';
        document.getElementById('dashboardDespesas').textContent = 'Erro ao carregar';
    }
}

// Função para carregar o resumo financeiro do dia
async function loadFinancialSummary(date) {
    try {
        // Obter usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Valores para cálculos
        const precos = {
            carro: 230.00,
            moto: 190.00,
            caminhao: 280.00
        };
        
        // Buscar vistorias do dia
        const { data: vistorias, error: vistoriasError } = await supabase
            .from('vistorias')
            .select('*')
            .eq('user_id', user.id)
            .eq('data_vistoria', date);
            
        if (vistoriasError) throw vistoriasError;
        
        // Calcular valores por método de pagamento
        let totalPix = 0;
        let totalDinheiro = 0;
        
        if (vistorias && vistorias.length > 0) {
            vistorias.forEach(vistoria => {
                const valor = precos[vistoria.tipo_veiculo] || 0;
                
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
        }
        
        // Buscar depósitos do dia
        const { data: depositos, error: depositosError } = await supabase
            .from('depositos')
            .select('*')
            .eq('user_id', user.id)
            .eq('data_deposito', date);
            
        if (depositosError) throw depositosError;
        
        // Calcular total depositado
        let totalDepositado = 0;
        if (depositos && depositos.length > 0) {
            totalDepositado = depositos.reduce((sum, deposito) => sum + parseFloat(deposito.valor_depositado || 0), 0);
        }
        
        // Buscar despesas do dia
        const { data: despesas, error: despesasError } = await supabase
            .from('despesas')
            .select('*')
            .eq('user_id', user.id)
            .eq('data_despesa', date);
            
        if (despesasError) throw despesasError;
        
        // Calcular total de despesas
        let totalDespesas = 0;
        if (despesas && despesas.length > 0) {
            totalDespesas = despesas.reduce((sum, despesa) => sum + parseFloat(despesa.valor_despesa || 0), 0);
        }
        
        // Calcular totais
        const totalDia = totalPix + totalDinheiro;
        const faltaDepositar = totalDinheiro - totalDepositado - totalDespesas;
        
        // Atualizar a UI
        document.getElementById('resumoPix').textContent = formatCurrency(totalPix);
        document.getElementById('resumoDinheiro').textContent = formatCurrency(totalDinheiro);
        document.getElementById('resumoDepositado').textContent = formatCurrency(totalDepositado);
        document.getElementById('resumoDespesas').textContent = formatCurrency(totalDespesas);
        document.getElementById('resumoTotal').textContent = formatCurrency(totalDia);
        document.getElementById('resumoFaltaDepositar').textContent = formatCurrency(faltaDepositar);
        document.getElementById('resumoVistoriasHoje').textContent = vistorias ? vistorias.length : 0;
        
    } catch (error) {
        console.error('Erro ao carregar resumo financeiro:', error);
        showNotification('Erro ao carregar resumo financeiro', 'error');
    }
}

// Função para carregar o resumo financeiro do mês
async function loadMonthlyFinancialSummary() {
    try {
        // Obter usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Valores para cálculos
        const precos = {
            carro: 230.00,
            moto: 190.00,
            caminhao: 280.00
        };
        
        // Calcular primeiro e último dia do mês atual
        const dataAtual = new Date();
        const anoAtual = dataAtual.getFullYear();
        const mesAtual = dataAtual.getMonth() + 1; // Janeiro é 0
        
        const primeiroDiaMes = `${anoAtual}-${mesAtual.toString().padStart(2, '0')}-01`;
        
        // Calcular último dia do mês
        const ultimoDiaMes = new Date(anoAtual, mesAtual, 0).getDate();
        const ultimoDiaMesFormatado = `${anoAtual}-${mesAtual.toString().padStart(2, '0')}-${ultimoDiaMes}`;
        
        // Buscar vistorias do mês
        const { data: vistorias, error: vistoriasError } = await supabase
            .from('vistorias')
            .select('*')
            .eq('user_id', user.id)
            .gte('data_vistoria', primeiroDiaMes)
            .lte('data_vistoria', ultimoDiaMesFormatado);
            
        if (vistoriasError) throw vistoriasError;
        
        // Calcular valores por método de pagamento
        let totalPix = 0;
        let totalDinheiro = 0;
        
        if (vistorias && vistorias.length > 0) {
            vistorias.forEach(vistoria => {
                const valor = precos[vistoria.tipo_veiculo] || 0;
                
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
        }
        
        // Buscar depósitos do mês
        const { data: depositos, error: depositosError } = await supabase
            .from('depositos')
            .select('*')
            .eq('user_id', user.id)
            .gte('data_deposito', primeiroDiaMes)
            .lte('data_deposito', ultimoDiaMesFormatado);
            
        if (depositosError) throw depositosError;
        
        // Calcular total depositado
        let totalDepositado = 0;
        if (depositos && depositos.length > 0) {
            totalDepositado = depositos.reduce((sum, deposito) => sum + parseFloat(deposito.valor_depositado || 0), 0);
        }
        
        // Buscar despesas do mês
        const { data: despesas, error: despesasError } = await supabase
            .from('despesas')
            .select('*')
            .eq('user_id', user.id)
            .gte('data_despesa', primeiroDiaMes)
            .lte('data_despesa', ultimoDiaMesFormatado);
            
        if (despesasError) throw despesasError;
        
        // Calcular total de despesas
        let totalDespesas = 0;
        if (despesas && despesas.length > 0) {
            totalDespesas = despesas.reduce((sum, despesa) => sum + parseFloat(despesa.valor_despesa || 0), 0);
        }
        
        // Calcular totais
        const totalMes = totalPix + totalDinheiro;
        const faltaDepositar = totalDinheiro - totalDepositado - totalDespesas;
        
        // Atualizar a UI
        document.getElementById('resumoPixMes').textContent = formatCurrency(totalPix);
        document.getElementById('resumoDinheiroMes').textContent = formatCurrency(totalDinheiro);
        document.getElementById('resumoDepositadoMes').textContent = formatCurrency(totalDepositado);
        document.getElementById('resumoDespesasMes').textContent = formatCurrency(totalDespesas);
        document.getElementById('resumoTotalMes').textContent = formatCurrency(totalMes);
        document.getElementById('resumoFaltaDepositarMes').textContent = formatCurrency(faltaDepositar);
        document.getElementById('resumoVistoriasMes').textContent = vistorias ? vistorias.length : 0;
        
    } catch (error) {
        console.error('Erro ao carregar resumo financeiro mensal:', error);
        showNotification('Erro ao carregar resumo financeiro mensal', 'error');
    }
}
