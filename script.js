const _supabase = supabase.createClient(
    'https://iqhwjxrjtnujnoteqrzu.supabase.co', 
    'sb_publishable_Gav_IDnyFOzRCOnuJBx7gA_tK19CqW3'
);

let treinoAtualLocal = [];
let blocoAtivo = '';
let wakeLock = null; // Variável para controlar o bloqueio de tela

// Função para impedir que a tela apague
async function manterTelaAcesa() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) {
        console.log("Wake Lock não suportado ou negado.");
    }
}

// Função para liberar a tela (deixar apagar normalmente)
function liberarTela() {
    if (wakeLock !== null) {
        wakeLock.release();
        wakeLock = null;
    }
}

function extrairSeries(descricao) {
    const match = descricao.match(/(\d+)\s*[xX]/);
    return match ? parseInt(match[1]) : 4; 
}

function iniciarTimer(tempoStr) {
    let tempo = parseInt(tempoStr) || 60;
    
    // Ativa o bloqueio de tela assim que o timer começa
    manterTelaAcesa();

    const overlay = document.createElement('div');
    overlay.id = 'timer-overlay';
    overlay.innerHTML = `
        <div class="timer-content">
            <h2 id="contagem">${tempo}s</h2>
            <p>Descanso em progresso...</p>
            <button onclick="fecharTimer(this)">Pular</button>
        </div>
    `;
    document.body.appendChild(overlay);

    const intervalo = setInterval(() => {
        tempo--;
        const display = document.getElementById('contagem');
        if (!display) { 
            clearInterval(intervalo); 
            liberarTela(); 
            return; 
        }
        
        display.innerText = tempo + "s";
        
        if (tempo <= 0) {
            clearInterval(intervalo);
            display.innerText = "FIM!";
            if (navigator.vibrate) navigator.vibrate(500);
            setTimeout(() => {
                overlay.remove();
                liberarTela(); // Deixa a tela apagar após o fim do timer
            }, 1500);
        }
    }, 1000);
}

// Função auxiliar para fechar o timer manualmente
function fecharTimer(btn) {
    btn.parentElement.parentElement.remove();
    liberarTela();
}

function contarSerie(id, total, tempo, event) {
    event.stopPropagation();
    let feitas = parseInt(localStorage.getItem(`series_${id}`)) || 0;

    if (feitas < total) {
        feitas++;
        localStorage.setItem(`series_${id}`, feitas);
        
        // MELHORIA: Agora ele sempre inicia o timer, mesmo na última série
        iniciarTimer(tempo);
        
        renderizarTreino(false);
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

    // MELHORIA: Botão de Reset específico para o bloco atual no final da lista
    if (!editavel && treinoAtualLocal.length > 0) {
        const btnReset = document.createElement('button');
        btnReset.className = 'btn-reset-bloco';
        btnReset.innerHTML = '🔄 Finalizar e Resetar Treino';
        btnReset.onclick = () => {
            if (confirm(`Limpar progresso do Treino ${blocoAtivo}?`)) {
                treinoAtualLocal.forEach(ex => localStorage.removeItem(`series_${ex.id}`));
                renderizarTreino(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };
        container.appendChild(btnReset);
    }
}

// Funções de Edição e Reset Geral mantidas
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
        const novoTimer = document.getElementById(`timer-${index}`).value;
        await _supabase.from('treinos').update({ 
            exercicio: novoEx, descricao: novaDesc, descanso: novoTimer 
        }).eq('id', treinoAtualLocal[i].id);
    }
    alert("Treino atualizado!");
    buscarTreino(blocoAtivo);
    toggleEdicao();
}