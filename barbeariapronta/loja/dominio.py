from dataclasses import dataclass
from datetime import date, datetime


CATALOGO = {
    "corte": {"nome": "Corte", "valor": 20.0},
    "barba": {"nome": "Barba", "valor": 15.0},
    "sobrancelha": {"nome": "Sobrancelha", "valor": 10.0},
}

BARBEIROS = [
    {"id": "carlos", "nome": "Carlos", "info": "Cortes classicos"},
    {"id": "rafael", "nome": "Rafael", "info": "Degrade e barba"},
    {"id": "diego", "nome": "Diego", "info": "Estilo moderno"},
]

LIMITE_DESCONTO = 30.0

# expediente: 09:00 às 18:00, horários de 30 em 30 minutos, de segunda a sábado
ABERTURA = 9 * 60
FECHAMENTO = 18 * 60
INTERVALO = 30


class DadosInvalidos(Exception):
    pass


class HorarioIndisponivel(Exception):
    pass


def validar_horario(data, hora, agora: datetime | None = None) -> None:
    """Garante que data e hora existem, estão no expediente e não são passado."""
    try:
        dia = date.fromisoformat(data)
        if dia.isoformat() != data:
            raise ValueError
    except (TypeError, ValueError):
        raise DadosInvalidos("data inválida, use o formato AAAA-MM-DD")

    try:
        horario = datetime.strptime(hora, "%H:%M").time()
        if horario.strftime("%H:%M") != hora:
            raise ValueError
    except (TypeError, ValueError):
        raise DadosInvalidos("horário inválido, use o formato HH:MM")

    if dia.weekday() == 6:
        raise DadosInvalidos("não atendemos aos domingos")

    minutos = horario.hour * 60 + horario.minute
    if not (ABERTURA <= minutos < FECHAMENTO) or minutos % INTERVALO:
        raise DadosInvalidos(
            "escolha um horário entre 09:00 e 17:30, de 30 em 30 minutos"
        )

    if datetime.combine(dia, horario) <= (agora or datetime.now()):
        raise DadosInvalidos("esse horário já passou, escolha outro")


@dataclass
class Comanda:
    itens: list[str]

    def __post_init__(self):
        invalidos = [i for i in self.itens if i not in CATALOGO]
        if invalidos:
            raise DadosInvalidos(f"serviços inválidos: {invalidos}")
        if not self.itens:
            raise DadosInvalidos("a comanda precisa de pelo menos um serviço")

    def subtotal(self) -> float:
        return sum(CATALOGO[i]["valor"] for i in self.itens)

    def desconto(self) -> float:
        total = self.subtotal()
        return round(total * 0.1, 2) if total >= LIMITE_DESCONTO else 0.0

    def total(self) -> float:
        return round(self.subtotal() - self.desconto(), 2)