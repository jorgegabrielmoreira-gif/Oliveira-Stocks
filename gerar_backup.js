const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// As tuas chaves públicas do Supabase
const SUPABASE_URL = 'https://qlcpbrsbelmchjelbesx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VDFOaGUzbMu3MmOmhsgu0w_81FzMbqW';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fazerBackup() {
    console.log("A ligar ao Supabase para extrair todos os dados...");
    
    // Puxar os dados das 3 tabelas ao mesmo tempo
    const [resProd, resEnt, resMov] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('entities').select('*'),
        supabase.from('movements').select('*')
    ]);

    // Criar pasta de backups se não existir
    if (!fs.existsSync('backups')){
        fs.mkdirSync('backups');
    }

    const dataHoje = new Date().toISOString().split('T')[0];

    // --- 1. GERAR CSV DE PRODUTOS ---
    if (resProd.data) {
        let csvProd = "SKU;Nome;Categoria;Lote;Stock;Custo;Venda\n";
        resProd.data.forEach(p => {
            csvProd += `"${p.sku}";"${p.name}";"${p.category}";"${p.lote || ''}";${p.qty};${p.cost};${p.price}\n`;
        });
        fs.writeFileSync(`backups/produtos_${dataHoje}.csv`, csvProd);
        console.log(`✅ Backup Produtos gerado.`);
    }

    // --- 2. GERAR CSV DE ENTIDADES ---
    if (resEnt.data) {
        let csvEnt = "Nome;Tipo;NIF;Telefone;Email;Morada\n";
        resEnt.data.forEach(e => {
            // Remover quebras de linha na morada para não estragar o CSV
            const morada = e.address ? e.address.replace(/\n/g, ' ') : '';
            csvEnt += `"${e.name}";"${e.type}";"${e.nif}";"${e.phone || ''}";"${e.email || ''}";"${morada}"\n`;
        });
        fs.writeFileSync(`backups/entidades_${dataHoje}.csv`, csvEnt);
        console.log(`✅ Backup Entidades gerado.`);
    }

    // --- 3. GERAR CSV DE MOVIMENTOS ---
    if (resMov.data) {
        let csvMov = "Data;Tipo;Produto;Lote;Quantidade;Entidade;Notas\n";
        resMov.data.forEach(m => {
            csvMov += `"${m.date || ''}";"${m.type || ''}";"${m.product_name || ''}";"${m.lote || ''}";${m.qty || 0};"${m.entity_name || ''}";"${m.notes || ''}"\n`;
        });
        fs.writeFileSync(`backups/movimentos_${dataHoje}.csv`, csvMov);
        console.log(`✅ Backup Movimentos gerado.`);
    }
}

fazerBackup();
    fs.writeFileSync(nomeFicheiro, csv);
    console.log(`✅ Backup CSV gerado com sucesso: ${nomeFicheiro}`);
}

fazerBackup();
