from abc import ABC, abstractmethod
from typing import List
from backend.modules.analise.schemas.alert_candidate import AlertCandidate
from backend.modules.contratos.models.models import Contrato

class BaseAnalyzer(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    async def analyze(self, contract: Contrato) -> List[AlertCandidate]:
        """
        Analisa um contrato e retorna uma lista de candidatos a alertas.
        """
        pass
