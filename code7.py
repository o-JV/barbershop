precos = {
    "corte": 35.00,
    "barba": 25.00,
    "sobrancelha": 15.00,
    "hidratação": 40.00,
}

comanda = ["corte", "barba", "corte", "pintura"]

total = 0.0
itens_validos = 0

for item in comanda:
    if item not in precos:
        print(f"Item fora da tabela: {item}")
        continue
    total += precos[item]
    itens_validos += 1

if itens_validos >= 3:
    desconto = total * 0.10
else:
    desconto = 0.0

total_final = total - desconto

print("-" * 30)
print(f"Itens na comanda: {len(comanda)}")
print(f"Distintos: {sorted(set(comanda))}")
print(f"Subtotal: R$ {total:.2f}")
print(f"Desconto: R$ {desconto:.2f}")
print(f"Total a pagar: R$ {total_final:.2f}")