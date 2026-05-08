import { addDays, subDays, format } from 'date-fns';

const today = new Date();

const unidades = [
  'Diretoria de Tecnologia', 'Divisão de Operações', 'Serviços Administrativos',
  'Planejamento Estratégico', 'Assessoria Jurídica', 'Finanças e Orçamento',
  'Recursos Humanos', 'Comando de Logística',
];

const categories = ['services', 'technology', 'infrastructure', 'consulting', 'logistics', 'maintenance', 'security', 'communications'];

const gestores = [
  'Dr. Carlos Mendes', 'Dra. Ana Paula Silva', 'João Rodrigues',
  'Cel. Patricia Fonseca', 'Dr. Miguel Torres', 'Ângela Moreira',
  'Roberto Kimura', 'Maria dos Santos',
];

const fornecedores = [
  'Northbridge Sistemas Ltda.', 'Apex Soluções em Defesa', 'Meridian Tecnologias S/A',
  'Global Infraestrutura Parceiros', 'Sentinel Segurança Corp.', 'DataStream Analytics',
  'Pacific Logística Grupo', 'Quantum Computing Services', 'Atlas Engenharia S/A',
  'Vanguard Consultoria', 'Titan Comunicações Ltda.', 'Sterling Manutenção Co.',
];

const objetos = [
  'Modernização da Infraestrutura de TI Corporativa',
  'Gestão do Centro de Operações de Segurança Cibernética',
  'Migração para Nuvem e Transformação Digital',
  'Manutenção e Operação de Instalações',
  'Plataforma de Comunicações Estratégicas',
  'Suite de Analytics e Inteligência de Negócios',
  'Integração de Sistemas de Segurança Física',
  'Plataforma de Gestão de Logística e Cadeia de Suprimentos',
  'Sistema de Gestão de Capital Humano',
  'Atualização do Sistema de Gestão Financeira',
  'Avaliação e Reforma de Infraestrutura Predial',
  'Rede de Comunicações de Emergência',
  'Sistema de Gestão Documental e Arquivamento',
  'Gestão de Frota e Manutenção de Veículos',
  'Plataforma de Treinamento e Desenvolvimento',
  'Monitoramento de Conformidade Ambiental',
  'Operação do Centro de Operações de Rede',
  'Sistema de Gestão de Processos Jurídicos',
  'Monitoramento de Mídia para Relações Públicas',
  'Recuperação de Desastres e Continuidade de Negócios',
];

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomBetween(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateRiskScore(daysRemaining, operationalImpact, value, amendmentsCount) {
  let score = 0;
  if (daysRemaining <= 30) score += 40;
  else if (daysRemaining <= 60) score += 30;
  else if (daysRemaining <= 90) score += 20;
  else if (daysRemaining <= 180) score += 10;
  if (operationalImpact === 'critical') score += 30;
  else if (operationalImpact === 'high') score += 20;
  else if (operationalImpact === 'medium') score += 10;
  if (value > 5000000) score += 15;
  else if (value > 1000000) score += 10;
  else if (value > 500000) score += 5;
  if (amendmentsCount > 3) score += 15;
  else if (amendmentsCount > 1) score += 5;
  return Math.min(100, score);
}

function getCriticality(riskScore) {
  if (riskScore >= 75) return 'urgent';
  if (riskScore >= 50) return 'critical';
  if (riskScore >= 30) return 'attention';
  return 'low';
}

function getStatus(daysRemaining, riskScore) {
  if (daysRemaining <= 0) return 'expired';
  if (riskScore >= 75) return 'critical';
  if (daysRemaining <= 30) return 'expiring';
  if (riskScore >= 50) return 'warning';
  return 'active';
}

const acoesRecomendadas = [
  'Iniciar processo de renovação imediatamente',
  'Agendar reunião de análise com o fornecedor',
  'Preparar aditivo para prorrogação de escopo',
  'Realizar avaliação de desempenho',
  'Iniciar licitação para contrato substituto',
  'Escalar para o comitê executivo',
  'Atualizar termos e condições',
  'Solicitar dotação orçamentária para renovação',
  'Monitorar — nenhuma ação necessária',
  'Concluir auditoria de conformidade',
];

export function generateContracts(count = 35) {
  const contracts = [];
  for (let i = 0; i < count; i++) {
    const startDate = subDays(today, randomBetween(90, 1200));
    const endDate = addDays(today, randomBetween(-15, 540));
    const daysRemaining = Math.floor((endDate - today) / (1000 * 60 * 60 * 24));
    const operationalImpact = randomFrom(['low', 'medium', 'high', 'critical']);
    const value = randomBetween(50000, 15000000);
    const amendmentsCount = randomBetween(0, 6);
    const riskScore = generateRiskScore(daysRemaining, operationalImpact, value, amendmentsCount);
    const criticality = getCriticality(riskScore);
    const status = getStatus(daysRemaining, riskScore);

    contracts.push({
      contract_number: `CTR-${format(startDate, 'yyyy')}-${String(i + 1).padStart(4, '0')}`,
      object: objetos[i % objetos.length],
      contractor: randomFrom(fornecedores),
      category: randomFrom(categories),
      unit: randomFrom(unidades),
      manager: randomFrom(gestores),
      status,
      criticality,
      risk_score: riskScore,
      value,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      renewal_date: format(addDays(endDate, -30), 'yyyy-MM-dd'),
      operational_impact: operationalImpact,
      continuity_risk: randomFrom(['low', 'medium', 'high']),
      amendments_count: amendmentsCount,
      recommended_action: randomFrom(acoesRecomendadas),
      notes: '',
      is_strategic: Math.random() > 0.7,
    });
  }
  return contracts;
}

export function generateAlerts(contracts) {
  const alerts = [];
  contracts.forEach(c => {
    const daysRemaining = Math.floor((new Date(c.end_date) - today) / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 90 && daysRemaining > 0) {
      let severity = 'yellow';
      if (daysRemaining <= 30) severity = 'red';
      else if (daysRemaining <= 60) severity = 'orange';
      alerts.push({
        contract_number: c.contract_number,
        title: `Contrato ${c.contract_number} vence em ${daysRemaining} dias`,
        description: `${c.object} com ${c.contractor} requer atenção.`,
        severity,
        type: 'expiration',
        status: 'active',
        due_date: c.end_date,
      });
    }
    if (c.risk_score >= 70) {
      alerts.push({
        contract_number: c.contract_number,
        title: `Risco elevado detectado — ${c.contract_number}`,
        description: `Pontuação de risco ${c.risk_score}/100. ${c.recommended_action}`,
        severity: c.risk_score >= 85 ? 'red' : 'orange',
        type: 'critical_risk',
        status: 'active',
        due_date: format(addDays(today, 7), 'yyyy-MM-dd'),
      });
    }
  });
  return alerts;
}

export function generateEvents(contracts) {
  const events = [];
  const tiposEvento = ['created', 'amended', 'renewed', 'status_change', 'risk_escalation', 'action_taken', 'review', 'milestone'];
  const titulosEvento = {
    created: 'Contrato celebrado',
    amended: 'Termo aditivo registrado',
    renewed: 'Contrato renovado',
    status_change: 'Alteração de situação',
    risk_escalation: 'Escalada de risco',
    action_taken: 'Ação executada',
    review: 'Revisão periódica',
    milestone: 'Marco atingido',
  };
  const gestores = ['Dr. Carlos Mendes', 'Dra. Ana Paula Silva', 'João Rodrigues', 'Cel. Patricia Fonseca'];

  contracts.forEach(c => {
    events.push({
      contract_number: c.contract_number,
      event_type: 'created',
      title: 'Contrato celebrado',
      description: `Contrato ${c.contract_number} firmado com ${c.contractor}`,
      actor: c.manager,
      event_date: c.start_date,
    });
    const numEvents = randomBetween(1, 4);
    for (let i = 0; i < numEvents; i++) {
      const eventDate = subDays(today, randomBetween(1, 180));
      const type = randomFrom(tiposEvento);
      events.push({
        contract_number: c.contract_number,
        event_type: type,
        title: titulosEvento[type] || type,
        description: `Evento registrado para o contrato ${c.contract_number}`,
        actor: randomFrom(gestores),
        event_date: format(eventDate, 'yyyy-MM-dd'),
      });
    }
  });
  return events;
}

export function generateAmendments(contracts) {
  const amendments = [];
  const tipos = ['extension', 'value_change', 'scope_change', 'renewal', 'correction'];
  contracts.filter(c => c.amendments_count > 0).forEach(c => {
    for (let i = 0; i < c.amendments_count; i++) {
      amendments.push({
        contract_number: c.contract_number,
        amendment_number: `AMD-${c.contract_number}-${String(i + 1).padStart(2, '0')}`,
        type: randomFrom(tipos),
        description: `Aditivo ${i + 1} referente a: ${c.object}`,
        effective_date: format(subDays(today, randomBetween(10, 300)), 'yyyy-MM-dd'),
        value_change: randomBetween(-500000, 2000000),
        status: randomFrom(['pending', 'approved', 'implemented']),
      });
    }
  });
  return amendments;
}