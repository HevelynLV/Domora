// Selo de status do protótipo (.badge e .b-* em docs/prototipo/pauta.css).
// O corretor só vê "disponivel" e "negociacao" (regra do CLAUDE.md); os outros
// status são do proprietário e do admin.

export type Status = "disponivel" | "negociacao" | "pendente" | "reprovado" | "contrato" | "vendido";

const estilos: Record<Status, { classes: string; rotulo: string }> = {
  disponivel: { classes: "bg-mar-soft text-mar-dark", rotulo: "Disponível" },
  negociacao: { classes: "bg-areia-soft text-areia", rotulo: "Em negociação" },
  pendente: { classes: "bg-cinza-soft text-ink2", rotulo: "Aguardando aprovação" },
  reprovado: { classes: "bg-erro-soft text-erro", rotulo: "Reprovado" },
  contrato: { classes: "bg-roxo-soft text-roxo", rotulo: "Contrato em análise" },
  vendido: { classes: "bg-ink text-white", rotulo: "Vendido" },
};

export function SeloStatus({ status, children }: { status: Status; children?: React.ReactNode }) {
  const { classes, rotulo } = estilos[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 self-start whitespace-nowrap rounded-full px-2.5 py-[3px] text-tiny font-bold ${classes}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {children ?? rotulo}
    </span>
  );
}
