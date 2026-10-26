from dataclasses import dataclass


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


class DadosInvalidos(Exception):
    pass


class HorarioIndisponivel(Exception):
    pass


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