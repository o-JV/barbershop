import random

from loja.dominio import (
    BARBEIROS,
    Comanda,
    DadosInvalidos,
    HorarioIndisponivel,
)
from loja.repositorio import RepositorioAgenda


class AgendamentoNaoEncontrado(Exception):
    pass


class CodigoJaExiste(Exception):
    pass


def gerar_codigo() -> str:
    return "".join(random.choices("0123456789ABCDEF", k=6))


class ServicoAgenda:
    """Recebe o repositório pronto: não sabe qual banco está por baixo."""

    def __init__(self, repositorio: RepositorioAgenda):
        self.repositorio = repositorio

    def _barbeiro_para(self, data: str, hora: str, preferencia: str) -> dict:
        ids = (
            [b["id"] for b in BARBEIROS]
            if preferencia == "qualquer"
            else [preferencia]
        )
        for barbeiro_id in ids:
            if not self.repositorio.ocupado(data, hora, barbeiro_id):
                return next(b for b in BARBEIROS if b["id"] == barbeiro_id)
        raise HorarioIndisponivel("esse horário foi ocupado, escolha outro")

    def agendar(self, dados: dict) -> dict:
        nome = (dados.get("nome") or "").strip()
        telefone = "".join(c for c in dados.get("telefone", "") if c.isdigit())
        data = dados.get("data")
        hora = dados.get("hora")
        preferencia = dados.get("barbeiro") or "qualquer"
        itens = dados.get("itens") or []

        if len(nome) < 2:
            raise DadosInvalidos("informe seu nome")
        if len(telefone) < 10:
            raise DadosInvalidos("informe um telefone com DDD")
        if not data or not hora:
            raise DadosInvalidos("escolha a data e o horário")

        comanda = Comanda(itens)  # valida os itens
        barbeiro = self._barbeiro_para(data, hora, preferencia)

        codigo = gerar_codigo()
        while self.repositorio.codigo_existe(codigo):
            codigo = gerar_codigo()

        registro = {
            "codigo": codigo,
            "nome": nome,
            "telefone": telefone,
            "data": data,
            "hora": hora,
            "barbeiro_id": barbeiro["id"],
            "barbeiro_nome": barbeiro["nome"],
            "itens": comanda.itens,
            "subtotal": comanda.subtotal(),
            "desconto": comanda.desconto(),
            "total": comanda.total(),
        }

        registro["id"] = self.repositorio.adicionar(registro)
        return registro

    def buscar(self, agendamento_id: int) -> dict:
        registro = self.repositorio.buscar(agendamento_id)
        if registro is None:
            raise AgendamentoNaoEncontrado(
                f"agendamento {agendamento_id} não encontrado"
            )
        return registro

    def listar_do_dia(self, data: str) -> list[dict]:
        return self.repositorio.listar_por_dia(data)