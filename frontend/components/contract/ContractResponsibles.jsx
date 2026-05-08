export default function ContractResponsibles({ contractDetail }) {
  if (!contractDetail?.responsaveis) {
    return (
      <p className="text-sm text-muted-foreground">
        Sem responsáveis vinculados.
      </p>
    );
  }

  const responsaveis = contractDetail.responsaveis;

  // 🔧 pegar portaria única (assumindo padrão)
  const portaria = responsaveis[0]?.portaria;
  const dataInicio = responsaveis[0]?.data_inicio;

  // 🔧 organizar por estrutura
  const grupos = {
    gestor: { principal: null, substituto: null },
    fiscalTec: { principal: null, substituto: null },
    fiscalAdm: { principal: null, substituto: null },
  };

  responsaveis.forEach(r => {
    const nome = r.usuario?.split(" - ")[1] || r.usuario;
    const cpf = r.usuario?.split(" - ")[0];

    const pessoa = {
      nome,
      cpf,
      situacao: r.situacao,
    };

    const f = r.funcao_id.toLowerCase();

    if (f.includes("gestor")) {
      if (f.includes("substituto")) grupos.gestor.substituto = pessoa;
      else grupos.gestor.principal = pessoa;
    }

    if (f.includes("técnico")) {
      if (f.includes("substituto")) grupos.fiscalTec.substituto = pessoa;
      else grupos.fiscalTec.principal = pessoa;
    }

    if (f.includes("administrativo")) {
      if (f.includes("substituto")) grupos.fiscalAdm.substituto = pessoa;
      else grupos.fiscalAdm.principal = pessoa;
    }
  });

  const renderPessoa = (pessoa, tipo) => {
    if (!pessoa) return null;

    return (
      <div className="flex items-center justify-between border border-border rounded-lg px-3 py-2">

        <div>
          <p className="text-sm font-medium">{pessoa.nome}</p>
          <p className="text-[10px] text-muted-foreground">{pessoa.cpf}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            {tipo}
          </span>

          <span className={`text-[10px] px-2 py-1 rounded ${
            pessoa.situacao === "Ativo"
              ? "bg-green-500/10 text-green-400"
              : "bg-muted text-muted-foreground"
          }`}>
            {pessoa.situacao}
          </span>
        </div>

      </div>
    );
  };

  const renderGrupo = (titulo, grupo, destaque = false) => {
    if (!grupo.principal && !grupo.substituto) return null;

    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase">
          {titulo}
        </p>

        <div className={`rounded-lg p-3 space-y-2 ${
          destaque ? "bg-primary/5 border border-primary/20" : ""
        }`}>
          {renderPessoa(grupo.principal, "Titular")}
          {renderPessoa(grupo.substituto, "Substituto")}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-6">

      {/* HEADER */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">
          Gestão e fiscalização do contrato
        </h3>

        <div className="text-xs text-muted-foreground flex gap-4 flex-wrap">
          {portaria && <span>{portaria}</span>}
          {dataInicio && (
            <span>
              Início: {new Date(dataInicio).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
      </div>

      {/* GRUPOS */}
      <div className="space-y-5">

        {renderGrupo("Gestor", grupos.gestor, true)}
        {renderGrupo("Fiscal Técnico", grupos.fiscalTec)}
        {renderGrupo("Fiscal Administrativo", grupos.fiscalAdm)}

      </div>

    </div>
  );
}