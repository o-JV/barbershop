import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from api import app, obter_sessao
from loja.banco import criar_tabelas, engine_em_memoria

cliente = TestClient(app)


@pytest.fixture(autouse=True)
def banco_de_teste():
    engine = engine_em_memoria()
    criar_tabelas(engine)

    def sessao_de_teste():
        with Session(engine) as sessao:
            yield sessao

    app.dependency_overrides[obter_sessao] = sessao_de_teste
    yield
    app.dependency_overrides.clear()


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


def test_lista_servicos():
    resposta = cliente.get("/servicos")
    assert resposta.status_code == 200
    assert len(resposta.json()) == 3


def test_cria_agendamento():
    resposta = cliente.post("/agendamentos", json=_dados())
    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["total"] == 31.5
    assert corpo["codigo"]


def test_agendamento_invalido_da_422():
    resposta = cliente.post("/agendamentos", json=_dados(itens=[]))
    assert resposta.status_code == 422


def test_horario_ocupado_da_409():
    cliente.post("/agendamentos", json=_dados(barbeiro="carlos"))
    resposta = cliente.post("/agendamentos", json=_dados(barbeiro="carlos"))
    assert resposta.status_code == 409


def test_buscar_inexistente_da_404():
    assert cliente.get("/agendamentos/99").status_code == 404