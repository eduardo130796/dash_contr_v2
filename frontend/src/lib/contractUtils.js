import { differenceInDays, parseISO } from 'date-fns';

export function getDaysRemaining(endDate) {
  if (!endDate) return null;
  return differenceInDays(parseISO(endDate), new Date());
}

export function formatCurrency(value) {
  if (!value && value !== 0) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export function formatCompactCurrency(value) {
  if (!value && value !== 0) return '—';
  if (value >= 1000000) return `R$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$${(value / 1000).toFixed(0)}K`;
  return `R$${value}`;
}

export function getSeverityColor(severity) {
  const colors = {
    green: 'text-emerald-500',
    yellow: 'text-amber-400',
    orange: 'text-orange-500',
    red: 'text-red-500',
  };
  return colors[severity] || 'text-muted-foreground';
}

export function getSeverityBg(severity) {
  const colors = {
    green: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    yellow: 'bg-amber-400/10 text-amber-500 border-amber-400/20',
    orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    red: 'bg-red-500/10 text-red-500 border-red-500/20',
  };
  return colors[severity] || 'bg-muted text-muted-foreground';
}

export function getCriticalityConfig(criticality) {
  const configs = {
    low: { label: 'Normal', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-500' },
    attention: { label: 'Atenção', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20', dot: 'bg-amber-400' },
    critical: { label: 'Crítico', color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20', dot: 'bg-orange-500' },
    urgent: { label: 'Urgente', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20', dot: 'bg-red-500' },
  };
  return configs[criticality] || configs.low;
}

function normalizeStatus(status) {
  if (status === "ativo_com_execucao_no_ano") {
    return "ativo_operacional";
  }

  if (status === "vencido_com_execucao_no_ano") {
    return "vencido_com_execucao_recente";
  }

  return status;
}

export function getStatusConfig(status) {
  const normalized = normalizeStatus(status);

  const configs = {
    ativo_operacional: {
      label: 'Ativo',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10 border-emerald-500/20'
    },

    ativo_sem_execucao: {
      label: 'Ativo (sem execução)',
      color: 'text-amber-400',
      bg: 'bg-amber-400/10 border-amber-400/20'
    },

    vencido_com_execucao_recente: {
      label: 'Vencido (em execução)',
      color: 'text-orange-500',
      bg: 'bg-orange-500/10 border-orange-500/20'
    },

    encerrado: {
      label: 'Encerrado',
      color: 'text-red-500',
      bg: 'bg-red-500/10 border-red-500/20'
    },
  };

  return configs[normalized] || {
    label: 'Indefinido',
    color: 'text-muted-foreground',
    bg: 'bg-muted border-border'
  };
}

export function getRiskColor(score) {
  if (score >= 75) return 'text-red-500';
  if (score >= 50) return 'text-orange-500';
  if (score >= 30) return 'text-amber-400';
  return 'text-emerald-500';
}

export function getRiskBgColor(score) {
  if (score >= 75) return 'bg-red-500';
  if (score >= 50) return 'bg-orange-500';
  if (score >= 30) return 'bg-amber-400';
  return 'bg-emerald-500';
}