const fs = require('fs');
const config = require('./config.json');
const Argument = require('./lib/argument.js');

const winston = require('winston');
const myFormat = winston.format.printf(({ level, message, timestamp }) => {
    return `[${timestamp}] [${level}]: ${message}`;
});
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        myFormat
    ),
    transports: [
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
    setup: {
        script: (msg) => {
            if (!serverConfig[msg.guild.id]) {
                logger.debug('setting up guild for issue tracking!');
                const tmpConfig = {
                    issues: {},
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
                    }).then((chan) => tmpConfig.archive = chan.id);
    
                    msg.guild.createChannel('issue-reporting', {
                        type:'text',
                        topic:`Report issues here using ${config.cmdPrefix}issue`,
                        parent:categoryChannel,
                        permissionOverwrites:[],
                    }).then((chan) => tmpConfig.tracker = chan.id);
                });
                
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
                msg.reply(`Server has not setup issue tracking! use "${config.cmdPrefix}setup" to setup`);
            }
        },
        description: 'Reset a server set up for issue tracking',
        permission: 'ADMINISTRATOR',
    },
    issue:{
        script:(msg, args)=>{
            if (!serverConfig.hasOwnProperty(msg.guild.id)) {
                msg.reply('This server has not been setup for issue tracking!');
                return;
            }
            if (serverConfig[msg.guild.id].tracker !== msg.channel.id) {
                msg.reply('Issues must be submitted in the correct channel: ' + msg.guild.channels.get(serverConfig[msg.guild.id].tracker));
                return;
            }

            const issue = {
                title: args[0],
                description: args.slice(1).join(' '),
            };
            msg.guild.createChannel('issue-' + serverConfig[msg.guild.id].issues.length + ' ' + issue.title.toLowerCase().replace(/ /gi, '-'), {
                // Bad injection vulnerability right                                       here ^
                permissionOverwrites: msg.guild.channels.get(serverConfig[msg.guild.id].archive).permissionOverwrites,
                type: 'text',
                parent: serverConfig[msg.guild.id].parent,
            }).then((chan) => {
                chan.overwritePermissions(msg.member, {
                    SEND_MESSAGES: true,
                    READ_MESSAGES: true,
                }, 'Creator of the issue should be able to write to it.');
                serverConfig[msg.guild.id].issues.push(chan.id);
                if (issue.description !== '')
                    chan.send(issue.description);
            });
        },
        description:'Start a new issue.',
        args: [
            'title',
        ]
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
    if (msg.author.bot) {
        return false;
    }
    if (msg.content.startsWith(config.cmdPrefix)) {
        logger.debug('Recieved command "' + msg.content + '"');
        const args = msg.content.slice(config.cmdPrefix.length).split(' ');
        const cmd = args.shift().toLowerCase();

        if (!commands.hasOwnProperty(cmd)) {
            const sent = await msg.reply('Unknown command!');
            sent.delete(5000);
            msg.delete(5000);
            return false;
        }
        if (!(commands[cmd].hasOwnProperty('permission') && msg.member.hasPermission(commands[cmd].permission))) {
            const sent = await msg.reply('Permission denied!');
            sent.delete(5000);
            msg.delete(5000);
            return false;
        }
        if (commands[cmd].hasOwnProperty('args')) {
            //TODO: Argument logic to support non-required arguments, types and rest arguments
        }
        commands[cmd].script(msg, args);
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
