# 🚗 Sistema de Controle de Veículos

Um sistema completo e moderno para gestão de frota de veículos empresariais, desenvolvido em HTML, CSS, JavaScript e SQL com interface elegante e funcionalidades avançadas. 

Obs: sistema rodando na Porta 5179

## ✨ Melhorias Implementadas

### 🎨 Interface Moderna e Elegante
- **Design System Completo**: Paleta de cores moderna com variáveis CSS
- **Gradientes Sofisticados**: Backgrounds e botões com gradientes elegantes
- **Animações Suaves**: Transições fluidas e micro-interações
- **Ícones e Emojis**: Interface visual mais intuitiva
- **Tipografia Moderna**: Fonte Inter para melhor legibilidade
- **Cards Interativos**: Hover effects e sombras dinâmicas
- **Responsividade Total**: Funciona perfeitamente em desktop, tablet e mobile

### � Funcionalidades Avançadas
- **Validação em Tempo Real**: Campos validados conforme digitação
- **Feedback Visual**: Mensagens de sucesso/erro elegantes
- **Estados de Loading**: Indicadores visuais durante operações
- **Alertas Inteligentes**: Sistema de notificações automático
- **Dados de Demonstração**: Sistema pré-carregado com exemplos

### ✅ Autenticação e Controle de Acesso
- Sistema de login com usuários e senhas
- Controle de perfis (admin/usuário)
- Sessão persistente
- Interface de login redesenhada

### 📊 Dashboard Principal
- Visão geral da frota
- Estatísticas em tempo real
- Contadores de veículos, motoristas e alertas

### 🚙 Gestão de Veículos
- Cadastro completo de veículos
- Controle de quilometragem
- Status (disponível, em uso, manutenção)
- Histórico de manutenções

### 👨‍💼 Gestão de Motoristas
- Cadastro de motoristas/condutores
- Controle de validade da CNH
- Alertas automáticos para CNHs vencidas
- Dados pessoais e de contato

### 📝 Controle de Uso de Veículos
- Registro de quem usa cada veículo
- Controle de data/hora de saída e retorno
- Quilometragem inicial e final
- Rastreamento de rotas e destinos
- Cálculo automático de distância percorrida

### 🔧 Módulo de Manutenção e Despesas
- Registro de manutenções realizadas
- Controle de custos
- Agendamento de revisões
- Histórico de serviços
- Alertas para revisões pendentes

### ⚠️ Sistema de Alertas Inteligentes
- CNHs vencidas ou próximas ao vencimento
- Documentos de veículos vencidos
- Uso prolongado de veículos
- Revisões pendentes baseadas em quilometragem
- Notificações em tempo real

### 🔍 Validações Implementadas
- **Placa de Veículo**: Formato AAA-0000 com validação visual
- **CNH**: Validação de 11 dígitos com algoritmo básico
- **Telefone**: Formatação automática (11) 99999-9999
- **Datas**: Validação de datas futuras para vencimentos
- **Campos Obrigatórios**: Validação completa antes do envio
- **Duplicatas**: Verificação de placas e CNHs existentes

## 🗄️ Estrutura do Banco de Dados

### Principais Tabelas:
- **usuarios**: Sistema de autenticação
- **veiculos**: Cadastro de veículos
- **motoristas**: Cadastro de motoristas
- **uso_veiculos**: Controle de uso diário
- **manutencao**: Histórico de manutenções
- **despesas**: Controle de gastos
- **documentos**: Controle de documentação
- **alertas**: Sistema de notificações
- **configuracoes**: Parâmetros do sistema

### Recursos do Banco:
- Triggers automáticos para atualização de status
- Stored Procedures para geração de alertas
- Views para relatórios
- Índices para performance

## 🚀 Como Usar

### 1. Configuração do Banco de Dados

```sql
-- Execute o script SQL para criar as tabelas
mysql -u usuario -p < database/carcontrol_db.sql
```

### 2. Execução do Sistema

