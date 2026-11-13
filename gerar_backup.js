// Backup diário (todas as tabelas da app):
//   - um CSV por tabela, para abrir no Excel;
//   - um backup_AAAA-MM-DD.json com tudo, no formato que o botão "Restaurar backup" da app aceita.
// Usa a chave SECRETA do Supabase, lida de variáveis de ambiente (GitHub Secrets).
// NUNCA escrever a chave neste ficheiro.
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Faltam os secrets SUPABASE_URL e/ou SUPABASE_SERVICE_KEY.');
    process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const TABELAS = ['products', 'lots', 'entities', 'movements', 'malha', 'malha_movimentos'];
// Sem estas quatro o JSON não serve para restaurar (têm de coincidir com BACKUP_TABELAS no index.html)
const OBRIGATORIAS = ['products', 'lots', 'entities', 'movements'];
const PASSO = 1000;   // o Supabase devolve no máximo 1000 linhas por pedido

async function lerTudo(tabela) {
    const linhas = [];
    for (let de = 0; ; de += PASSO) {
        const { data, error } = await supabase.from(tabela).select('*')
            .order('id', { ascending: true }).range(de, de + PASSO - 1);
        if (error) throw error;
        linhas.push(...data);
        if (data.length < PASSO) break;
    }
    return linhas;
}

function celula(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') v = JSON.stringify(v);
    return `"${String(v).replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
}

function paraCsv(linhas) {
    const cols = [...new Set(linhas.flatMap(r => Object.keys(r)))];
    return '﻿' + [cols.map(celula).join(';'), ...linhas.map(r => cols.map(c => celula(r[c])).join(';'))].join('\r\n') + '\r\n';
}

async function fazerBackup() {
    fs.mkdirSync('backups', { recursive: true });
    const dataHoje = new Date().toISOString().split('T')[0];
    let total = 0, falhas = 0;
    // Os valores vão para o JSON tal como vêm da base de dados (nulos, números e quebras de linha intactos)
    const json = { app: 'og-stock', versao: 2, criado_em: new Date().toISOString() };

    for (const tabela of TABELAS) {
        try {
            const linhas = await lerTudo(tabela);
            total += linhas.length;
            json[tabela] = linhas;
            fs.writeFileSync(`backups/${tabela}_${dataHoje}.csv`, paraCsv(linhas));
            console.log(`OK  ${tabela}: ${linhas.length} linhas`);
        } catch (e) {
            if (e && (e.code === 'PGRST205' || e.code === '42P01')) {
                console.warn(`--  ${tabela}: tabela não existe, ignorada`);
            } else {
                falhas++;
                console.error(`ERRO ${tabela}:`, e && e.message ? e.message : e);
            }
        }
    }

    // Segurança: se tudo vier vazio, a chave ou o RLS estão mal configurados -> falhar em vez de guardar backups vazios
    if (falhas > 0 || total === 0) {
        console.error(falhas ? 'Backup incompleto.' : 'Nenhuma linha lida: verificar a chave secreta.');
        process.exit(1);
    }
    const emFalta = OBRIGATORIAS.filter(t => !Array.isArray(json[t]));
    if (emFalta.length) {
        console.error(`Backup incompleto: falta(m) a(s) tabela(s) ${emFalta.join(', ')}.`);
        process.exit(1);
    }
    fs.writeFileSync(`backups/backup_${dataHoje}.json`, JSON.stringify(json));
    console.log(`OK  backup_${dataHoje}.json (restaurável pela app)`);
}

fazerBackup();
