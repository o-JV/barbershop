const API = "http://127.0.0.1:8000";

let CATALOGO = {};
let BARBEIROS = [];
let ultimoRegistro = null;

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
const pad = (n) => String(n).padStart(2, "0");
const brl = (v) => "R$ " + Number(v).toFixed(2).replace(".", ",");
const br = (iso) => iso.split("-").reverse().join("/");
const esc = (t) =>
  String(t).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;",
  }[c]));

// localStorage pode falhar (modo privado, arquivo local bloqueado): nunca quebra a página
const memoria = {
  ler(chave) {
    try { return JSON.parse(localStorage.getItem(chave)); } catch { return null; }
  },
  gravar(chave, valor) {
    try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* ignora */ }
  },
};

const ICONES = {
  corte: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/></svg>',
  barba: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h18v4a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M7 9V6m10 3V6M9 21h6"/></svg>',
  sobrancelha: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14c3-6 11-8 18-3"/><path d="M5 18c2-2 6-3 10-2"/></svg>',
};
const ICONE_PADRAO = ICONES.corte;
const DESCRICOES = {
  corte: "Tesoura ou máquina, com acabamento",
  barba: "Toalha quente e navalha",
  sobrancelha: "Alinhamento na navalha",
};

const estado = {
  barbeiro: "qualquer",
  data: null,
  hora: null,
  comanda: [],
  agendaDoDia: [],
};

/* ---------- dados da API ---------- */

async function carregarDadosIniciais() {
  const [servicos, barbeiros] = await Promise.all([
    fetch(`${API}/servicos`).then((r) => r.json()),
    fetch(`${API}/barbeiros`).then((r) => r.json()),
  ]);

  CATALOGO = {};
  for (const s of servicos) CATALOGO[s.chave] = s;
  BARBEIROS = barbeiros;
}

async function carregarAgendaDoDia() {
  if (!estado.data) {
    estado.agendaDoDia = [];
    return;
  }
  const resposta = await fetch(`${API}/agenda/${estado.data}`);
  estado.agendaDoDia = resposta.ok ? await resposta.json() : [];
}

/* ---------- datas e disponibilidade ---------- */

