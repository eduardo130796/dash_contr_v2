def is_dataset_ready(contract, dataset_name: str) -> bool:
    """
    Verifica se um determinado dataset de enriquecimento operacional
    (ex: garantias, responsaveis, historico) foi processado com sucesso 
    para o contrato informado.
    
    Contratos legados ou recém-sincronizados que não possuem esse
    enriquecimento não devem disparar alarmes analíticos até que o 
    worker conclua sua extração.
    """
    if not contract:
        return False
        
    status_field = f"{dataset_name}_status"
    
    if not hasattr(contract, status_field):
        # Se o campo nem existe no modelo, não está pronto ou foi mapeado errado
        return False
        
    status_value = getattr(contract, status_field)
    
    if not status_value:
        return False
        
    return str(status_value).strip().lower() == "success"