1. Abra o arquivo `index.html` em um navegador web
2. Faça login com:
   - **Usuário**: admin / **Senha**: admin123
   - **Usuário**: usuario / **Senha**: user123

### 3. Funcionalidades por Seção

#### Dashboard
- Visualize estatísticas gerais da frota
- Monitore alertas pendentes
- Acompanhe veículos em uso

#### Veículos
- Adicione novos veículos
- Edite informações
- Monitore status e quilometragem

#### Motoristas
- Cadastre motoristas
- Controle validade da CNH
- Receba alertas automáticos

#### Uso de Veículos
- Registre saídas e retornos
- Acompanhe rotas e finalidade
- Calcule distância percorrida

#### Manutenção
- Registre serviços realizados
- Controle custos
- Agende próximas revisões

#### Alertas
- Visualize todas as notificações
- Monitore CNHs vencidas
- Acompanhe documentos pendentes

## 🎯 Alertas Implementados

1. **CNH Vencida**: Motoristas com CNH vencida
2. **CNH Próximo ao Vencimento**: 30 dias antes do vencimento
3. **Revisão Pendente**: Baseado na quilometragem (padrão: 10.000 km)
4. **Uso Prolongado**: Veículos em uso há mais de 12 horas
5. **Documentos Vencidos**: CRLV, seguros e outros documentos

## 🔧 Configurações

O sistema permite configurar:
- Quilometragem entre revisões (padrão: 10.000 km)
- Dias de antecedência para alerta de CNH (padrão: 30 dias)
- Horas máximas para uso contínuo (padrão: 12 horas)
- Valor padrão do combustível

## 💾 Armazenamento

Para demonstração, o sistema utiliza **localStorage** do navegador para persistir dados. Em um ambiente de produção, deve-se integrar com:
- Backend em PHP, Node.js, Python, etc.
- Banco de dados MySQL, PostgreSQL, MongoDB
- APIs RESTful para operações CRUD

## 🎨 Interface Moderna

- **Design System Completo**: Variáveis CSS e paleta moderna
- **Gradientes Elegantes**: Backgrounds e componentes visuais
- **Animações Fluidas**: Micro-interações e transições suaves
- **Ícones Intuitivos**: Emojis e elementos visuais
- **Tipografia Moderna**: Fonte Inter para melhor legibilidade
- **Cards Interativos**: Hover effects e sombras dinâmicas
- **Responsividade Total**: Desktop, tablet e mobile
- **Feedback Visual**: Estados de loading e validações em tempo real

## 🔐 Segurança

- Senhas hash em produção (atualmente em texto plano para demo)
- Controle de sessão
- Validação de dados
- Sanitização de inputs

## 📱 Responsividade

O sistema funciona em:
- Desktop
- Tablet
- Smartphone

## 🔄 Funcionalidades Futuras

- [ ] Relatórios em PDF
- [ ] Integração com GPS
- [ ] Aplicativo móvel
- [ ] Notificações push
- [ ] Integração com sistemas ERP
- [ ] Módulo de combustível
- [ ] Controle de multas
- [ ] Gestão de pneumaticos

## 📞 Suporte

Para suporte técnico ou dúvidas sobre o sistema, consulte a documentação técnica ou entre em contato com o administrador.

## 📋 Requisitos

- Navegador web moderno
- JavaScript habilitado
- MySQL 5.7+ (para produção)
- Servidor web (Apache/Nginx) - opcional para desenvolvimento

## 🏗️ Estrutura de Arquivos

```
carcontrol/
├── index.html          # Página de login
├── css/
│   └── styles.css      # Estilos do sistema
├── js/
│   ├── auth.js         # Sistema de autenticação
│   └── main.js         # Lógica principal
├── database/
│   └── carcontrol_db.sql # Estrutura do banco
└── README.md           # Documentação
```

## ⚡ Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Banco de Dados**: MySQL 8.0
- **Funcionalidades**: LocalStorage, Fetch API, Drag & Drop
- **UI/UX**: CSS Grid, Flexbox, Modais

---

**Desenvolvido para controle eficiente de frotas empresariais**