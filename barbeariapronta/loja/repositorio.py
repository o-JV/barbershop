from sqlmodel import Session, select

from loja.banco import AgendamentoRegistro


def para_registro(dados: dict) -> AgendamentoRegistro:
    return AgendamentoRegistro(
        codigo=dados["codigo"],
        nome=dados["nome"],
        telefone=dados["telefone"],
        data=dados["data"],
        hora=dados["hora"],
        barbeiro_id=dados["barbeiro_id"],
        barbeiro_nome=dados["barbeiro_nome"],
        itens=",".join(dados["itens"]),
        subtotal=dados["subtotal"],
        desconto=dados["desconto"],
        total=dados["total"],
    )


def para_dict(registro: AgendamentoRegistro) -> dict:
    return {
        "id": registro.id,
        "codigo": registro.codigo,
        "nome": registro.nome,
        "telefone": registro.telefone,
        "data": registro.data,
        "hora": registro.hora,
        "barbeiro_id": registro.barbeiro_id,
        "barbeiro_nome": registro.barbeiro_nome,
        "itens": registro.itens.split(","),
        "subtotal": registro.subtotal,
        "desconto": registro.desconto,
        "total": registro.total,
    }


class RepositorioAgenda:
    """Única parte do sistema que sabe que existe um banco."""

    def __init__(self, sessao: Session):
        self.sessao = sessao

    def adicionar(self, dados: dict) -> int:
        registro = para_registro(dados)
        self.sessao.add(registro)
        self.sessao.commit()
        self.sessao.refresh(registro)
        return registro.id

    def buscar(self, agendamento_id: int) -> dict | None:
        registro = self.sessao.get(AgendamentoRegistro, agendamento_id)
        return None if registro is None else para_dict(registro)

    def codigo_existe(self, codigo: str) -> bool:
        consulta = select(AgendamentoRegistro).where(
            AgendamentoRegistro.codigo == codigo
        )
        return self.sessao.exec(consulta).first() is not None

    def ocupado(self, data: str, hora: str, barbeiro_id: str) -> bool:
        consulta = select(AgendamentoRegistro).where(
            AgendamentoRegistro.data == data,
            AgendamentoRegistro.hora == hora,
            AgendamentoRegistro.barbeiro_id == barbeiro_id,
        )
        return self.sessao.exec(consulta).first() is not None

    def listar_por_dia(self, data: str) -> list[dict]:
        consulta = (
            select(AgendamentoRegistro)
            .where(AgendamentoRegistro.data == data)
            .order_by(AgendamentoRegistro.hora)
        )
        return [para_dict(r) for r in self.sessao.exec(consulta)]