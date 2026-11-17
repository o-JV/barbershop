import secrets

from loja.dominio import (
    BARBEIROS,
    Comanda,
    DadosInvalidos,
    HorarioIndisponivel,
    validar_horario,
)
from loja.repositorio import RepositorioAgenda


class AgendamentoNaoEncontrado(Exception):
    pass


class CodigoJaExiste(Exception):
    pass


def gerar_codigo() -> str:
    return "".join(secrets.choice("0123456789ABCDEF") for _ in range(6))


class ServicoAgenda:
    """Recebe o repositório pronto: não sabe qual banco está por baixo."""

    def __init__(self, repositorio: RepositorioAgenda):
        self.repositorio = repositorio

    def _barbeiro_para(self, data: str, hora: str, preferencia: str) -> dict:
        todos = [b["id"] for b in BARBEIROS]
        if preferencia != "qualquer" and preferencia not in todos:
            raise DadosInvalidos("barbeiro inválido")
        ids = todos if preferencia == "qualquer" else [preferencia]
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
        if len(nome) > 60:
            raise DadosInvalidos("o nome pode ter no máximo 60 letras")
        if len(telefone) not in (10, 11):
            raise DadosInvalidos("informe um telefone com DDD (10 ou 11 dígitos)")
        if not data or not hora:
            raise DadosInvalidos("escolha a data e o horário")

        validar_horario(data, hora)

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