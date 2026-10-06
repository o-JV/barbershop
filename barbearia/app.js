const CATALOGO = {
  corte: { nome: "Corte", valor: 20 },
  barba: { nome: "Barba", valor: 15 },
  sobrancelha: { nome: "Sobrancelha", valor: 10 },
};

const BARBEIROS = [
  { id: "carlos", nome: "Carlos", info: "Cortes classicos" },
  { id: "rafael", nome: "Rafael", info: "Degrade e barba" },
  { id: "diego", nome: "Diego", info: "Estilo moderno" },
];

const LIMITE_DESCONTO = 30;
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

const HORAS = [];
for (let minuto = 9 * 60; minuto < 18 * 60; minuto += 30) {
  HORAS.push(
    String(Math.floor(minuto / 60)).padStart(2, "0") + ":" + String(minuto % 60).padStart(2, "0")
  );
}

const itensValidos = (lista) => lista.filter((item) => item in CATALOGO);
const subtotal = (lista) => itensValidos(lista).reduce((total, item) => total + CATALOGO[item].valor, 0);
const desconto = (lista, valor) => (valor >= LIMITE_DESCONTO ? Number((valor * 0.1).toFixed(2)) : 0);

function fechar(lista) {
  const total = subtotal(lista);
  const valorDesconto = desconto(lista, total);
  return { subtotal: total, desconto: valorDesconto, total: Number((total - valorDesconto).toFixed(2)) };
}

const CHAVE = "barbearia:agenda";
let memoria = [];

function carregar() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE)) || [];
  } catch {
    return memoria;
  }
}

function salvar(lista) {
  memoria = lista;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {}
}

