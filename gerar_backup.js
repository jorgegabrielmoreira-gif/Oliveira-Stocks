const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// As tuas chaves públicas do Supabase
const SUPABASE_URL = 'https://qlcpbrsbelmchjelbesx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VDFOaGUzbMu3MmOmhsgu0w_81FzMbqW';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fazerBackup() {
    console.log("A ligar ao Supabase para extrair produtos...");
    const { data: products, error } = await supabase.from('products').select('*');
    
    if (error) {
        console.error("Erro ao extrair dados:", error);
        return;
    }

    // Criar o cabeçalho do CSV exatamente igual ao da tua app
    let csv = "SKU;Nome;Categoria;Lote;Stock;Custo;Venda\n";
    
    // Preencher com os produtos
    products.forEach(p => {
        csv += `"${p.sku}";"${p.name}";"${p.category}";"${p.lote || ''}";${p.qty};${p.cost};${p.price}\n`;
    });

    // Criar pasta de backups se não existir
    if (!fs.existsSync('backups')){
        fs.mkdirSync('backups');
    }

    // Nome do ficheiro com a data de hoje (ex: inventario_2026-10-18.csv)
    const dataHoje = new Date().toISOString().split('T')[0];
    const nomeFicheiro = `backups/inventario_${dataHoje}.csv`;

    fs.writeFileSync(nomeFicheiro, csv);
    console.log(`✅ Backup CSV gerado com sucesso: ${nomeFicheiro}`);
}

fazerBackup();
