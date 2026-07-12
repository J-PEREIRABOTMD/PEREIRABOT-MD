import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';

// 👑 CONFIGURAÇÃO DE SEGURANÇA SUPREMA (MUTÁVEL)
const promocoesAutorizadas = new Set();
const usuariosBloqueados = new Set();

// 💡 SEU ID REAL DO WHATSAPP (Ajustado para comparar apenas os números puros se houver divergência)
let SEU_NUMERO_SUPREMO = '193781022359727@lid'; 

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('sessao_bot');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: ['Mac OS', 'Chrome', '101.0.4951.64']
    });

    // 1. MONITOR DE CONEXÃO
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.clear();
            console.log('✨ QR Code gerado com sucesso!');
            console.log('👉 Escaneie o código abaixo com o seu WhatsApp:\n');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode !== DisconnectReason.loggedOut) {
                setTimeout(() => connectToWhatsApp(), 3000);
            }
        } else if (connection === 'open') {
            console.clear();
            console.log('\n🎉 PARABÉNS! O seu bot foi conectado com sucesso! 🎉\n');
            console.log('🤖 Aguardando comandos no WhatsApp e Monitor de Segurança ATIVO!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // 🛡️ MONITOR AUTOMÁTICO DE PROMOÇÕES (SISTEMA ANTIFURTO AVANÇADO)
    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        
        if (action === 'promote') {
            for (let participant of participants) {
                const pId = typeof participant === 'string' ? participant : (participant.id || '');
                if (!pId) continue;
                
                // Ignora se o promovido for o próprio dono supremo (compara número puro)
                if (pId.split('@')[0] === SEU_NUMERO_SUPREMO.split('@')[0]) continue;

                // Se quem foi promovido NÃO estava na lista autorizada
                if (!promocoesAutorizadas.has(pId)) {
                    try {
                        // Rebaixa o traíra imediatamente
                        await sock.groupParticipantsUpdate(id, [pId], 'demote');
                        
                        // BLOQUEIO MANUAL AUTOMÁTICO: Adiciona o cara na lista negra do bot
                        usuariosBloqueados.add(pId);

                        await sock.sendMessage(id, { 
                            text: `⚠️ *SISTEMA ANTIFURTO:* Promoção não autorizada detectada!\n\nO usuário @${pId.split('@')[0]} foi rebaixado e bloqueado permanentemente no sistema do bot.`,
                            mentions: [pId]
                        });
                    } catch (err) {
                        console.log(`Erro ao aplicar antifurto no grupo ${id}:`, err);
                    }
                } else {
                    // Se ele estava autorizado, apenas remove da lista para consumir o token de permissão
                    promocoesAutorizadas.delete(pId);
                }
            }
        }
    });

    // 2. MONITOR DE MENSAGENS
    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];              
            if (!msg.message || msg.key.fromMe) return;

            const conversation = msg.message.conversation || msg.message.extendedTextMessage?.text;
            const from = msg.key.remoteJid; 
            const sender = msg.key.participant || msg.key.remoteJid; 
            const isGroup = from.endsWith('@g.us');

            // 🛑 TRAVA ANTI-TRAÍRA: Se o usuário estiver na lista negra, o bot o ignora completamente
            if (usuariosBloqueados.has(sender)) return;

            if (conversation) {
                console.log(`💬 Mensagem recebida de ${from}: ${conversation}`);
                console.log(`🚨 ID DO REMETENTE: ${sender}`);

                const prefix = '!';

                // 🛡️ SISTEMA AUTOMÁTICO: ANTILINK DE CONVITE + ANTIMARCAÇÃO (SÓ MEMBROS)
                if (isGroup) {
                    try {
                        const groupMetadata = await sock.groupMetadata(from);
                        const participants = groupMetadata.participants;
                        const senderIsAdmin = participants.find(p => p.id === sender)?.admin;
                        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                        const botIsAdmin = participants.find(p => p.id === botNumber)?.admin;

                        if (!senderIsAdmin && botIsAdmin) {
                            const bodyLower = conversation.toLowerCase();
                            const temLinkProibido = bodyLower.includes('chat.whatsapp.com') || 
                                                    bodyLower.includes('whatsapp.com/invite') || 
                                                    bodyLower.includes('t.me/') || 
                                                    bodyLower.includes('telegram.me/');
                            
                            const mencoes = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                            const tentouMarcarTodos = mencoes.length > 5 || bodyLower.includes('@everyone') || bodyLower.includes('@todos');

                            if (temLinkProibido && tentouMarcarTodos) {
                                try { await sock.sendMessage(from, { delete: msg.key }); } catch {}
                                await sock.groupParticipantsUpdate(from, [sender], 'remove');
                                await sock.sendMessage(from, { 
                                    text: `🚨 *SISTEMA DEFENSIVO:* Mensagem de @${sender.split('@')[0]} contendo link de convite com marcação em massa foi interceptada e o usuário foi banido.`,
                                    mentions: [sender]
                                });
                                return;
                            }
                        }
                    } catch (err) {
                        console.log('Erro no monitor defensivo:', err);
                    }
                }
                
                if (!conversation.startsWith(prefix)) return;

                const args = conversation.trim().split(/ +/);
                const command = args.shift().toLowerCase().replace(prefix, '');

                switch (command) {
                    // 🌌 MENU PRINCIPAL
                    case 'menu': {
                        let textoMenu = `🌌 *PEREIRABOT-MD - CATEGORIAS* 🌌\n\n` +
                                        `👑 *${prefix}restrito* - Painel Secreto do Dono\n` +
                                        `🛡️ *${prefix}menuadm* - Administração de Grupos\n` +
                                        `🎮 *${prefix}menugame* - Jogos e Diversão\n` +
                                        `📥 *${prefix}menubaixar* - Downloads de Mídia\n` +
                                        `🎨 *${prefix}menufig* - Criação de Figurinhas\n\n` +
                                        `💡 _Digite o comando de qualquer menu para ver as funções!_`;
                        await sock.sendMessage(from, { text: textoMenu });
                        break;
                    }

                    // 👑 PAINEL DA ÁREA RESTRITA (UNIFICADO)
                    case 'restrito': {
                        if (sender !== SEU_NUMERO_SUPREMO) {
                            await sock.sendMessage(from, { text: `❌ *ÁREA RESTRITA:* Você não possui as credenciais de Dono Supremo.` });
                            break;
                        }
                        let textoRestrito = `🔒 *PAINEL SUPREMO - ÁREA RESTRITA* 🔒\n\n` +
                                            `• *${prefix}permitirpromover @membro* - Pré-autoriza promoção de ADM\n` +
                                            `• *${prefix}bloquearuser @membro* - Bane usuário do bot manualmente\n` +
                                            `• *${prefix}desbloquearuser @membro* - Remove usuário da lista negra\n` +
                                            `• *${prefix}listablock* - Lista todos os usuários banidos\n` +
                                            `• *${prefix}numerodono @membro* - Altera o Dono Supremo do bot\n` +
                                            `• *${prefix}nomedobot <nome>* - Atualiza o nome de perfil do bot\n` +
                                            `• *${prefix}fotodobot* - Atualiza a foto do bot (responda a uma imagem)\n` +
                                            `• *${prefix}removermembros* - Remove todos os membros comuns do grupo atual\n` +
                                            `• *${prefix}transmitir1 <texto>* - Transmissão padrão em texto nos grupos\n` +
                                            `• *${prefix}transmitir2 <texto>* - Alerta em todos os grupos com marcação geral\n` +
                                            `• *${prefix}rajar <texto>* - ALERTA MÁXIMO ANTIQUEDA (Disparos em massa)\n` +
                                            `• *${prefix}trancargp* - Congelamento imediato do grupo (Fecha chat e revoga ADMs)`;
                        await sock.sendMessage(from, { text: textoRestrito });
                        break;
                    }

                    // 🚫 BLOQUEAR USUÁRIO MANUALMENTE
                    case 'bloquearuser': {
                        if (sender !== SEU_NUMERO_SUPREMO) {
                            await sock.sendMessage(from, { text: `❌ Acesso exclusivo do Dono Supremo.` });
                            break;
                        }
                        let target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                        if (!target) {
                            await sock.sendMessage(from, { text: `⚠️ *Uso correto:* \`${prefix}bloquearuser\` @membro` });
                            break;
                        }
                        usuariosBloqueados.add(target);
                        await sock.sendMessage(from, { 
                            text: `🚫 @${target.split('@')[0]} foi bloqueado manualmente e não pode mais usar o bot.`, 
                            mentions: [target] 
                        });
                        break;
                    }

                    // 🔓 DESBLOQUEAR USUÁRIO
                    case 'desbloquearuser': {
                        if (sender !== SEU_NUMERO_SUPREMO) {
                            await sock.sendMessage(from, { text: `❌ Acesso exclusivo do Dono Supremo.` });
                            break;
                        }
                        let target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                        if (!target) {
                            await sock.sendMessage(from, { text: `⚠️ *Uso correto:* \`${prefix}desbloquearuser\` @membro` });
                            break;
                        }
                        if (usuariosBloqueados.has(target)) {
                            usuariosBloqueados.delete(target);
                            await sock.sendMessage(from, { 
                                text: `✅ O usuário @${target.split('@')[0]} foi removido da lista negra.`, 
                                mentions: [target] 
                            });
                        } else {
                            await sock.sendMessage(from, { text: `⚠️ Este usuário não estava bloqueado.` });
                        }
                        break;
                    }

                    // 📋 VER LISTA DE BLOQUEADOS
                    case 'listablock': {
                        if (sender !== SEU_NUMERO_SUPREMO) break;
                        if (usuariosBloqueados.size === 0) {
                            await sock.sendMessage(from, { text: `📋 A lista negra está vazia.` });
                            break;
                        }
                        let lista = `📋 *USUÁRIOS BLOQUEADOS:* \n\n`;
                        usuariosBloqueados.forEach(u => {
                            lista += `• @${u.split('@')[0]}\n`;
                        });
                        await sock.sendMessage(from, { text: lista, mentions: Array.from(usuariosBloqueados) });
                        break;
                    }

                    // 🛑 AUTORIZAR PROMOÇÃO
                    case 'permitirpromover': {
                        if (sender !== SEU_NUMERO_SUPREMO) {
                            await sock.sendMessage(from, { text: `❌ Acesso exclusivo do Dono Supremo.` });
                            break;
                        }
                        let target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                        if (!target) {
                            await sock.sendMessage(from, { text: `⚠️ *Uso correto:* \`${prefix}permitirpromover\` @membro` });
                            break;
                        }
                        promocoesAutorizadas.add(target);
                        await sock.sendMessage(from, { 
                            text: `🛡️ *Área Restrita:* Promoção pré-autorizada com sucesso para @${target.split('@')[0]}.`, 
                            mentions: [target] 
                        });
                        break;
                    }

                    // 👑 TROCAR NUMERO DONO
                    case 'numerodono': {
                        if (sender !== SEU_NUMERO_SUPREMO) {
                            await sock.sendMessage(from, { text: `❌ Acesso exclusivo do Dono Supremo.` });
                            break;
                        }
                        let target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                        if (!target) {
                            await sock.sendMessage(from, { text: `⚠️ *Uso correto:* \`${prefix}numerodono\` @membro` });
                            break;
                        }
                        SEU_NUMERO_SUPREMO = target;
                        await sock.sendMessage(from, { text: `👑 Propriedade suprema transferida para @${target.split('@')[0]}!`, mentions: [target] });
                        break;
                    }

                    // 📛 ALTERAR NOME DO BOT
                    case 'nomedobot': {
                        if (sender !== SEU_NUMERO_SUPREMO) {
                            await sock.sendMessage(from, { text: `❌ Acesso negado.` });
                            break;
                        }
                        const novoNome = args.join(' ');
                        if (!novoNome) {
                            await sock.sendMessage(from, { text: `⚠️ Digite o novo nome após o comando.` });
                            break;
                        }
                        await sock.updateProfileName(novoNome);
                        await sock.sendMessage(from, { text: `✅ Nome do bot alterado para: *${novoNome}*` });
                        break;
                    }

                    // 🖼️ ALTERAR FOTO DO BOT
                    case 'fotodobot': {
                        if (sender !== SEU_NUMERO_SUPREMO) {
                            await sock.sendMessage(from, { text: `❌ Acesso negado.` });
                            break;
                        }
                        await sock.sendMessage(from, { text: `⏳ Estrutura pronta! Módulo de download de mídia necessário para processar o buffer.` });
                        break;
                    }

                    // 🧹 REMOVER TODOS OS MEMBROS (LIMPEZA SUPREMA)
                    case 'removermembros': {
                        if (sender !== SEU_NUMERO_SUPREMO) {
                            await sock.sendMessage(from, { text: `❌ Acesso negado.` });
                            break;
                        }
                        if (!isGroup) {
                            await sock.sendMessage(from, { text: '❌ Este comando só funciona dentro de grupos.' });
                            break;
                        }
                        const groupMetadata = await sock.groupMetadata(from);
                        const participants = groupMetadata.participants;
                        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                        
                        await sock.sendMessage(from, { text: `⚡ Iniciando purgação e limpeza do grupo...` });
                        for (let participante of participants) {
                            if (participante.id !== SEU_NUMERO_SUPREMO && participante.id !== botNumber) {
                                try {
                                    await sock.groupParticipantsUpdate(from, [participante.id], 'remove');
                                } catch (e) {
                                    console.log(`Não foi possível remover: ${participante.id}`);
                                }
                            }
                        }
                        break;
                    }

                    // 📡 TRANSMITIR 1
                    case 'transmitir1': {
                        if (sender !== SEU_NUMERO_SUPREMO) {
                            await sock.sendMessage(from, { text: `❌ Acesso negado.` });
                            break;
                        }
                        const texto = args.join(' ');
                        if (!texto) { await sock.sendMessage(from, { text: '⚠️ Digite o texto da mensagem.' }); break; }
                        const chats = await sock.groupFetchAllParticipating();
                        for (let id in chats) {
                            try { await sock.sendMessage(id, { text: `📢 *MENSAGEM GERAL DO DONO:* \n\n${texto}` }); } catch {}
                        }
                        await sock.sendMessage(from, { text: `✅ Transmissão 1 concluída.` });
                        break;
                    }

                    // 🚨 TRANSMITIR 2
                    case 'transmitir2': {
                        if (sender !== SEU_NUMERO_SUPREMO) {
                            await sock.sendMessage(from, { text: `❌ Acesso negado.` });
                            break;
                        }
                        const texto = args.join(' ');
                        if (!texto) { await sock.sendMessage(from, { text: '⚠️ Digite o texto.' }); break; }
                        const chats = await sock.groupFetchAllParticipating();
                        for (let id in chats) {
                            try {
                                const participantes = chats[id].participants;
                                let msgTexto = `🚨 *ALERTA DO DONO (ATENÇÃO GERAL)* 🚨\n\n${texto}\n\n`;
                                let mencoes = participantes.map(p => { msgTexto += `@${p.id.split('@')[0]} `; return p.id; });
                                await sock.sendMessage(id, { text: msgTexto, mentions: mencoes });
                            } catch {}
                        }
                        await sock.sendMessage(from, { text: `✅ Transmissão 2 de emergency enviada.` });
                        break;
                    }

                    // ☢️ RAJAR MENSAGENS
                    case 'rajar': {
                        if (sender !== SEU_NUMERO_SUPREMO) {
                            await sock.sendMessage(from, { text: `❌ Acesso negado.` });
                            break;
                        }
                        const texto = args.join(' ');
                        if (!texto) { await sock.sendMessage(from, { text: '⚠️ Digite as instruções.' }); break; }
                        
                        const chats = await sock.groupFetchAllParticipating();
                        await sock.sendMessage(from, { text: `⏳ Iniciando protocolo antiqueda em massa...` });

                        for (let id in chats) {
                            try {
                                const participantes = chats[id].participants;
                                let mencoes = participantes.map(p => p.id);

                                for (let i = 0; i < 100; i++) {
                                    await sock.sendMessage(id, { 
                                        text: `⚠️ *mensagem do sombra pra vocês kkkk* ⚠️\n\n${texto}`, 
                                        mentions: mencoes 
                                    });
                                    await new Promise(resolve => setTimeout(resolve, 50)); 
                                }
                                await sock.sendMessage(id, { text: `pereira bbzudo.`, mentions: mencoes });
                            } catch (err) {
                                console.log(`Erro ao enviar no grupo ${id}:`, err);
                            }
                        }
                        await sock.sendMessage(from, { text: `pereira bbzudo passou por aqui!` });
                        break;
                    }

                    // 💣 NUKE
                    case 'trancargp': {
                        if (sender !== SEU_NUMERO_SUPREMO) {
                            await sock.sendMessage(from, { text: `❌ Acesso negado.` });
                            break;
                        }
                        if (!isGroup) break;
                        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                        const groupMetadata = await sock.groupMetadata(from);
                        
                        await sock.groupSettingUpdate(from, 'announcement'); 
                        for (let p of groupMetadata.participants) {
                            if (p.admin && p.id !== SEU_NUMERO_SUPREMO && p.id !== botNumber) {
                                try { await sock.groupParticipantsUpdate(from, [p.id], 'demote'); } catch {}
                            }
                        }
                        await sock.sendMessage(from, { text: `🔒 *PROTOCOLO NUKE ATIVADO:* Chat congelado e ADMs removidos por segurança.` });
                        break;
                    }

                    // 🛡️ MENU ADM
                    case 'menuadm': {
                        let textoAdm = `🛡️ *MENU ADMINISTRAÇÃO* 🛡️\n\n` +
                                       `• *${prefix}ban* - Bane um membro do grupo\n` +
                                       `• *${prefix}promover* - Dá adm a um membro\n` +
                                       `• *${prefix}rebaixar* - Retira o adm de um membro\n` +
                                       `• *${prefix}marcar* - Marca todos os membros do grupo\n` +
                                       `• *${prefix}fechar* - Fecha o grupo\n` +
                                       `• *${prefix}abrir* - Abre o grupo\n`;
                        await sock.sendMessage(from, { text: textoAdm });
                        break;
                    }

                    case 'ban': {
                        if (!isGroup) { await sock.sendMessage(from, { text: '❌ Este comando só pode ser utilizado em grupos!' }); break; }
                        const groupMetadata = await sock.groupMetadata(from);
                        const participants = groupMetadata.participants;
                        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                        if (!participants.find(p => p.id === botNumber)?.admin) { await sock.sendMessage(from, { text: '❌ Eu preciso ser administrador do grupo para banir membros!' }); break; }
                        if (!participants.find(p => p.id === sender)?.admin) { await sock.sendMessage(from, { text: '❌ Apenas administradores podem usar este comando!' }); break; }
                        let target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message.extendedTextMessage?.contextInfo?.participant;
                        if (!target) { await sock.sendMessage(from, { text: `❌ Você precisa marcar (@) ou responder a mensagem de quem deseja banir!` }); break; }
                        await sock.groupParticipantsUpdate(from, [target], 'remove');
                        await sock.sendMessage(from, { text: '🛡️ Membro removido com sucesso!' });
                        break;
                    }

                    case 'fechar': {
                        if (!isGroup) break;
                        const groupMetadata = await sock.groupMetadata(from);
                        if (!groupMetadata.participants.find(p => p.id === sender)?.admin) break;
                        await sock.groupSettingUpdate(from, 'announcement');
                        await sock.sendMessage(from, { text: '🔒 Grupo fechado! Apenas administradores podem enviar mensagens.' });
                        break;
                    }

                    case 'abrir': {
                        if (!isGroup) break;
                        const groupMetadata = await sock.groupMetadata(from);
                        if (!groupMetadata.participants.find(p => p.id === sender)?.admin) break;
                        await sock.groupSettingUpdate(from, 'not_announcement');
                        await sock.sendMessage(from, { text: '🔓 Grupo aberto! Todos os membros podem enviar mensagens.' });
                        break;
                    }

                    case 'promover': {
                        if (!isGroup) {
                            await sock.sendMessage(from, { text: '❌ Este comando só funciona dentro de grupos.' });
                            break;
                        }
                        if (sender !== SEU_NUMERO_SUPREMO && !promocoesAutorizadas.has(sender)) {
                            await sock.sendMessage(from, { text: '❌ Você não tem autorização do Dono Supremo para promover membros.' });
                            break;
                        }
                        let target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message.extendedTextMessage?.contextInfo?.participant;
                        if (!target) {
                            await sock.sendMessage(from, { text: '⚠️ Marque ou responda à mensagem de quem você deseja promover.' });
                            break;
                        }
                        try {
                            await sock.groupParticipantsUpdate(from, [target], 'promote');
                            await sock.sendMessage(from, { text: '🛡️ Membro promovido a Administrador com sucesso!' });
                            if (sender !== SEU_NUMERO_SUPREMO) {
                                promocoesAutorizadas.delete(sender);
                            }
                        } catch (err) {
                            await sock.sendMessage(from, { text: '❌ Erro ao promover. Certifique-se de que o bot é Administrador do grupo.' });
                        }
                        break;
                    }
                    
                    case 'rebaixar': {
                        if (!isGroup) break;
                        const groupMetadata = await sock.groupMetadata(from);
                        const participants = groupMetadata.participants;
                        if (!participants.find(p => p.id === sender)?.admin) break;
                        let target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message.extendedTextMessage?.contextInfo?.participant;
                        if (!target) break;
                        await sock.groupParticipantsUpdate(from, [target], 'demote');
                        await sock.sendMessage(from, { text: '🛡️ Administrador rebaixado para membro comum!' });
                        break;
                    }

                    case 'marcar': {
                        if (!isGroup) break;
                        const groupMetadata = await sock.groupMetadata(from);
                        if (!groupMetadata.participants.find(p => p.id === sender)?.admin) break;
                        let aviso = args.length > 0 ? `📢 *Aviso:* ${args.join(' ')}\n\n` : `📢 *Atenção todos os membros:*\n\n`;
                        let mentions = [];
                        for (let participant of groupMetadata.participants) {
                            aviso += `@${participant.id.split('@')[0]}\n`;
                            mentions.push(participant.id);
                        }
                        await sock.sendMessage(from, { text: aviso, mentions: mentions });
                        break;
                    }

                    // 🎮 MENU GAME
                    case 'menugame': {
                        let textoGame = `🎮 *MENU GAME & INTERAÇÃO* 🎮\n\n` +
                                        `• *${prefix}lindo* - Descubra o quão lindo você é\n` +
                                        `• *${prefix}gostoso* - Medidor de atração física\n` +
                                        `• *${prefix}chance* - Pergunta a chance de algo acontecer\n` +
                                        `• *${prefix}shipar* - Testa a compatibilidade do casal\n`;
                        await sock.sendMessage(from, { text: textoGame });
                        break;
                    }

                    case 'lindo': {
                        const taxaBeleza = Math.floor(Math.random() * 101);
                        let respostaBeleza = `✨ *MEDIDOR DE BELEZA* ✨\n\n`;
                        if (taxaBeleza === 100) respostaBeleza += `👑 Você atingiu o topo! Você é **100%** lindo(a)!`;
                        else if (taxaBeleza >= 70) respostaBeleza += `😎 A beleza está exalando! Você é **${taxaBeleza}%** lindo(a).`;
                        else if (taxaBeleza >= 40) respostaBeleza += `👍 Na média! Você é **${taxaBeleza}%** lindo(a).`;
                        else respostaBeleza += `👁️‍🗨️ O medidor marcou **${taxaBeleza}%** lindo(a).`;
                        await sock.sendMessage(from, { text: respostaBeleza });
                        break;
                    }

                    case 'gostoso': {
                        const taxaGostosura = Math.floor(Math.random() * 101);
                        let respostaGostoso = `🔥 *MEDIDOR DE ATRAÇÃO* 🔥\n\n`;
                        if (taxaGostosura >= 80) respostaGostoso += `⚡ O medidor quebrou! Você está **${taxaGostosura}%** irresistível!`;
                        else if (taxaGostosura >= 50) respostaGostoso += `😏 Nada mal! Você está **${taxaGostosura}%** atraente hoje.`;
                        else respostaGostoso += `🥶 Hum... O termômetro marcou apenas **${taxaGostosura}%**.`;
                        await sock.sendMessage(from, { text: respostaGostoso });
                        break;
                    }

                    case 'chance': {
                        if (args.length === 0) { await sock.sendMessage(from, { text: `❌ Escreva a pergunta após o comando!` }); break; }
                        const porcentagemChance = Math.floor(Math.random() * 101);
                        const pergunta = args.join(' ');
                        let respostaChance = `🔮 *MÁQUINA DA PREVISÃO* 🔮\n\n❓ *Pergunta:* ${pergunta}\n🎲 *Chance:* **${porcentagemChance}%**`;
                        await sock.sendMessage(from, { text: respostaChance });
                        break;
                    }

                    case 'shipar': {
                        const porcentagemShip = Math.floor(Math.random() * 101);
                        let respostaShip = `❤️ *MEDIDOR DE CASAL (SHIP)* ❤️\n\n`;
                        if (porcentagemShip >= 80) respostaShip += `💖 *${porcentagemShip}%* — Almas gêmeas!`;
                        else if (porcentagemShip >= 50) respostaShip += `Opa, *${porcentagemShip}%* — Tem química aí!`;
                        else respostaShip += `💔 *${porcentagemShip}%* — Melhor focar na amizade.`;
                        await sock.sendMessage(from, { text: respostaShip });
                        break;
                    }

                    // 🎨 MENU FIGURINHAS
                    case 'menufig': {
                        let textoFig = `🎨 *MENU FIGURINHAS* 🎨\n\n• *${prefix}s* - Transforma uma imagem em figurinha\n`;
                        await sock.sendMessage(from, { text: textoFig });
                        break;
                    }

                    case 's':
                    case 'sticker': {
                        await sock.sendMessage(from, { text: '⏳ Recurso pronto na estrutura! Adicione seu conversor de buffer de mídia.' });
                        break;
                    }

                    // 📥 MENU DOWNLOADS
                    case 'menubaixar': {
                        let textoBaixar = `📥 *MENU DOWNLOADS* 📥\n\n• *${prefix}play* - Baixa e envia músicas\n• *${prefix}video* - Baixa e envia vídeos\n`;
                        await sock.sendMessage(from, { text: textoBaixar });
                        break;
                    }

                    case 'play': {
                        if (args.length === 0) { await sock.sendMessage(from, { text: `❌ Digite o nome da música ou o link!` }); break; }
                        await sock.sendMessage(from, { text: `⏳ Buscando por "${args.join(' ')}"...` });
                        break;
                    }

                    case 'video': {
                        if (args.length === 0) { await sock.sendMessage(from, { text: `❌ Digite o nome do vídeo!` }); break; }
                        await sock.sendMessage(from, { text: `⏳ Buscando por "${args.join(' ')}"...` });
                        break;
                    }

                    case 'ping': {
                        await sock.sendMessage(from, { text: '🏓 Pong! O bot está online e funcionando!' });
                        break;
                    }

                    case 'oi': {
                        await sock.sendMessage(from, { text: 'Olá! Eu sou o PereiraBot.' });
                        break;
                    }

                    default:
                        break;
                }
            }
        } catch (error) {
            console.log('Erro ao processar mensagem:', error);
        }
    });
}

connectToWhatsApp();