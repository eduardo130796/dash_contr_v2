import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata uma data ISO para o padrão brasileiro DD/MM/YYYY
 * @param {string} dateString 
 * @param {string} fallback 
 * @returns {string}
 */
export const formatarDataBR = (dateString, fallback = '—') => {
  if (!dateString) return fallback;
  try {
    let date;
    if (typeof dateString === 'string') {
      // Tenta detectar formato DD/MM/YYYY
      if (dateString.includes('/') && dateString.length >= 10) {
        const [d, m, y] = dateString.split('/');
        date = new Date(y, m - 1, d);
      } else {
        date = parseISO(dateString);
      }
    } else {
      date = dateString;
    }
    
    if (!isValid(date)) return fallback;
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  } catch (e) {
    return fallback;
  }
};

/**
 * Formata uma data ISO para DD/MM/YY HH:mm
 * @param {string} dateString 
 * @param {string} fallback 
 * @returns {string}
 */
export const formatarDataHoraBR = (dateString, fallback = '—') => {
    if (!dateString) return fallback;
    try {
      let date;
      if (typeof dateString === 'string') {
        if (dateString.includes('/') && dateString.length >= 10) {
            const [d, m, y] = dateString.split(' ')[0].split('/');
            const timePart = dateString.split(' ')[1] || '00:00';
            const [h, min] = timePart.split(':');
            date = new Date(y, m - 1, d, h || 0, min || 0);
        } else {
            date = parseISO(dateString);
        }
      } else {
        date = dateString;
      }

      if (!isValid(date)) return fallback;
      return format(date, 'dd/MM/yy HH:mm', { locale: ptBR });
    } catch (e) {
      return fallback;
    }
  };

/**
 * Formata um valor numérico para Moeda Brasileira (R$)
 * @param {number} value 
 * @returns {string}
 */
export const formatarMoedaBR = (value) => {
  const amount = parseFloat(value || 0);
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Formata um valor numérico para representação decimal BR
 * @param {number} value 
 * @param {number} decimals 
 * @returns {string}
 */
export const formatarDecimalBR = (value, decimals = 2) => {
    const amount = parseFloat(value || 0);
    return amount.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
};

/**
 * Retorna label amigável para o status
 * @param {string} status 
 * @returns {string}
 */
export const getStatusLabel = (status) => {
    const map = {
        'ativo': 'Ativo',
        'vencendo': 'Vencendo',
        'vencido': 'Vencido',
        'encerrado': 'Encerrado',
        'suspenso': 'Suspenso',
        'vigencia_indefinida': 'Vigência Indefinida',
        'active': 'Ativo'
    };
    return map[status?.toLowerCase()] || status || 'Indefinido';
};
