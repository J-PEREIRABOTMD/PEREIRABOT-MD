import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('sessao_bot');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: ['Mac OS', 'Chrome', '101.0.4951.64']
    });

    // 1. MONITOR DE CONEXÃO (Onde gera o QR Code)
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
            console.log('🤖 Aguardando comandos no WhatsApp...');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // 2. MONITOR DE MENSAGENS (Aqui acontecem os comandos!)
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return; // Ignora mensagens vazias ou enviadas pelo próprio bot

        // Pega o texto da mensagem recebida
        const conversation = msg.message.conversation || msg.message.extendedTextMessage?.text;
        const from = msg.key.remoteJid; // Quem enviou a mensagem

        if (conversation) {
            console.log(`💬 Mensagem recebida de ${from}: ${conversation}`);

            // COMANDO 1: !ping
            if (conversation.toLowerCase() === '!ping') {
                await sock.sendMessage(from, { text: '🏓 Pong! O bot está online e funcionando!' });
            }
            
            // COMANDO 2: !oi
            if (conversation.toLowerCase() === '!oi') {
                await sock.sendMessage(from, { text: 'Olá! Eu sou o PereiraBot. Como posso te ajudar hoje?' });
            }
        }
    });
}

connectToWhatsApp();