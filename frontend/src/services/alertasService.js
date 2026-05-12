/**
 * AlertasService — Interface de comunicação com o módulo de alertas do backend.
 */

const BASE_URL = '/api/v1/alertas';

export const alertasService = {
  /**
   * Obtém estatísticas consolidadas de alertas para o ExecutiveCockpit.
   */
  async getAlertStats() {
    const response = await fetch(`${BASE_URL}/stats`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Falha ao buscar estatísticas de alertas');
    const payload = await response.json();
    return payload; // Formato esperado { success, data } se o backend retornar assim, ou o objeto direto
  },

  /**
   * Obtém a lista de alertas filtrada.
   */
  async getAlerts({ page = 1, limit = 10, status = 'active', severity, category, search } = {}) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (status) params.append('status', status);
    if (severity) params.append('severity', severity);
    if (category) params.append('category', category);
    if (search) params.append('search', search);

    const response = await fetch(`${BASE_URL}?${params.toString()}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Falha ao buscar lista de alertas');
    const payload = await response.json();
    return payload;
  },

  /**
   * Marca um alerta como visto.
   */
  async markAsViewed(alertId) {
    const response = await fetch(`${BASE_URL}/${alertId}/view`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Falha ao marcar alerta como visto');
    return await response.json();
  },

  /**
   * Dispensa um alerta.
   */
  async dismissAlert(alertId, reason) {
    const response = await fetch(`${BASE_URL}/${alertId}/dismiss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Falha ao dispensar alerta');
    return await response.json();
  }
};
