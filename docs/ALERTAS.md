# Lifecycle e Documentação de Alertas

O módulo de alertas é construído de forma desacoplada do frontend e opera em "camadas de persistência". Isso significa que os alertas não surgem como um cálculo efêmero no painel visual: eles nascem, duram, e morrem guardados em banco de dados, compondo o histórico da plataforma.

## 1. Motivação da Arquitetura de Alertas Persistentes

Calcular em tempo real no dashboard visual dezenas de alertas (varrendo todos os arrays JSON do banco para ver se um empenho está sem nota de saldo) causaria um congelamento e sobrecarga de CPU absurdos.

**Arquitetura implementada:**
O módulo `alertas` aguarda que a _Sincronização_ termine de processar. No futuro, um _Motor de Análise_ (Analysis Engine) irá recalcular regras em cima dos `JSONB` enriquecidos, disparando a inserção desses Alertas no banco de dados.
O frontend irá apenas realizar queries rápidas tipo `SELECT * FROM alertas WHERE status = 'active'`, sem saber como ou por que eles foram gerados, separando totalmente a responsabilidade UI da regra de negócio.

## 2. Estrutura do Model (Lifecycles)

A tabela `alertas` foi implementada na pasta `models.py` da seguinte forma:

```python
class Alerta(Base):
    id = Column(...)
    contract_id = Column(ForeignKey(...))
    type = Column(String)
    severity = Column(String)
    title = Column(String)
    message = Column(String)
    status = Column(String)  # Status do Lifecycle
    
    # Rastreabilidade temporal
    created_at = Column(...)
    expires_at = Column(...)
    dismissed_at = Column(...)
    resolved_at = Column(...)
    
    # Controle de Mensageria Externa
    last_notification_at = Column(...)
    notification_count = Column(...)
    metadata_json = Column(JSONB)
```

## 3. Estados dos Alertas (Status)

Todo alerta transita no sistema com os seguintes `status`:
* `active`: Gerado pela Engine recentemente, não lido pelo usuário e não resolvido na última Sincronização.
* `viewed`: Reconhecido pelo usuário na UI (útil para auditoria).
* `dismissed`: Ignorado conscientemente pelo usuário gestor de contrato (Ação persistida em `alert_history`).
* `resolved`: A engine de sincronização seguinte rodou, verificou a inconsistência na API do Comprasnet, percebeu que a falha original foi mitigada pela base governamental, e marcou como resolvido. O usuário não teve que limpar manualmente.
* `expired`: O alerta tinha um prazo temporal máximo para atuação, e o prazo estourou. Útil para SLAs críticos.
* `failed`: Falhou ao ser classificado ou roteado na notificação.

## 4. Auditoria

Dada a criticidade do controle contratual:
Qualquer mudança no Lifecycle de um alerta (ex: um gestor clica no botão "Dispensar Alerta") obriga o preenchimento de um registro espelho na tabela `alert_history`.

```python
class AlertHistory(Base):
    alert_id = ForeignKey(...)
    action = Column(String)  # (ex: dismissed, viewed, sent_to_whatsapp)
    performed_by = Column(String) # (usuário ou 'system')
    details = Column(JSONB)  # payload que justifica a ação
```

## 5. Tabela de Notificações

Para expansão futura do canal operacional, o módulo de notificações já conta com a base relacional preenchida:
A `notifications` aguarda um worker que pegue alertas com status `active` marcados como emergenciais para dispará-los via provedores terceiros (`providers`). Contando com campos de `retry_count`, `provider_response` e controle de envio assíncrono.