function paraIso(data) {
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`;
}

function horarioPassou(data, hora) {
  return new Date(`${data}T${hora}:00`) <= new Date();
}

function rotuloDia(data, hoje) {
  const inicio = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diferenca = Math.round((inicio(data) - inicio(hoje)) / 86400000);
  if (diferenca === 0) return "hoje";
  if (diferenca === 1) return "amanhã";
  return DIAS[data.getDay()];
}

function proximosDias(quantidade) {
  const resultado = [];
  const hoje = new Date();
  const data = new Date();
  while (resultado.length < quantidade) {
    const iso = paraIso(data);
    const domingo = data.getDay() === 0;
    // depois do último horário, "hoje" não tem mais nada para escolher
    const hojeEncerrado = iso === paraIso(hoje) && HORAS.every((h) => horarioPassou(iso, h));
    if (!domingo && !hojeEncerrado) {
      resultado.push({
        iso,
        dia: rotuloDia(data, hoje),
        data: `${pad(data.getDate())}/${pad(data.getMonth() + 1)}`,
      });
    }
    data.setDate(data.getDate() + 1);
  }
  return resultado;
}

function barbeiroOcupado(hora) {
  const ocupados = new Set(
    estado.agendaDoDia.filter((a) => a.hora === hora).map((a) => a.barbeiro_id)
  );
  // sem preferência: só lota quando TODOS os barbeiros já têm cliente nesse horário
  if (estado.barbeiro === "qualquer") {
    return BARBEIROS.length > 0 && ocupados.size >= BARBEIROS.length;
  }
  return ocupados.has(estado.barbeiro);
}

function horarioDisponivel(hora) {
  if (!estado.data) return false;
  if (horarioPassou(estado.data, hora)) return false;
  return !barbeiroOcupado(hora);
}

/* ---------- telas ---------- */

function renderBarbeiros() {
  const lista = [
    { id: "qualquer", nome: "Sem preferência", info: "Primeiro disponível" },
    ...BARBEIROS,
  ];
  $("barbeiros").innerHTML = lista
    .map(
      (b) => `
        <button class="opt barbeiro" data-id="${esc(b.id)}" aria-pressed="${estado.barbeiro === b.id}">
          <span class="avatar">${b.id === "qualquer" ? "★" : esc(b.nome.charAt(0))}</span>
          <span class="b-txt">${esc(b.nome)}<small>${esc(b.info)}</small></span>
        </button>`
    )
    .join("");
}

function renderDias() {
  $("dias").innerHTML = proximosDias(7)
    .map(
      (d) =>
        `<button class="opt dia" data-d="${d.iso}" aria-pressed="${estado.data === d.iso}" aria-label="${esc(d.dia)} ${d.data}"><b>${esc(d.dia)}</b><small>${d.data}</small></button>`
    )
    .join("");
}

function renderHorarios() {
  const box = $("horarios");
  const livres = $("livres");

  if (!estado.data) {
    livres.textContent = "";
    box.innerHTML = '<p class="vazio">Escolha um dia para ver os horários.</p>';
    renderResumo();
    return;
  }

  if (estado.hora && !horarioDisponivel(estado.hora)) {
    estado.hora = null;
  }

  const quantos = HORAS.filter(horarioDisponivel).length;
  livres.textContent =
    quantos === 0
      ? "Sem horários livres neste dia. Escolha outro dia ou outro barbeiro."
      : quantos === 1
        ? "1 horário livre"
        : `${quantos} horários livres`;

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
            <span class="ico">${ICONES[chave] || ICONE_PADRAO}</span>
            <span class="svc-txt"><b>${esc(v.nome)}</b><small>${esc(DESCRICOES[chave] || "")}</small></span>
            <span class="p">${brl(v.valor)}</span>
            <button class="opt" data-k="${esc(chave)}" aria-pressed="${estado.comanda.includes(chave)}">
              ${estado.comanda.includes(chave) ? "Remover" : "Adicionar"}
            </button>
          </div>`
      )
      .join("") +
    `<p class="dica">Ganhe 10% de desconto quando o subtotal chegar a R$ 30,00.</p>`;
}

