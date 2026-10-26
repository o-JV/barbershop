from sqlalchemy.pool import StaticPool
from sqlmodel import Field, SQLModel, create_engine

URL_BANCO = "sqlite:///barbearia.db"


class AgendamentoRegistro(SQLModel, table=True):
    """Uma linha da tabela agendamento."""
    __tablename__ = "agendamento"

    id: int | None = Field(default=None, primary_key=True)
    codigo: str = Field(unique=True)
    nome: str
    telefone: str
    data: str
    hora: str
    barbeiro_id: str
    barbeiro_nome: str
    itens: str          # "corte,barba"
    subtotal: float
    desconto: float
    total: float


def criar_engine(url: str = URL_BANCO):
    argumentos = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, connect_args=argumentos)


def engine_em_memoria():
    return create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )


def criar_tabelas(engine):
    SQLModel.metadata.create_all(engine)