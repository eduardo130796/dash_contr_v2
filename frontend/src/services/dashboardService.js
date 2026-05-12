/**
 * DashboardService — Interface de comunicação com o módulo de dashboard do backend.
 */

const BASE_URL = '/api/v1/dashboard';

export const dashboardService = {
  /**
   * Obtém estatísticas completas e enriquecidas para o ExecutiveCockpit.
   */
  async getDashboardStats() {
    const response = await fetch(`${BASE_URL}/stats`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Falha ao buscar estatísticas do dashboard');
    const payload = await response.json();
    return payload; // { success, data: { kpis, expirationTimeline, urgent_actions, executive_insights, ... } }
  }
};
