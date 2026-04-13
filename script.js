const _supabase = supabase.createClient(
    'https://iqhwjxrjtnujnoteqrzu.supabase.co', 
    'sb_publishable_Gav_IDnyFOzRCOnuJBx7gA_tK19CqW3'
);

let treinoAtualLocal = [];
let blocoAtivo = '';

// Extrai o número de séries da descrição (ex: "4x12" -> 4)
function extrairSeries(descricao) {
    const match = descricao.match(/(\d+)\s*[xX]/);
    return match ? parseInt(match[1]) : 3; 
}

// Inicia o timer de descanso
function iniciarTimer(tempoStr) {
    let tempo = parseInt(tempoStr) || 60;
    const overlay = document.createElement('div');
    overlay.id = 'timer-overlay';
    overlay.innerHTML = `
        <div class="timer-content">
            <h2 id="contagem">${tempo}s</h2>
            <p>Descanso em progresso...</p>
            <button onclick="this.parentElement.parentElement.remove()">Pular</button>
        </div>
    `;
    document.body.appendChild(overlay);

    const intervalo = setInterval(() => {
        tempo--;
        const display = document.getElementById('contagem');
        if (!display) { clearInterval(intervalo); return; }
        display.innerText = tempo + "s";
        if (tempo <= 0) {
            clearInterval(intervalo);
            display.innerText = "FIM!";
            if (navigator.vibrate) navigator.vibrate(500);
            setTimeout(() => overlay.remove(), 1500);
        }
    }, 1000);
}

// Lógica de contar série e salvar no celular
function contarSerie(id, total, tempo, event) {
    event.stopPropagation();
    let feitas = parseInt(localStorage.getItem(`series_${id}`)) || 0;

    if (feitas < total) {
        feitas++;
        localStorage.setItem(`series_${id}`, feitas);
        
        // Se ainda não acabou o exercício, solta o timer
        if (feitas < total) {
            iniciarTimer(tempo);
        }
        renderizarTreino(false); // Atualiza as bolinhas na tela
    }
}

async function buscarTreino(bloco) {
    blocoAtivo = bloco;
    document.querySelectorAll('.workout-selector button').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === bloco);
    });

    const { data, error } = await _supabase
        .from('treinos')
        .select('*')
        .eq('bloco', bloco)
        .order('ordem', { ascending: true });

    if (error) return;
    treinoAtualLocal = data;
    renderizarTreino(false);
}

function renderizarTreino(editavel) {
    const container = document.getElementById('lista-exercicios');
    container.innerHTML = `<h3 style="margin-bottom:15px; color:#00ff88">Treino ${blocoAtivo}</h3>`;

    treinoAtualLocal.forEach((item, index) => {
        const div = document.createElement('div');
        if (editavel) {
            div.className = 'card-edit';
            div.innerHTML = `
                <input type="text" value="${item.exercicio}" id="ex-${index}">
                <input type="text" value="${item.descricao}" id="desc-${index}">
                <input type="text" value="${item.descanso || '60s'}" id="timer-${index}">
            `;
        } else {
            const total = extrairSeries(item.descricao);
            const feitas = parseInt(localStorage.getItem(`series_${item.id}`)) || 0;
            const concluido = feitas >= total;

            div.className = `exercise-item ${concluido ? 'concluido' : ''}`;
            
            // Gerar bolinhas de progresso
            let dots = '';
            for(let i=0; i<total; i++) {
                dots += `<span class="dot ${i < feitas ? 'active' : ''}"></span>`;
            }

            div.innerHTML = `
                <div class="info-area">
                    <strong>${item.exercicio}</strong>
                    <p>${item.descricao}</p>
                    <div class="series-dots">${dots}</div>
                </div>
                <button class="btn-timer" onclick="contarSerie(${item.id}, ${total}, '${item.descanso}', event)">
                    ${concluido ? '✅' : 'SÉRIE + ⏳'}
                </button>
            `;
        }
        container.appendChild(div);
    });
}

function resetarTreinoDia() {
    if(confirm("Limpar todas as séries de hoje?")) {
        localStorage.clear();
        location.reload();
    }
}

// Funções de Edição mantidas conforme anterior...
function toggleEdicao() {
    const painelEdicao = document.getElementById('controles-edicao');
    const btnEditar = document.getElementById('btn-editar');
    const estaEditando = painelEdicao.style.display === 'none';
    painelEdicao.style.display = estaEditando ? 'block' : 'none';
    btnEditar.style.display = estaEditando ? 'none' : 'block';
    renderizarTreino(estaEditando);
}

async function salvarAlteracoes() {
    for (let i = 0; i < treinoAtualLocal.length; i++) {
        const novoEx = document.getElementById(`ex-${i}`).value;
        const novaDesc = document.getElementById(`desc-${i}`).value;
        const novoTimer = document.getElementById(`timer-${i}`).value;
        await _supabase.from('treinos').update({ 
            exercicio: novoEx, descricao: novaDesc, descanso: novoTimer 
        }).eq('id', treinoAtualLocal[i].id);
    }
    alert("Treino atualizado!");
    buscarTreino(blocoAtivo);
    toggleEdicao();
}