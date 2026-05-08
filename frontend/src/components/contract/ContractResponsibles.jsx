import { cn } from "@/lib/utils";
import { User, ShieldCheck, HelpCircle } from "lucide-react";

export default function ContractResponsibles({ contractDetail }) {
  // O backend agora envia os grupos de responsáveis já classificados (GrupoResponsavelSchema)
  const grupos = contractDetail?.responsaveis || [];

  if (grupos.length === 0) {
    return (
      <div className="p-10 text-center bg-card border border-border rounded-xl shadow-sm">
        <p className="text-sm text-muted-foreground italic">
          Nenhum responsável oficial vinculado a este contrato foi identificado no sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
      {/* HEADER */}
      <div className="space-y-1">
        <h3 className="text-sm font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> Equipe de Gestão e Fiscalização
        </h3>
        <p className="text-xs text-muted-foreground">
          Agentes públicos designados formalmente para o acompanhamento e conformidade deste instrumento.
        </p>
      </div>

      {/* GRUPOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {grupos.map((grupo, idx) => {
          const isGestor = grupo?.titulo?.toLowerCase().includes("gestor");
          
          return (
            <div key={idx} className={cn(
                "space-y-4 p-5 rounded-2xl border transition-all duration-300 hover:shadow-md",
                isGestor ? "bg-primary/5 border-primary/20" : "bg-accent/10 border-border"
            )}>
                <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    {grupo?.titulo || "Responsável"}
                    </h4>
                    <div className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center",
                        isGestor ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                        <User className="w-3.5 h-3.5" />
                    </div>
                </div>
              
              <div className="space-y-5">
                {grupo.principal ? (
                  <PessoaCard pessoa={grupo.principal} label="Titular" />
                ) : (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground italic py-2">
                        <HelpCircle className="w-3 h-3" /> Titular não designado
                    </div>
                )}

                {grupo.substituto && (
                  <div className="pt-4 border-t border-border/50 border-dashed">
                      <PessoaCard pessoa={grupo.substituto} label="Substituto" isSubstituto />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PessoaCard({ pessoa, label, isSubstituto = false }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className={cn(
            "text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest",
            isSubstituto ? "bg-muted text-muted-foreground" : "bg-primary/20 text-primary"
        )}>
          {label}
        </span>
        <span className={cn(
            "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
            pessoa?.situacao === "Ativo" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
        )}>
          {pessoa?.situacao || "Desconhecido"}
        </span>
      </div>
      
      <div className="space-y-0.5">
        <p className="text-sm font-black text-foreground leading-tight">{pessoa?.nome || "Nome não informado"}</p>
        {pessoa?.cpf && (
            <p className="text-[10px] font-mono font-bold text-muted-foreground opacity-70">CPF: {pessoa.cpf}</p>
        )}
      </div>
    </div>
  );
}