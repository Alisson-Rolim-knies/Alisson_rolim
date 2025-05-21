# Ark - Sistema de Controle Financeiro de Vistorias Veiculares

Este é um sistema web para controle financeiro de vistorias veiculares, permitindo o gerenciamento de vistorias, depósitos, despesas e relatórios financeiros.

## Funcionalidades

- Cadastro e autenticação de usuários
- Registro de vistorias veiculares (carros, motos e caminhões)
- Controle de métodos de pagamento (PIX, Dinheiro e Misto)
- Registro de depósitos e despesas
- Resumo financeiro diário e mensal
- Relatórios detalhados com exportação para PDF
- Gráficos interativos para análise de dados

## Tecnologias Utilizadas

- HTML5, CSS3 e JavaScript
- Bootstrap 5 para interface responsiva
- Chart.js para gráficos interativos
- Supabase para autenticação e banco de dados
- jsPDF e html2canvas para exportação de relatórios

## Configuração para Deploy na Vercel

1. Faça o fork ou clone deste repositório
2. Faça login na sua conta Vercel (https://vercel.com)
3. Clique em "Add New" > "Project"
4. Importe o repositório do GitHub ou faça upload dos arquivos
5. Mantenha as configurações padrão (Framework Preset: Other)
6. Clique em "Deploy"

## Configuração do Supabase

Após o deploy, você precisará configurar o Supabase:

1. Acesse o painel do Supabase
2. Vá para Authentication > URL Configuration
3. Adicione a URL do seu site à lista de URLs permitidas
4. Adicione a mesma URL à lista de URLs de redirecionamento
5. Salve as alterações

## Estrutura do Projeto

- `/css` - Arquivos de estilo
- `/js` - Scripts JavaScript
- `/pages` - Páginas HTML adicionais
- `/assets` - Imagens e outros recursos
- `index.html` - Página inicial
- `vercel.json` - Configuração para deploy na Vercel

## Licença

Este projeto está licenciado sob a licença MIT.
