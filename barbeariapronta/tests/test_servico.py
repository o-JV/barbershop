import pytest
from sqlmodel import Session

from loja.banco import criar_tabelas, engine_em_memoria
from loja.dominio import DadosInvalidos, HorarioIndisponivel
from loja.repositorio import RepositorioAgenda
from loja.servico import ServicoAgenda


@pytest.fixture
def servico():
    engine = engine_em_memoria()
    criar_tabelas(engine)
    with Session(engine) as sessao:
        yield ServicoAgenda(RepositorioAgenda(sessao))


def _dados(**mudancas):
    base = {
        "nome": "Ana",
        "telefone": "81999990000",
        "data": "2026-01-10",
        "hora": "10:00",
        "barbeiro": "qualquer",
        "itens": ["corte", "barba"],
    }
    base.update(mudancas)
    return base


def test_total_com_desconto(servico):
    registro = servico.agendar(_dados())
    assert registro["subtotal"] == 35.0
    assert registro["desconto"] == 3.5
    assert registro["total"] == 31.5


def test_sem_desconto_abaixo_do_limite(servico):
    registro = servico.agendar(_dados(itens=["corte"]))
    assert registro["desconto"] == 0.0
    assert registro["total"] == 20.0


def test_horario_ocupado(servico):
    servico.agendar(_dados(barbeiro="carlos"))
    with pytest.raises(HorarioIndisponivel):
        servico.agendar(_dados(barbeiro="carlos"))


def test_servico_invalido(servico):
    with pytest.raises(DadosInvalidos):
        servico.agendar(_dados(itens=["corte", "massagem"]))


def test_comanda_vazia(servico):
    with pytest.raises(DadosInvalidos):
        servico.agendar(_dados(itens=[]))