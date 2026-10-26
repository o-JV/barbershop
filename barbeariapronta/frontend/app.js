const API = "http://127.0.0.1:8000";

let CATALOGO = {};
let BARBEIROS = [];

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

const HORAS = [];
for (let m = 9 * 60; m < 18 * 60; m += 30) {
  HORAS.push(
    String(Math.floor(m / 60)).padStart(2, "0") +
      ":" +
      String(m % 60).padStart(2, "0")
  );
}

const $ = (id) => document.getElementById(id);
const brl = (v) =>
  "R$ " + Number(v).toFixed(2).replace(".", ",");
const br = (iso) => iso.split("-").reverse().join("/");
const esc = (t) =>
  String(t).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;",
  }[c]));

const estado = {
  barbeiro: "qualquer",
  data: null,
  hora: null,
  comanda: [],
  agendaDoDia: [],
};

async function carregarDadosIniciais() {
  const [servicos, barbeiros] = await Promise.all([
    fetch(`${API}/servicos`).then((r) => r.json()),
    fetch(`${API}/barbeiros`).then((r) => r.json()),
  ]);

  CATALOGO = {};
  for (const s of servicos) CATALOGO[s.chave] = s;
  BARBEIROS = barbeiros;
}

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

function barbeiroOcupado(hora) {
  return estado.agendaDoDia.some(
    (a) =>
      a.hora === hora &&
      (estado.barbeiro === "qualquer" || a.barbeiro_id === estado.barbeiro)
  );
}

function horarioDisponivel(hora) {
  if (!estado.data) return false;
  if (horarioPassou(estado.data, hora)) return false;
  return !barbeiroOcupado(hora);
}

function renderBarbeiros() {
  const lista = [
    { id: "qualquer", nome: "Sem preferencia", info: "Primeiro disponivel" },
    ...BARBEIROS,
  ];
  $("barbeiros").innerHTML = lista
    .map(
      (b) => `
        <button class="opt" data-id="${b.id}" aria-pressed="${estado.barbeiro === b.id}">
          ${esc(b.nome)}<small>${esc(b.info)}</small>
        </button>`
    )
    .join("");
}

function renderDias() {
  $("dias").innerHTML = proximosDias(7)
    .map(
      (d) => `<button class="opt" data-d="${d.iso}" aria-pressed="${estado.data === d.iso}">${d.rotulo}</button>`
    )
    .join("");
}

function renderHorarios() {
  const box = $("horarios");

  if (!estado.data) {
    box.innerHTML = '<p class="vazio">Escolha um dia para ver os horarios.</p>';
    renderResumo();
    return;
  }

  if (estado.hora && !horarioDisponivel(estado.hora)) {
    estado.hora = null;
  }

  box.innerHTML = HORAS.map(
    (h) =>
      `<button class="slot" data-h="${h}" ${horarioDisponivel(h) ? "" : "disabled"} aria-pressed="${estado.hora === h}">${h}</button>`
  ).join("");

  renderResumo();
}

function renderServicos() {
  $("servicos").innerHTML =
    Object.entries(CATALOGO)
      .map(
        ([chave, v]) => `
          <div class="svc">
            <b>${esc(v.nome)}</b>
            <span class="p">${brl(v.valor)}</span>
            <button class="opt" data-k="${chave}" aria-pressed="${estado.comanda.includes(chave)}">
              ${estado.comanda.includes(chave) ? "Remover" : "Adicionar"}
            </button>
          </div>`
      )
      .join("") +
    `<p class="dica">Desconto de 10% quando o subtotal chega a R$ 30,00.</p>`;
}

function calcularResumoLocal() {
  const subtotal = estado.comanda.reduce(
    (t, k) => t + CATALOGO[k].valor,
    0
  );
  const desc = subtotal >= 30 ? Number((subtotal * 0.1).toFixed(2)) : 0;
  return {
    subtotal,
    desconto: desc,
    total: Number((subtotal - desc).toFixed(2)),
  };
}

