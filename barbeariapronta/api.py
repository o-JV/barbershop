from typing import Literal

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import Session

from loja.banco import criar_engine, criar_tabelas
from loja.dominio import BARBEIROS, CATALOGO, DadosInvalidos, HorarioIndisponivel
from loja.repositorio import RepositorioAgenda
from loja.servico import (
    AgendamentoNaoEncontrado,
    ServicoAgenda,
)

engine = criar_engine()
criar_tabelas(engine)

app = FastAPI(title="Barbearia")

# libera o front-end (aberto como arquivo) a chamar a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AgendamentoEntrada(BaseModel):
    nome: str
    telefone: str
    data: str
    hora: str
    barbeiro: str = "qualquer"
    itens: list[Literal["corte", "barba", "sobrancelha"]]


def obter_sessao():
    with Session(engine) as sessao:
        yield sessao


def obter_servico(sessao: Session = Depends(obter_sessao)):
    return ServicoAgenda(RepositorioAgenda(sessao))


# ---- tradução de exceção de domínio para status HTTP ----

@app.exception_handler(AgendamentoNaoEncontrado)
def nao_encontrado(request, erro):
    return JSONResponse(status_code=404, content={"detail": str(erro)})


@app.exception_handler(HorarioIndisponivel)
def conflito_horario(request, erro):
    return JSONResponse(status_code=409, content={"detail": str(erro)})


@app.exception_handler(DadosInvalidos)
def dados_invalidos(request, erro):
    return JSONResponse(status_code=422, content={"detail": str(erro)})


# ---- rotas ----

@app.get("/")
def inicio():
    return {"barbearia": "Barbearia", "documentacao": "/docs"}


@app.get("/servicos")
def listar_servicos():
    return [
        {"chave": chave, "nome": v["nome"], "valor": v["valor"]}
        for chave, v in CATALOGO.items()
    ]


@app.get("/barbeiros")
def listar_barbeiros():
    return BARBEIROS


@app.post("/agendamentos", status_code=201)
def criar_agendamento(
    dados: AgendamentoEntrada,
    servico: ServicoAgenda = Depends(obter_servico),
):
    return servico.agendar(dados.model_dump())


@app.get("/agendamentos/{agendamento_id}")
def buscar_agendamento(
    agendamento_id: int,
    servico: ServicoAgenda = Depends(obter_servico),
):
    return servico.buscar(agendamento_id)


@app.get("/agenda/{data}")
def agenda_do_dia(
    data: str,
    servico: ServicoAgenda = Depends(obter_servico),
):
    return servico.listar_do_dia(data)