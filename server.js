const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const ping = require('ping');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? false : "*",
        methods: ["GET", "POST"]
    }
});

// Rate limiting para login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 intentos por IP
    message: { success: false, message: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware
app.use(cors({
    origin: 'http://localhost:3000', // Cambia esto si tu frontend está en otro puerto
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de sesión segura
const sessionInstance = session({
    secret: process.env.SESSION_SECRET || 'servermon_super_secret_key_2024',
    resave: false,
    saveUninitialized: false,
    name: 'sessionId',
    cookie: {
        secure: process.env.NODE_ENV === 'production' ? true : false, // solo true en producción (HTTPS)
        httpOnly: true, // prevenir XSS
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
        sameSite: 'strict' // CSRF protection
    }
});
app.use(sessionInstance);

// Integrar sesión de Express con Socket.IO
const sharedSession = require('express-socket.io-session');
io.use(sharedSession(sessionInstance, {
    autoSave: true
}));

// Hash de contraseñas (en producción usar base de datos)
const users = {
    'ejemplo': '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // hasheada
};


bcrypt.hash('ejemplo', 10, (err, hash) => {
    if (!err) {
        users.informatica = hash;
    }
});

// Configuración de servidores
const servidores = {
    "Servidor de Ejemplo": "192.168.0.1",
    "Servidor de Ejemplo": "192.168.0.2",
    "Servidor de Ejemplo": "192.168.0.3",
    "Servidor de Ejemplo": "192.168.0.4",
    "Servidor de Ejemplo": "192.168.0.5",
    "Servidor de Ejemplo": "192.168.0.5",
};

let serverStates = {};
let monitoringActive = false;

// Activar monitoreo automático al iniciar el servidor
async function startMonitoring() {
    if (!monitoringActive) {
        console.log('[SYSTEM] Monitoreo automático iniciado');
        monitoringActive = true;
        await checkAllServers();
        setInterval(() => {
            if (monitoringActive) {
                checkAllServers();
            }
        }, 30000);
    }
}

startMonitoring();

// Función para hacer ping real
async function pingServer(host) {
    try {
        const result = await ping.promise.probe(host, {
            timeout: 3
        });

        return {
            online: result.alive,
            latency: result.alive ? Math.round(result.time) : null,
            timestamp: Date.now(),
            host: host
        };
    } catch (error) {
        return {
            online: false,
            latency: null,
            timestamp: Date.now(),
            host: host,
            error: error.message
        };
    }
}

// Función para verificar todos los servidores
async function checkAllServers() {
    const results = {};
    const promises = [];

    for (const [name, ip] of Object.entries(servidores)) {
        promises.push(
            pingServer(ip).then(result => {
                results[name] = { ...result, ip };

                // Detectar cambios de estado
                const previousState = serverStates[name];
                if (previousState && previousState.online !== result.online) {
                    const event = {
                        server: name,
                        ip: ip,
                        status: result.online ? 'recovered' : 'down',
                        timestamp: Date.now(),
                        message: result.online ? 'Servidor recuperado' : 'Servidor desconectado'
                    };

                    // Emitir evento de cambio de estado solo a usuarios autenticados
                    io.emit('server-state-change', event);
                }
            })
        );
    }

    await Promise.all(promises);
    serverStates = results;

    // Emitir resultados solo a usuarios autenticados
    io.emit('servers-update', {
        servers: results,
        timestamp: Date.now()
    });

    return results;
}

// Middleware de autenticación robusto
function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated && req.session.userId) {
        // Renovar la sesión en cada request válido
        req.session.touch();
        return next();
    } else {
        return res.status(401).json({ success: false, message: 'Acceso no autorizado' });
    }
}

// Middleware para Socket.IO authentication
function authenticateSocket(socket, next) {
    const session = socket.handshake.session;
    if (session && session.authenticated && session.userId) {
        return next();
    }
    return next(new Error('Authentication error'));
}

// Ruta de login con seguridad mejorada
app.post('/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validar entrada
        if (!username || !password ||
            typeof username !== 'string' || typeof password !== 'string' ||
            username.length > 50 || password.length > 100) {
            return res.status(400).json({
                success: false,
                message: 'Datos de entrada inválidos'
            });
        }

        // Verificar usuario
        if (!users[username]) {
            // Simular tiempo de verificación para evitar timing attacks
            await new Promise(resolve => setTimeout(resolve, 200));
            return res.status(401).json({
                success: false,
                message: 'Credenciales incorrectas'
            });
        }

        // Verificar contraseña
        const isValidPassword = await bcrypt.compare(password, users[username]);

        if (isValidPassword) {
            // Regenerar ID de sesión para prevenir session fixation
            req.session.regenerate((err) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: 'Error del servidor'
                    });
                }

                req.session.authenticated = true;
                req.session.userId = username;
                req.session.loginTime = Date.now();

                res.json({
                    success: true,
                    user: username,
                    loginTime: req.session.loginTime
                });
            });
        } else {
            return res.status(401).json({
                success: false,
                message: 'Credenciales incorrectas'
            });
        }

    } catch (error) {
        console.error('[AUTH ERROR]', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Ruta de logout
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error al cerrar sesión'
            });
        }
        res.clearCookie('sessionId');
        res.json({ success: true });
    });
});

// Verificar sesión
app.get('/auth/check', (req, res) => {
    if (req.session && req.session.authenticated) {
        res.json({
            success: true,
            authenticated: true,
            user: req.session.userId,
            loginTime: req.session.loginTime
        });
    } else {
        res.json({
            success: false,
            authenticated: false
        });
    }
});

// Proteger todas las rutas de API
app.use('/api', requireAuth);

// API Routes protegidas
app.get('/api/servers', async (req, res) => {
    try {
        const results = await checkAllServers();
        res.json({
            success: true,
            servers: results,
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

app.post('/api/ping/:serverName', async (req, res) => {
    try {
        const serverName = req.params.serverName;
        const ip = servidores[serverName];

        if (!ip) {
            return res.status(404).json({
                success: false,
                error: 'Servidor no encontrado'
            });
        }

        const result = await pingServer(ip);
        res.json({
            success: true,
            server: serverName,
            ip: ip,
            result: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Socket.IO con autenticación
io.on('connection', (socket) => {
    // Verificar autenticación del socket
    const session = socket.handshake.session;
    if (!session || !session.authenticated || !session.userId) {
        socket.disconnect(true);
        return;
    }

    console.log(`[SOCKET] Usuario autenticado conectado: ${session.userId}`);

    // Enviar estado actual al cliente recién conectado
    socket.emit('servers-update', {
        servers: serverStates,
        timestamp: Date.now()
    });

    socket.on('manual-check', async () => {
        console.log(`[MANUAL CHECK] Solicitado por: ${session.userId}`);
        await checkAllServers();
    });

    socket.on('disconnect', () => {
        console.log(`[SOCKET] Usuario desconectado: ${session.userId}`);
    });
});

// Servir el archivo HTML principal solo con autenticación
app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta de login (única ruta pública)
app.get('/login', (req, res) => {
    if (req.session && req.session.authenticated) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Redirigir todas las rutas no autenticadas al login
app.get('*', (req, res) => {
    res.redirect('/login');
});

// Iniciar servidor
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`[SERVER] Ejecutándose en http://localhost:${PORT}`);
    console.log(`[MONITOR] Monitoreando ${Object.keys(servidores).length} servidores`);
    console.log('[SECURITY] Sistema de autenticación activado');
});