function calcularResumoLocal() {
  const subtotal = estado.comanda.reduce(
    (t, k) => t + (CATALOGO[k] ? CATALOGO[k].valor : 0),
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
      ? "Sem preferência"
      : BARBEIROS.find((b) => b.id === estado.barbeiro)?.nome ?? "-";

  const linha = (t, v, c = "") =>
    `<div class="${c}"><dt>${t}</dt><dd>${v}</dd></div>`;

  $("resumo").innerHTML =
    linha("Barbeiro", esc(barbeiro)) +
    linha("Data", estado.data ? br(estado.data) : "-") +
    linha("Horário", estado.hora || "-") +
    linha(
      "Serviços",
      estado.comanda.length
        ? esc(estado.comanda.map((k) => CATALOGO[k]?.nome ?? k).join(", "))
        : "-"
    ) +
    linha("Subtotal", brl(r.subtotal)) +
    linha("Desconto", "- " + brl(r.desconto), "desc") +
    linha("Total", brl(r.total), "total");

  const barra = $("barra-total");
  if (barra) barra.textContent = brl(r.total);
}

function mostrarCarregando() {
  const bloco = '<div class="skel"></div>'.repeat(3);
  $("barbeiros").innerHTML = bloco;
  $("servicos").innerHTML = bloco;
}

/* ---------- telefone e mensagens ---------- */

function mascaraTelefone(valor) {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function mensagemErro(erro) {
  const detalhe = erro && erro.detail;
  if (typeof detalhe === "string") return detalhe;
  // validação automática do FastAPI devolve uma lista de problemas
  if (Array.isArray(detalhe) && detalhe.length) {
    return detalhe.map((e) => e.msg).join(". ");
  }
  return "Não foi possível agendar. Tente de novo.";
}

function mostrarErro(texto, campo) {
  const msg = $("msg");
  msg.textContent = texto;
  msg.scrollIntoView({ block: "nearest", behavior: "smooth" });
  if (campo) $(campo).focus();
}

/* ---------- eventos ---------- */

document.addEventListener("click", async (event) => {
  const botao = event.target.closest("button");
  if (!botao) return;

  if (botao.dataset.acao) {
    tratarAcao(botao);
    return;
  }

  if (botao.dataset.id) {
    estado.barbeiro = botao.dataset.id;
    renderBarbeiros();
    renderHorarios();
    return;
  }

  if (botao.dataset.d) {
    estado.data = botao.dataset.d;
    estado.hora = null;
    try {
      await carregarAgendaDoDia();
    } catch {
      estado.agendaDoDia = [];
      mostrarErro("Não consegui carregar os horários ocupados. Confira se a API está rodando.");
    }
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

function tratarAcao(botao) {
  switch (botao.dataset.acao) {
    case "retry":
      iniciar();
      break;
    case "rolar":
      $("resumo-box").scrollIntoView({ behavior: "smooth", block: "center" });
      break;
    case "copiar":
      copiarCodigo(botao);
      break;
    case "ics":
      baixarIcs();
      break;
    case "novo":
      window.location.reload();
      break;
  }
}

$("telefone").addEventListener("input", (event) => {
  event.target.value = mascaraTelefone(event.target.value);
});

$("confirmar").addEventListener("click", async (event) => {
  event.preventDefault();
  event.stopPropagation();

  const botao = event.currentTarget;
  $("msg").textContent = "";

  const nome = $("nome").value.trim();
  const telefone = $("telefone").value.replace(/\D/g, "");

  if (!estado.data || !estado.hora) return mostrarErro("Escolha a data e o horário.");
  if (!estado.comanda.length)       return mostrarErro("Adicione pelo menos um serviço.");
  if (nome.length < 2)              return mostrarErro("Informe seu nome.", "nome");
  if (telefone.length < 10)         return mostrarErro("Informe um telefone com DDD.", "telefone");

  botao.disabled = true;
  botao.textContent = "Agendando…";

  try {
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
      memoria.gravar("barbearia:cliente", { nome, telefone });
      comprovante(registro);
      return;
    }

    const erro = await resposta.json().catch(() => ({}));
    mostrarErro(mensagemErro(erro));

    if (resposta.status === 409) {
      await carregarAgendaDoDia().catch(() => {});
      renderHorarios();
    }
  } catch {
    mostrarErro("Sem conexão com a API. Ela está rodando em " + API + "?");
  } finally {
    // se o comprovante foi mostrado, o botão já saiu da tela
    if (document.body.contains(botao)) {
      botao.disabled = false;
      botao.textContent = "Confirmar agendamento";
    }
  }
});

/* ---------- comprovante ---------- */

function nomesDosServicos(r) {
  return r.itens.map((k) => CATALOGO[k]?.nome ?? k).join(", ");
}

function textoDoAgendamento(r) {
  return [
    "Agendamento na Barbearia",
    `Código: ${r.codigo}`,
    `${br(r.data)} às ${r.hora} com ${r.barbeiro_nome}`,
    `Serviços: ${nomesDosServicos(r)}`,
    `Total: ${brl(r.total)}`,
  ].join("\n");
}

async function copiarCodigo(botao) {
  if (!ultimoRegistro) return;
  const codigo = ultimoRegistro.codigo;
  try {
    await navigator.clipboard.writeText(codigo);
  } catch {
    const campo = document.createElement("textarea");
    campo.value = codigo;
    document.body.appendChild(campo);
    campo.select();
    try { document.execCommand("copy"); } catch { /* ignora */ }
    campo.remove();
  }
  const antes = botao.textContent;
  botao.textContent = "Código copiado";
  setTimeout(() => { botao.textContent = antes; }, 1800);
}

function baixarIcs() {
  const r = ultimoRegistro;
  if (!r) return;

  const [h, m] = r.hora.split(":").map(Number);
  const fim = h * 60 + m + 30;
  const dia = r.data.replace(/-/g, "");
  const texto = (t) => String(t).replace(/[\;,]/g, "\\$&").replace(/\n/g, "\\n");

  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Barbearia//Agendamento//PT",
    "BEGIN:VEVENT",
    `UID:${r.codigo}@barbearia`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART:${dia}T${pad(h)}${pad(m)}00`,
    `DTEND:${dia}T${pad(Math.floor(fim / 60))}${pad(fim % 60)}00`,
    `SUMMARY:${texto("Barbearia: " + nomesDosServicos(r))}`,
    `DESCRIPTION:${texto(`Código ${r.codigo}\nBarbeiro: ${r.barbeiro_nome}\nTotal: ${brl(r.total)}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const arquivo = new Blob([linhas.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(arquivo);
  link.download = `barbearia-${r.codigo}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function comprovante(r) {
  ultimoRegistro = r;
  const barra = $("barra");
  if (barra) barra.remove();

  const whatsapp = "https://wa.me/?text=" + encodeURIComponent(textoDoAgendamento(r));

  $("app").innerHTML = `
    <section class="card ok-box">
      <h2 tabindex="-1" id="titulo-ok">Agendamento confirmado</h2>
      <div class="rotulo-cod">Seu código</div>
      <div class="codigo">${esc(r.codigo)}</div>
      <dl>
        <div><dt>Cliente</dt><dd>${esc(r.nome)}</dd></div>
        <div><dt>Barbeiro</dt><dd>${esc(r.barbeiro_nome)}</dd></div>
        <div><dt>Data e hora</dt><dd>${br(r.data)} às ${esc(r.hora)}</dd></div>
        <div><dt>Serviços</dt><dd>${esc(nomesDosServicos(r))}</dd></div>
        <div><dt>Subtotal</dt><dd>${brl(r.subtotal)}</dd></div>
        <div class="desc"><dt>Desconto</dt><dd>- ${brl(r.desconto)}</dd></div>
        <div class="total"><dt>Total a pagar</dt><dd>${brl(r.total)}</dd></div>
      </dl>
      <p class="aviso">Apresente este código na barbearia.</p>
      <div class="acoes">
        <button class="sec" type="button" data-acao="copiar">Copiar código</button>
        <button class="sec" type="button" data-acao="ics">Adicionar ao calendário</button>
        <a class="sec" href="${whatsapp}" target="_blank" rel="noopener">Enviar no WhatsApp</a>
      </div>
      <button class="primary" type="button" data-acao="novo">Novo agendamento</button>
    </section>
  `;

  window.scrollTo({ top: 0, behavior: "smooth" });
  $("titulo-ok").focus({ preventScroll: true });
}

/* ---------- início ---------- */

function restaurarCliente() {
  const cliente = memoria.ler("barbearia:cliente");
  if (!cliente) return;
  if (cliente.nome && !$("nome").value) $("nome").value = cliente.nome;
  if (cliente.telefone && !$("telefone").value) {
    $("telefone").value = mascaraTelefone(cliente.telefone);
  }
}

function observarResumo() {
  const barra = $("barra");
  const alvo = $("resumo-box");
  if (!barra || !alvo || !("IntersectionObserver" in window)) return;
  // a barra fixa some quando o resumo completo já está na tela
  new IntersectionObserver(([e]) => barra.classList.toggle("oculta", e.isIntersecting))
    .observe(alvo);
}

async function iniciar() {
  $("msg").textContent = "";
  mostrarCarregando();
  try {
    await carregarDadosIniciais();
    renderBarbeiros();
    renderDias();
    renderServicos();
    renderHorarios();
    restaurarCliente();
  } catch {
    $("barbeiros").innerHTML = "";
    $("servicos").innerHTML = "";
    $("msg").innerHTML =
      `Não foi possível falar com a API. Ela está rodando em ${esc(API)}? ` +
      `<button type="button" class="link" data-acao="retry">Tentar de novo</button>`;
  }
}

observarResumo();
iniciar();