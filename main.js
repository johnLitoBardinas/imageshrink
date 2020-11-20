const path = require('path');
const os = require('os');

const {
    app,
    BrowserWindow,
    Menu,
    ipcMain,
    shell
} = require('electron');

const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');

const slash = require('slash');

const log = require('electron-log');

// Set Env
process.env.NODE_ENV = 'production';

const isDev = process.env.NODE_ENV !== 'production';

const isMac = process.platform === 'darwin';

let mainWindow;

let aboutWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: isDev ? 800 : 500,
        height: 600,
        title: 'Image Shrink',
        icon: `${__dirname}/assets/icons/Icon_256x256.png`,
        resizable: isDev,
        backgroundColor: 'white',
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
        },
    });

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.loadFile('./app/index.html');
}


function createAboutWindow() {
    aboutWindow = new BrowserWindow({
        width: 300,
        height: 300,
        title: 'About the Image Shrink',
        icon: `${__dirname}/assets/icons/Icon_256x256.png`,
        resizable: false,
        backgroundColor: 'white'
    });

    aboutWindow.loadFile('./app/about.html');
}

app.on('ready', () => {
    createMainWindow();

    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    mainWindow.on('closed', () => mainWindow = null);
});

const menu = [
    ...(isMac ? [{
        label: app.name,
        submenu: [{
            label: 'About',
            click: createAboutWindow,
        }]
    }] : []),
    {
        role: 'fileMenu'
    },
    ...(isDev ? [{
        label: 'Developer',
        submenu: [{
                role: 'reload'
            },
            {
                role: 'forcereload'
            },
            {
                type: 'separator'
            },
            {
                role: 'toggledevtools'
            },
        ]
    }] : [])
];

ipcMain.on('image:minimize', (event, data) => {
    data.dest = path.join(os.homedir(), 'imageshrink');
    shrinkImage(data);
});

async function shrinkImage({
    imgPath,
    quality,
    dest
}) {
    try {

        const pngQuality = quality / 100;


        const files = await imagemin([slash(imgPath)], {
            destination: dest,
            plugins: [
                imageminMozjpeg({
                    quality
                }),
                imageminPngquant({
                    quality: [pngQuality, pngQuality]
                })
            ]
        });

        // console.log(files);
        log.info(files);

        shell.openPath(dest);

        // Send from window to renderer. (eventName, ?data)
        mainWindow.webContents.send('image:done')

    } catch (error) {
        log.error(error);
    }
}

app.on('window-all-closed', () => {
    if (!isMac) {
        app.quit()
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow()
    }
});
