const menu = require("./comandos/menu");
const ping = require("./comandos/ping");
const criador = require("./comandos/criador");
const info = require("./comandos/info");
const ajuda = require("./comandos/ajuda");
const regras = require("./comandos/regras");
const config = require("./config");

const comando = config.prefixo + "menu";

if (comando === config.prefixo + "menu") {
    menu();
}

if (comando === config.prefixo + "ping") {
    ping();
}
 
if (comando === config.prefixo + "criador") {
    criador();
}

if (comando === config.prefixo + "info") {
    info();
}


if (comando === config.prefixo + "ajuda") {
    ajuda();
}

if (comando === config.prefixo + "regras") {
    regras();
}

console.log(config.nome);
console.log(config.versao);
console.log(config.prefixo);
console.log(config.dono);