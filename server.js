const fs = require('fs');

const config = require('./config.json');

const winston = require('winston');
const myFormat = winston.format.printf(({ level, message, label, timestamp }) => {
    return `[${timestamp}] [${level}]: ${message}`;
});
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        myFormat
    ),
    transports: [
        //
        // - Write to all logs with level `info` and below to `info.log` and console 
        // - Write all logs error (and below) to `error.log`.
        //
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'info.log' }),
        new winston.transports.Console(),
    ]
});

if (!fs.existsSync('serverconfig.json')) {
    fs.writeFileSync('serverconfig.json', '{}');
}
const serverConfig = require('./serverconfig.json');
const commands = {
    ping:{
        script:(msg)=>msg.reply('pong'),
        description:'test server connection',
    },
};

const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
    logger.info(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    handleCommand(msg);
});

client.login(config.token);

process.on('SIGTERM', quit);
process.on('SIGINT', quit);

async function quit() {
    logger.info('Quit signal received.');
    await client.destroy();
    logger.info('Client destruction successful');
    updateFiles();
    logger.end();
}

async function handleCommand(msg) {
    if (msg.content.startsWith(config.cmdPrefix) && msg.content !==  config.cmdPrefix) {
        logger.debug('Recieved command "' + msg.content + '"');
        const args = msg.content.substring(config.cmdPrefix.length).split(' ');
        const cmd = args.splice(0, 1)[0];

        if (commands.hasOwnProperty(cmd)) {
            commands[cmd].script(msg, args);
        } else {
            const sent = await msg.reply('Unknown command!');
            sent.delete(5000);
        }
        return true;
    }

    return false;
}

function updateFiles() {
    fs.writeFileSync('serverconfig.json', JSON.stringify(serverConfig, undefined, 4));
    logger.info('Updated serverconfig.json');
}