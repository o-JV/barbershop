valor = 250.00
tem_cupom = True

if tem_cupom or valor > 300:
    frete = 0
elif valor >= 100:
    frete = 8
else:
    frete = 15


total = valor + frete 

print(f"Frete: R$ {total}")