const $ = (id) => document.getElementById(id);
const brl = (valor) => "R$ " + Number(valor).toFixed(2).replace(".", ",");
const esc = (texto) =>
  String(texto).replace(/[&<>"']/g, (caractere) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[caractere]));
const br = (iso) => iso.split("-").reverse().join("/");
const estado = { barbeiro: "qualquer", data: null, hora: null, comanda: [] };

function proximosDias(quantidade) {
  const resultado = [];
  const data = new Date();

  while (resultado.length < quantidade) {
    if (data.getDay() !== 0) {
      const iso = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
      resultado.push({
        iso,
        rotulo: `${DIAS[data.getDay()]} ${String(data.getDate()).padStart(2, "0")}/${String(data.getMonth() + 1).padStart(2, "0")}`,
      });
    }
    data.setDate(data.getDate() + 1);
  }

  return resultado;
}

function horarioPassou(data, hora) {
  return new Date(`${data}T${hora}:00`) <= new Date();
}

function barbeirosLivres(agenda, data, hora, preferencia) {
  const ids = preferencia === "qualquer" ? BARBEIROS.map((barbeiro) => barbeiro.id) : [preferencia];
  return ids.filter((id) => !agenda.some((agendamento) => agendamento.data === data && agendamento.hora === hora && agendamento.barbeiroId === id));
}

function renderBarbeiros() {
  const lista = [{ id: "qualquer", nome: "Sem preferencia", info: "Primeiro disponivel" }, ...BARBEIROS];
  $("barbeiros").innerHTML = lista
    .map(
      (barbeiro) => `
        <button class="opt" data-id="${barbeiro.id}" aria-pressed="${estado.barbeiro === barbeiro.id}">${barbeiro.nome}<small>${barbeiro.info}</small></button>
      `
    )
    .join("");
}

function renderDias() {
  $("dias").innerHTML = proximosDias(7)
    .map((dia) => `<button class="opt" data-d="${dia.iso}" aria-pressed="${estado.data === dia.iso}">${dia.rotulo}</button>`)
    .join("");
}

function renderHorarios() {
  const box = $("horarios");

  if (!estado.data) {
    box.innerHTML = '<p class="vazio">Escolha um dia para ver os horarios.</p>';
    renderResumo();
    return;
  }

  const agenda = carregar();
  const horarioDisponivel = (hora) => barbeirosLivres(agenda, estado.data, hora, estado.barbeiro).length > 0 && !horarioPassou(estado.data, hora);

  if (estado.hora && !horarioDisponivel(estado.hora)) {
    estado.hora = null;
  }

  box.innerHTML = HORAS.map(
    (hora) => `<button class="slot" data-h="${hora}" ${horarioDisponivel(hora) ? "" : "disabled"} aria-pressed="${estado.hora === hora}">${hora}</button>`
  ).join("");

  renderResumo();
}

function renderServicos() {
  $("servicos").innerHTML =
    Object.entries(CATALOGO)
      .map(
        ([chave, valor]) => `
          <div class="svc">
            <b>${valor.nome}</b>
            <span class="p">${brl(valor.valor)}</span>
            <button class="opt" data-k="${chave}" aria-pressed="${estado.comanda.includes(chave)}">${estado.comanda.includes(chave) ? "Remover" : "Adicionar"}</button>
          </div>
        `
      )
      .join("") + `<p class="dica">Desconto de 10% quando o subtotal chega a ${brl(LIMITE_DESCONTO)}.</p>`;
}

function renderResumo() {
  const resumo = fechar(estado.comanda);
  const barbeiro = estado.barbeiro === "qualquer" ? "Sem preferencia" : BARBEIROS.find((item) => item.id === estado.barbeiro).nome;
  const linha = (titulo, valor, classe = "") => `<div class="${classe}"><dt>${titulo}</dt><dd>${valor}</dd></div>`;

  $("resumo").innerHTML =
    linha("Barbeiro", barbeiro) +
    linha("Data", estado.data ? br(estado.data) : "-") +
    linha("Horario", estado.hora || "-") +
    linha("Servicos", estado.comanda.length ? estado.comanda.map((item) => CATALOGO[item].nome).join(", ") : "-") +
    linha("Subtotal", brl(resumo.subtotal)) +
    linha("Desconto", "- " + brl(resumo.desconto), "desc") +
    linha("Total", brl(resumo.total), "total");
}

document.addEventListener("click", (event) => {
  const botao = event.target.closest("button");
  if (!botao) return;

  if (botao.dataset.id) {
    estado.barbeiro = botao.dataset.id;
    renderBarbeiros();
    renderHorarios();
    return;
  }

  if (botao.dataset.d) {
    estado.data = botao.dataset.d;
    estado.hora = null;
    renderDias();
    renderHorarios();
    return;
  }

  if (botao.dataset.h) {
    estado.hora = botao.dataset.h;
    renderHorarios();
    return;
  }

  if (botao.dataset.k) {
    const chave = botao.dataset.k;
    estado.comanda = estado.comanda.includes(chave)
      ? estado.comanda.filter((item) => item !== chave)
      : [...estado.comanda, chave];

    renderServicos();
    renderResumo();
  }
});

$("confirmar").addEventListener("click", () => {
  const nome = $("nome").value.trim();
  const tel = $("telefone").value.replace(/\D/g, "");

  const mostrarErro = (mensagem) => {
    $("msg").textContent = mensagem;
  };

  if (!estado.data || !estado.hora) return mostrarErro("Escolha a data e o horario.");
  if (!itensValidos(estado.comanda).length) return mostrarErro("Adicione pelo menos um servico a comanda.");
  if (nome.length < 2) return mostrarErro("Informe seu nome.");
  if (tel.length < 10) return mostrarErro("Informe um telefone com DDD.");

  const agenda = carregar();
  const livres = barbeirosLivres(agenda, estado.data, estado.hora, estado.barbeiro);

  if (!livres.length) {
    renderHorarios();
    return mostrarErro("Esse horario foi ocupado. Escolha outro.");
  }

  const barbeiro = BARBEIROS.find((item) => item.id === livres[0]);
  const itens = itensValidos(estado.comanda);
  const valores = fechar(itens);

  const registro = {
    codigo: Math.random().toString(16).slice(2, 8).toUpperCase(),
    nome,
    telefone: tel,
    data: estado.data,
    hora: estado.hora,
    barbeiroId: barbeiro.id,
    barbeiro: barbeiro.nome,
    itens: itens.map((item) => CATALOGO[item].nome),
    ...valores,
  };

  agenda.push(registro);
  salvar(agenda);
  comprovante(registro);
});

function comprovante(registro) {
  $("app").innerHTML = `
    <section class="card ok-box" style="grid-column:1/-1;max-width:520px;margin:0 auto">
      <h2>Agendamento confirmado</h2>
      <div>Codigo</div>
      <div class="codigo">${registro.codigo}</div>
      <dl>
        <div><dt>Cliente</dt><dd>${esc(registro.nome)}</dd></div>
        <div><dt>Barbeiro</dt><dd>${registro.barbeiro}</dd></div>
        <div><dt>Data e hora</dt><dd>${br(registro.data)} as ${registro.hora}</dd></div>
        <div><dt>Servicos</dt><dd>${registro.itens.join(", ")}</dd></div>
        <div><dt>Subtotal</dt><dd>${brl(registro.subtotal)}</dd></div>
        <div class="desc"><dt>Desconto</dt><dd>- ${brl(registro.desconto)}</dd></div>
        <div class="total"><dt>Total a pagar</dt><dd>${brl(registro.total)}</dd></div>
      </dl>
      <button class="primary" onclick="location.reload()">Novo agendamento</button>
    </section>
  `;
}

renderBarbeiros();
renderDias();
renderServicos();
renderHorarios();