function renderResumo() {
  const r = calcularResumoLocal();
  const barbeiro =
    estado.barbeiro === "qualquer"
      ? "Sem preferencia"
      : BARBEIROS.find((b) => b.id === estado.barbeiro)?.nome ?? "-";

  const linha = (t, v, c = "") =>
    `<div class="${c}"><dt>${t}</dt><dd>${v}</dd></div>`;

  $("resumo").innerHTML =
    linha("Barbeiro", esc(barbeiro)) +
    linha("Data", estado.data ? br(estado.data) : "-") +
    linha("Horario", estado.hora || "-") +
    linha(
      "Servicos",
      estado.comanda.length
        ? estado.comanda.map((k) => CATALOGO[k].nome).join(", ")
        : "-"
    ) +
    linha("Subtotal", brl(r.subtotal)) +
    linha("Desconto", "- " + brl(r.desconto), "desc") +
    linha("Total", brl(r.total), "total");
}

async function carregarAgendaDoDia() {
  if (!estado.data) {
    estado.agendaDoDia = [];
    return;
  }
  estado.agendaDoDia = await fetch(
    `${API}/agenda/${estado.data}`
  ).then((r) => r.json());
}

document.addEventListener("click", async (event) => {
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
    await carregarAgendaDoDia();
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
    const k = botao.dataset.k;
    estado.comanda = estado.comanda.includes(k)
      ? estado.comanda.filter((i) => i !== k)
      : [...estado.comanda, k];
    renderServicos();
    renderResumo();
  }
});

$("confirmar").addEventListener("click", async (event) => {
  event.preventDefault();
  event.stopPropagation();

  const msg = $("msg");
  msg.textContent = "";

  const nome = $("nome").value.trim();
  const telefone = $("telefone").value.replace(/\D/g, "");

  if (!estado.data || !estado.hora) { msg.textContent = "Escolha a data e o horario."; return; }
  if (!estado.comanda.length)       { msg.textContent = "Adicione pelo menos um servico a comanda."; return; }
  if (nome.length < 2)              { msg.textContent = "Informe seu nome."; return; }
  if (telefone.length < 10)         { msg.textContent = "Informe um telefone com DDD."; return; }

  const resposta = await fetch(`${API}/agendamentos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome, telefone,
      data: estado.data,
      hora: estado.hora,
      barbeiro: estado.barbeiro,
      itens: estado.comanda,
    }),
  });

  if (resposta.status === 201) {
    const registro = await resposta.json();
    event.stopImmediatePropagation();
    comprovante(registro);
    return;
  }

  const erro = await resposta.json().catch(() => ({}));
  msg.textContent = erro.detail || "Nao foi possivel agendar.";

  if (resposta.status === 409) {
    await carregarAgendaDoDia();
    renderHorarios();
  }
});

function comprovante(r) {
  $("app").innerHTML = `
    <section class="card ok-box" style="grid-column:1/-1;max-width:520px;margin:0 auto">
      <h2>Agendamento confirmado</h2>
      <div>Codigo</div>
      <div class="codigo">${esc(r.codigo)}</div>
      <dl>
        <div><dt>Cliente</dt><dd>${esc(r.nome)}</dd></div>
        <div><dt>Barbeiro</dt><dd>${esc(r.barbeiro_nome)}</dd></div>
        <div><dt>Data e hora</dt><dd>${br(r.data)} as ${esc(r.hora)}</dd></div>
        <div><dt>Servicos</dt><dd>${r.itens.map((k) => esc(CATALOGO[k].nome)).join(", ")}</dd></div>
        <div><dt>Subtotal</dt><dd>${brl(r.subtotal)}</dd></div>
        <div class="desc"><dt>Desconto</dt><dd>- ${brl(r.desconto)}</dd></div>
        <div class="total"><dt>Total a pagar</dt><dd>${brl(r.total)}</dd></div>
      </dl>
      <button class="primary" type="button" id="novo-agendamento">Novo agendamento</button>
    </section>
  `;

  // só registra o listener DEPOIS que o HTML já está no DOM,
  // e usa setTimeout(0) para garantir que o clique original terminou de borbulhar
  setTimeout(() => {
    const btn = $("novo-agendamento");
    if (!btn) return;
    btn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }, 0);
}

(async function iniciar() {
  try {
    await carregarDadosIniciais();
    renderBarbeiros();
    renderDias();
    renderServicos();
    renderHorarios();
  } catch (erro) {
    $("msg").textContent =
      "Nao foi possivel falar com a API. Ela esta rodando em " + API + "?";
  }
})();