const { makeWASocket, useMultiFileAuthState, S_WHATSAPP_NET } = require("@whiskeysockets/baileys");
const pino = require("pino");
const qrcode = require ("qrcode-terminal");

async function conectar() {
    console.log("⨠⨠⨠ iniciando o bot...");
    const {state, saveCreds} = await useMultiFileAuthState("auth_info");

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: "silent"})
    });
}

    console.log("⨠⨠⨠ conexao iniciada, esperando QR...");

        console.log("✅ bot conectado!");
    
        console.log("❌ conexao fechada");
      
    
        const numero = "5591984117073";
        const codigo = "await"
        sock.requestPairingCode(codigo);
        console.log("📱 codigo de pareamento:", codigo);

conectar();
