const fs = require('fs');
const config = require('./config.json');
const Argument = require('./lib/argument.js');

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
<<<<<<< HEAD
    setup: {
        script: (msg) => {
            if (!serverConfig[msg.guild.id]) {
                logger.debug('setting up guild for issue tracking!');
                const tmpConfig = {
                    issues: [],
                };
                msg.guild.createChannel('issue-tracker', {
                    type:'category',
                }).then(categoryChannel=>{
                    tmpConfig.parent = categoryChannel.id;

                    msg.guild.createChannel('issue-archive', {
                        type: 'text',
                        topic: 'Backlog of resolved issues. Only Tracky should write here',
                        parent: categoryChannel,
                        permissionOverwrites:[],
                    }).then((chan) => tmpConfig.archive = chan.id).catch(err => { logger.error('at line 51: '+err); });
    
                    msg.guild.createChannel('issue-reporting', {
                        type:'text',
                        topic:`Report issues here using ${config.cmdPrefix}issue`,
                        parent:categoryChannel,
                        permissionOverwrites:[],
                    }).then((chan) => tmpConfig.tracker = chan.id).catch(err => { logger.error('at line 58: '+err); });
                }).catch(err => { logger.error('at line 59: '+err); });
                
                serverConfig[msg.guild.id] = tmpConfig;

            } else {
                msg.reply(`Server has already been setup for issue tracking! use "${config.cmdPrefix}deleteTracker" to reset`);
            }
        },
        description: 'setup the server for issue tracking',
        permission: 'ADMINISTRATOR',
    },
    deleteTracker: {
        script:(msg)=>{
            if (serverConfig.hasOwnProperty(msg.guild.id)) {
                const parent = msg.guild.channels.get(serverConfig[msg.guild.id].parent);
                parent.children.forEach(element => {
                    element.delete();
                });
                parent.delete();

                delete serverConfig[msg.guild.id];
            } else {
                msg.reply(`Server is not setup issue tracking! use "${config.cmdPrefix}setup" to setup`);
            }
        },
        description: 'Reset a server set up for issue tracking',
        permission: 'ADMINISTRATOR',
    }
=======
    issue:{
        script:(msg, args)=>{
            if (!serverConfig.hasOwnProperty(msg.guild.id)) {
                msg.reply('This server has not been setup for issue tracking');
                return;
            }
            if (!serverConfig[msg.guild.id].tracker === msg.channel.id) {
                msg.reply('Issues must be submitted in the correct channel: ' + msg.guild.channels.get(serverConfig[msg.guild.id].tracker));
                return;
            }

            const issue = {
                title: args[0],
                description: args.length > 1 ? args[1] : '',
            };
            msg.guild.createChannel('issue-' + serverConfig[msg.guild.id].issues.length + ' ' + issue.title.toLowerCase().replace(/ /gi, '-'), {
                // Bad injection vulnerability right                                       here ^
                permissionOverwrites: msg.guild.channels.get(serverConfig[msg.guild.id].tracker).permissionOverwrites,
                type: 'text',
                parent: serverConfig[msg.guild.id].parent,
            }).then((chan) => {
                chan.overwritePermissions(msg.user, {}, 'creator of the issue should be able to write to it');
                serverConfig[msg.guild.id].issues.push(chan.id);
                if (issue.description !== '')
                    chan.send(issue.description);
            });
        },
        description:'Start a new issue.',
        args: [
            new Argument('title', true),
            new Argument('description', false),
        ]
    },
>>>>>>> issue
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
    updateServerConfig();
}

function updateServerConfig() {
    fs.writeFileSync('serverconfig.json', JSON.stringify(serverConfig, undefined, 4));
    logger.info('Updated serverconfig.json');
}