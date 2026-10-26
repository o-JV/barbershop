from sqlmodel import Session

from loja.banco import criar_engine, criar_tabelas, engine_em_memoria
from loja.repositorio import RepositorioAgenda


def test_dados_sobrevivem_ao_reinicio(tmp_path):
    url = f"sqlite:///{tmp_path / 'barbearia.db'}"
    engine = criar_engine(url)
    criar_tabelas(engine)

    dados = {
        "codigo": "ABC123",
        "nome": "Ana",
        "telefone": "81999990000",
        "data": "2026-01-10",
        "hora": "10:00",
        "barbeiro_id": "carlos",
        "barbeiro_nome": "Carlos",
        "itens": ["corte"],
        "subtotal": 20.0,
        "desconto": 0.0,
        "total": 20.0,
    }

    with Session(engine) as sessao:
        RepositorioAgenda(sessao).adicionar(dados)

    engine.dispose()

    outro = criar_engine(url)
    with Session(outro) as sessao:
        registro = RepositorioAgenda(sessao).buscar(1)
        assert registro["nome"] == "Ana"