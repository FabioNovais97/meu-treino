const _supabase = supabase.createClient(
    'https://iqhwjxrjtnujnoteqrzu.supabase.co', 
    'sb_publishable_Gav_IDnyFOzRCOnuJBx7gA_tK19CqW3'
);

let treinoAtualLocal = [];
let blocoAtivo = '';

async function buscarTreino(bloco) {
    blocoAtivo = bloco;
    
    // UI: Marcar botão ativo
    document.querySelectorAll('.workout-selector button').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === bloco);
    });

    const { data, error } = await _supabase
        .from('treinos')
        .select('*')
        .eq('bloco', bloco)
        .order('ordem', { ascending: true });

    if (error) {
        alert("Erro ao buscar dados!");
        return;
    }
    
    treinoAtualLocal = data;
    renderizarTreino(false);
    document.getElementById('btn-editar').style.display = 'block';
}

function renderizarTreino(editavel) {
    const container = document.getElementById('lista-exercicios');
    container.innerHTML = `<h3 style="margin-bottom:15px">Treino ${blocoAtivo}</h3>`;

    treinoAtualLocal.forEach((item, index) => {
        const div = document.createElement('div');
        
        if (editavel) {
            div.className = 'card-edit';
            div.innerHTML = `
                <input type="text" value="${item.exercicio}" id="ex-${index}">
                <input type="text" value="${item.descricao}" id="desc-${index}">
            `;
        } else {
            div.className = 'exercise-item';
            div.innerHTML = `
                <strong>${item.exercicio}</strong>
                <p>${item.descricao}</p>
            `;
            // Função de Check Visual
            div.onclick = () => div.classList.toggle('concluido');
        }
        container.appendChild(div);
    });
}

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

        await _supabase
            .from('treinos')
            .update({ exercicio: novoEx, descricao: novaDesc })
            .eq('id', treinoAtualLocal[i].id);
    }
    
    alert("Treino atualizado com sucesso!");
    buscarTreino(blocoAtivo); // Recarrega os dados
    toggleEdicao(); // Volta para o modo visual
}